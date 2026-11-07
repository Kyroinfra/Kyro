package main

// main.go — the runner. Read top to bottom, it's the whole experiment:
//
//   1. (optional) put the corpus into Kyro and wait until it's searchable
//   2. for every question: ask /search, find the rank of the right chunk
//   3. turn the list of ranks into numbers: recall@k, MRR, latency
//   4. print them, list the misses, and save a JSON file of the run

import (
	"bufio"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// ── The question file ───────────────────────────────────────────────────────
// One JSON object per line (questions.jsonl):
//
//	{"id":"q1","type":"keyword","question":"...","file":"a.pdf","evidence":"exact phrase"}
//
// "evidence" is a short phrase copied from the document that contains the
// answer. It is our ground truth.
type Question struct {
	ID           string `json:"id"`
	Question     string `json:"question"`
	Type         string `json:"type"` // keyword | paraphrase | factoid | ...
	File         string `json:"file"`
	Evidence     string `json:"evidence"`
	Unanswerable bool   `json:"unanswerable"` // no right answer exists in the corpus
}

func loadQuestions(path string) ([]Question, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	var qs []Question
	sc := bufio.NewScanner(f)
	sc.Buffer(make([]byte, 1<<20), 1<<20)
	for n := 1; sc.Scan(); n++ {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "//") {
			continue
		}
		var q Question
		if err := json.Unmarshal([]byte(line), &q); err != nil {
			return nil, fmt.Errorf("%s line %d: %w", path, n, err)
		}
		if !q.Unanswerable && (q.File == "" || q.Evidence == "") {
			return nil, fmt.Errorf("%s line %d (%s): needs both \"file\" and \"evidence\"", path, n, q.ID)
		}
		qs = append(qs, q)
	}
	return qs, sc.Err()
}

// ── Step 1: ingest ──────────────────────────────────────────────────────────

func ingestCorpus(c *Client, dir string) error {
	existing, err := c.ListFiles()
	if err != nil {
		return err
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return err
	}
	for _, e := range entries {
		name := e.Name()
		if _, ok := mimeFor(name); e.IsDir() || !ok {
			continue // skip READMEs and anything Kyro can't read
		}
		id, have := existing[name]
		if have {
			fmt.Printf("  %-40s already uploaded\n", name)
		} else {
			if id, err = c.Upload(filepath.Join(dir, name)); err != nil {
				return err
			}
			fmt.Printf("  %-40s uploaded, waiting...\n", name)
		}
		if err := c.WaitReady(id, 10*time.Minute); err != nil {
			return fmt.Errorf("%s: %w", name, err)
		}
	}
	return nil
}

// ── Step 2 + 3: run and score ───────────────────────────────────────────────

type Scored struct {
	Q       Question
	Rank    int // 0 = miss
	Latency time.Duration
}

type Summary struct {
	N         int     `json:"n"`
	Recall1   float64 `json:"recall_at_1"`
	RecallK   float64 `json:"recall_at_k"`
	MRR       float64 `json:"mrr"`
	P50Millis int64   `json:"p50_ms"`
	P95Millis int64   `json:"p95_ms"`
}

func summarize(rows []Scored, k int) Summary {
	ranks := make([]int, len(rows))
	lats := make([]time.Duration, len(rows))
	for i, r := range rows {
		ranks[i] = r.Rank
		lats[i] = r.Latency
	}
	return Summary{
		N:         len(rows),
		Recall1:   recallAtK(ranks, 1),
		RecallK:   recallAtK(ranks, k),
		MRR:       mrr(ranks),
		P50Millis: percentile(lats, 0.50).Milliseconds(),
		P95Millis: percentile(lats, 0.95).Milliseconds(),
	}
}

func printSummary(name string, s Summary, k int) {
	fmt.Printf("  %-12s n=%-3d recall@1=%.2f  recall@%d=%.2f  mrr=%.3f  p50=%dms  p95=%dms\n",
		name, s.N, s.Recall1, k, s.RecallK, s.MRR, s.P50Millis, s.P95Millis)
}

func gitCommit() string {
	out, err := exec.Command("git", "rev-parse", "--short", "HEAD").Output()
	if err != nil {
		return "unknown"
	}
	return strings.TrimSpace(string(out))
}

