# Kyro eval

A small Go program that measures how good Kyro's search is. It uses only the Go standard library and talks to Kyro over HTTP, the same way a user would. It imports nothing from the Kyro codebase.

## The idea, from scratch

Suppose you want to know whether your search works. You can't tell by looking at a few results. You need a **test with known answers**:

1. Take a document. Write a question whose answer you can point to: *"How long does the vendor have to fix a breach?"* The answer lives in the sentence "...within thirty (30) days of written notice."
2. Ask Kyro's `/search` the question. It returns a **ranked list of chunks** (best first).
3. Look down the list. Is a chunk containing that sentence in there? How high?

Do that for 60 questions, count, and you have numbers. Change something in Kyro (chunk size, embedding model, a fix), run again, and compare the numbers. That's the whole thing. Everything else is bookkeeping.

## The numbers

Say you asked 4 questions, and the right chunk appeared at these positions in the results (0 means it never appeared):

```
ranks = [1, 3, 0, 6]
```

- **recall@5**: in what fraction of questions was the right chunk in the top 5? Questions 1 and 2 → 2 out of 4 = **0.50**. (Only the top few chunks go to the LLM in `/ask`, so a right chunk at position 6 is as good as missing.)
- **MRR**: score each question as 1/rank (1, 0.5, 0, 0.17), then average → **0.42**. Same idea as recall, but it rewards putting the right chunk first.
- **p95 latency**: sort all the request times; 95% were faster than this one. It shows the slow queries users feel, which an average hides.

These are the functions in `metrics.go`, and `metrics_test.go` checks them against exactly these hand-computed examples.

## How a question is "right"

Each question stores a **file name** and a short **evidence phrase** copied from the document. A returned chunk counts as right if it's from that file and contains that phrase (ignoring capitals and whitespace).

Why not store "chunk number 7"? Because chunk numbers change whenever you change the chunk size, and chunk size is one of the things you want to experiment with. A phrase in a file survives any chunking.

## Files

| File | What it does |
|---|---|
| `metrics.go` | The scoring: normalize text, find the rank, recall@k, MRR, percentile. Pure functions. |
| `metrics_test.go` | Tests for those, on cases you can check by hand. |
| `client.go` | Talks to Kyro: upload a file, wait until it's `ready`, search. Retries politely when rate limited. |
| `client_test.go` | Tests the client against a fake Kyro server. |
| `main.go` | The runner: load questions, run them, print the table, save a JSON. |
| `env.go` | Loads `.env` (fill-gaps-only) so `go run .` needs no exports. |
| `questions.example.jsonl` | The question file format. |

## Run it

```bash
cd eval
go test ./...                      # check the scoring code first

# 1. put 5-10 public docs (.pdf .docx .txt) in eval/corpus/
# 2. copy questions.example.jsonl to questions.jsonl and write your own
# 3. create an API key (read + write) in the Kyro dashboard

# 4. put your settings in eval/.env (gitignored), one KEY=VALUE per line:
#      KYRO_KEY=kyro_live_...
#      KYRO_URL=http://localhost:3000     # dev; use http://localhost in prod

go run . -ingest -label baseline        # uploads the corpus, waits, then scores
go run . -label baseline-again          # later runs skip the upload
```

The runner loads `.env` from the working directory at startup and sets only the variables the environment doesn't already have — a real `export KYRO_KEY=...` or an explicit `-key`/`-url` flag always wins over the file.

You'll get something like:

```
run "baseline" on commit a1b2c3d
  ALL          n=20  recall@1=0.55  recall@5=0.80  mrr=0.652  p50=180ms  p95=410ms
  keyword      n=5   recall@1=0.80  ...
  paraphrase   n=6   recall@1=0.33  ...
  MISS q07 [paraphrase] How long do I have to fix a problem...
```

Read the **MISS lines**. Each one is a question the system failed. Open the document and ask why. The reason is usually where your next improvement comes from.

## Writing good questions

- Copy the evidence phrase from what Kyro **extracted** (`GET /files/:id/text`), not from your PDF viewer. They sometimes differ in spacing and hyphenation.
- Keep evidence short, under about 100 characters. Chunks overlap and split text, and a long phrase can end up straddling two chunks.
- Make some questions use the document's own words (`keyword`) and some use completely different words (`paraphrase`). The first tests the full-text arm, the second the vector arm.
- If a language model writes your questions from a chunk, it copies that chunk's wording, which flatters keyword search. Write the paraphrase ones yourself.
- `"unanswerable": true` questions (answer isn't in the corpus) are skipped for now. They need a different test, checking whether `/ask` says "I don't know". That comes later.

## One change needed in Kyro: the `mode` switch

To fill the "Vector only / Full-text only / Hybrid" rows, `/search` needs to accept `?mode=vector|text|hybrid`. The harness already sends it, but the server ignores it today.

The smallest way to do it: in `rag/retrieve.ts`, read `mode` and, inside the SQL, add `AND FALSE` to the `WHERE` of the arm you want off (the `vector_ranked` CTE for `mode=text`, the `text_ranked` CTE for `mode=vector`). The fused result then equals the remaining arm's own ranking. Pass `mode` from `routes/search.ts` into `hybridSearch`, and validate it with zod so only those three values are accepted.

For the rerank row, run the harness twice: once with `RERANK_ENABLED=false` and once with `true`. That setting is server-wide, so restart the API between runs.

## Things to know

- **Rate limit.** Kyro allows 100 requests per minute per key. The client waits and retries on `429`, and doesn't count the waiting in latency. A 60-question run takes a minute or two.
- **Latency** here is the full round trip as a client sees it, including embedding the query.
- **Warm-up.** One throwaway query runs first so loading the model into memory doesn't distort p95.
- **Same data each time.** To compare two runs fairly, change one thing between them and keep the corpus and questions identical.
- **Embedding model changes** change the vector dimension, so they need a fresh database. Don't mix them in one eval.
