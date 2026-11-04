package main

// metrics.go — the scoring. No network, no files, just small pure functions.
//
// The whole idea of an eval fits in three sentences:
//   1. We have questions where WE know which passage contains the answer.
//   2. We ask the system, and look at the ranked list of chunks it returns.
//   3. We check where (and whether) the right passage showed up in that list.
//
// Everything below is just step 3, made precise.

import (
	"math"
	"sort"
	"strings"
	"time"
)

// Chunk is one search result. It's only the fields we need from /search.
type Chunk struct {
	FileName   string `json:"fileName"`
	ChunkIndex int    `json:"chunkIndex"`
	Content    string `json:"content"`
}

// normalize makes two strings comparable by throwing away differences that
// don't matter: capital letters, and any run of spaces/tabs/newlines.
//
// Why: a PDF line break in the middle of a sentence ("thirty\n(30) days")
// must still match the phrase "thirty (30) days" that we typed as the label.
func normalize(s string) string {
	return strings.Join(strings.Fields(strings.ToLower(s)), " ")
}

// isHit answers: "is THIS chunk the right one?"
// Right = it comes from the right file AND it contains our evidence phrase.
//
// Notice we never say "chunk number 7". Chunk numbers change whenever you
// change the chunk size. A phrase inside a file survives any chunking.
func isHit(c Chunk, file, evidence string) bool {
	return c.FileName == file &&
		strings.Contains(normalize(c.Content), normalize(evidence))
}

// rankOf walks down the results top to bottom and returns the position
// (1 = first) of the first right chunk. Returns 0 if none of them is right.
//
//	results: [wrong, wrong, RIGHT, wrong]  ->  rank 3
//	results: [wrong, wrong, wrong]         ->  rank 0  (a miss)
func rankOf(results []Chunk, file, evidence string) int {
	for i, c := range results {
		if isHit(c, file, evidence) {
			return i + 1
		}
	}
	return 0
}

// recallAtK = "in what fraction of questions was the right chunk in the top k?"
//
//	ranks = [1, 3, 0, 6], k = 5
//	-> questions 1 and 2 are in the top 5; question 3 is a miss; question 4
//	   is at rank 6 (too low). 2 out of 4 = 0.5
//
// Why top-k: /ask only hands the model a handful of chunks. If the right one
// isn't in that handful, the model never sees it and can't answer from it.
func recallAtK(ranks []int, k int) float64 {
	if len(ranks) == 0 {
		return 0
	}
	found := 0
	for _, r := range ranks {
		if r >= 1 && r <= k {
			found++
		}
	}
	return float64(found) / float64(len(ranks))
}

// mrr = Mean Reciprocal Rank = "how close to the top was the right chunk?"
// For each question: score = 1/rank (rank 1 -> 1.0, rank 2 -> 0.5,
// rank 4 -> 0.25, a miss -> 0). Then average over all questions.
//
//	ranks = [1, 2, 0, 4]  ->  (1 + 0.5 + 0 + 0.25) / 4 = 0.4375
//
// recall@k only says "found it or not". MRR also rewards putting it first.
func mrr(ranks []int) float64 {
	if len(ranks) == 0 {
		return 0
	}
	sum := 0.0
	for _, r := range ranks {
		if r >= 1 {
			sum += 1.0 / float64(r)
		}
	}
	return sum / float64(len(ranks))
}

// percentile returns the "p-th percentile" of durations, p between 0 and 1.
// p95 means: 95% of requests were faster than this. It shows the slow ones
// that users actually notice, which an average would hide.
//
// Method ("nearest rank"): sort ascending, take the value at position
// ceil(p * n). Simple and easy to check by hand.
//
//	[10,20,30,40], p=0.5 -> ceil(0.5*4)=2 -> the 2nd value -> 20
func percentile(ds []time.Duration, p float64) time.Duration {
	if len(ds) == 0 {
		return 0
	}
	sorted := append([]time.Duration(nil), ds...) // copy; don't reorder the caller's slice
	sort.Slice(sorted, func(i, j int) bool { return sorted[i] < sorted[j] })
	pos := int(math.Ceil(p * float64(len(sorted))))
	if pos < 1 {
		pos = 1
	}
	if pos > len(sorted) {
		pos = len(sorted)
	}
	return sorted[pos-1]
}