func main() {
	// .env in the working directory fills gaps only: a real environment
	// variable, or an explicit -key/-url flag below, always wins over the file.
	if err := loadDotenv(".env"); err != nil {
		fatal("load .env: %v", err)
	}

	var (
		baseURL   = flag.String("url", "", "Kyro base URL (default: KYRO_URL, or http://localhost)")
		apiKey    = flag.String("key", "", "Kyro API key, read+write (default: KYRO_KEY)")
		corpus    = flag.String("corpus", "corpus", "folder with the documents")
		questions = flag.String("questions", "questions.jsonl", "question file")
		mode      = flag.String("mode", "", "search mode: vector | text | hybrid (empty = server default)")
		label     = flag.String("label", "", "name for this run, e.g. baseline (default: the mode)")
		k         = flag.Int("k", 5, "the k in recall@k")
		limit     = flag.Int("limit", 10, "how many results to request per search")
		ingest    = flag.Bool("ingest", false, "upload the corpus first and wait until ready")
		outDir    = flag.String("out", "results", "folder for result JSON files")
	)
	flag.Parse()

	// The environment (including .env) backs the empty flag defaults. This is
	// resolved after Parse rather than as a flag default so `-h` never prints
	// the API key.
	if *baseURL == "" {
		*baseURL = envOr("KYRO_URL", "http://localhost")
	}
	if *apiKey == "" {
		*apiKey = os.Getenv("KYRO_KEY")
	}
	if *apiKey == "" {
		fatal("set KYRO_KEY (in .env, the environment, or -key): create one in the dashboard with read+write scopes")
	}
	if *label == "" {
		*label = *mode
		if *label == "" {
			*label = "default"
		}
	}
	c := NewClient(*baseURL, *apiKey)

	if *ingest {
		fmt.Println("ingesting corpus...")
		if err := ingestCorpus(c, *corpus); err != nil {
			fatal("ingest: %v", err)
		}
	}

	qs, err := loadQuestions(*questions)
	if err != nil {
		fatal("%v", err)
	}

	// Warm-up: the first query makes Ollama load the embedding model into
	// memory, which can take seconds. We don't want that one-off cost to
	// pollute p95, so we do a throwaway query first and ignore it.
	_, _, _ = c.Search("warm up", *mode, 1)

	var rows []Scored
	skipped := 0
	fmt.Printf("running %d questions (mode=%q)...\n", len(qs), *mode)
	for _, q := range qs {
		if q.Unanswerable {
			skipped++ // retrieval metrics need a right answer; see README
			continue
		}
		results, took, err := c.Search(q.Question, *mode, *limit)
		if err != nil {
			fatal("search for %s: %v", q.ID, err)
		}
		rows = append(rows, Scored{Q: q, Rank: rankOf(results, q.File, q.Evidence), Latency: took})
	}
	if len(rows) == 0 {
		fatal("no answerable questions to score")
	}

	// ── Step 4: report ──────────────────────────────────────────────────────
	fmt.Printf("\nrun %q on commit %s\n", *label, gitCommit())
	overall := summarize(rows, *k)
	printSummary("ALL", overall, *k)

	// The overall number hides the interesting stuff. Split by question type:
	// e.g. if "keyword" is great but "paraphrase" is bad, one arm is carrying
	// the other.
	byType := map[string][]Scored{}
	for _, r := range rows {
		byType[r.Q.Type] = append(byType[r.Q.Type], r)
	}
	var types []string
	for t := range byType {
		types = append(types, t)
	}
	sort.Strings(types)
	for _, t := range types {
		name := t
		if name == "" {
			name = "(untyped)"
		}
		printSummary(name, summarize(byType[t], *k), *k)
	}

	// The misses are the most useful output: read each one and ask "why didn't
	// it find this?" That question is where the improvements come from.
	var misses []string
	for _, r := range rows {
		if r.Rank == 0 {
			misses = append(misses, r.Q.ID)
			fmt.Printf("  MISS %s [%s] %s\n", r.Q.ID, r.Q.Type, r.Q.Question)
		}
	}
	if skipped > 0 {
		fmt.Printf("  (%d unanswerable questions skipped; not scored for retrieval)\n", skipped)
	}

	// Save everything so runs can be compared later.
	saved := struct {
		Label   string   `json:"label"`
		Mode    string   `json:"mode"`
		Commit  string   `json:"commit"`
		Time    string   `json:"time"`
		K       int      `json:"k"`
		Overall Summary  `json:"overall"`
		Misses  []string `json:"misses"`
	}{*label, *mode, gitCommit(), time.Now().Format(time.RFC3339), *k, overall, misses}

	if err := os.MkdirAll(*outDir, 0o755); err != nil {
		fatal("%v", err)
	}
	file := filepath.Join(*outDir, fmt.Sprintf("%s-%s.json", time.Now().Format("20060102-150405"), *label))
	data, _ := json.MarshalIndent(saved, "", "  ")
	if err := os.WriteFile(file, data, 0o644); err != nil {
		fatal("%v", err)
	}
	fmt.Printf("\nsaved %s\n", file)
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func fatal(format string, args ...any) {
	fmt.Fprintf(os.Stderr, "error: "+format+"\n", args...)
	os.Exit(1)
}
