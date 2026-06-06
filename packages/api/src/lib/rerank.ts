// lib/rerank.ts
// ─────────────────────────────────────────────────────────────────────────────
// Cross-encoder reranking using a locally hosted model via Ollama.
//
// A cross-encoder sees the query and a candidate chunk *together* in a single
// forward pass, so it can model their interaction directly — unlike a
// bi-encoder (used for initial retrieval) which embeds them separately and
// compares in latent space.
//
// How it works:
//   1. Caller passes the query + a list of candidate chunks (already retrieved
//      by the BM25+vector hybrid stage).
//   2. For each candidate we prompt the model: "On a scale of 0–10, how
//      relevant is the following passage to the query?" and parse its numeric
//      answer.
//   3. Candidates are sorted by that score descending and returned.
//
// Model recommendation:
//   Any instruction-following model served by Ollama works. Smaller is faster:
//     - llama3.2:3b  — good balance of speed and accuracy
//     - mistral:7b   — better accuracy, slower
//   Set RERANK_MODEL in your environment to override the default.
//
// Latency note:
//   Each candidate requires one Ollama call. For RERANK_CANDIDATE_LIMIT=50 on
//   a GPU-backed Ollama this is ~2–5 s. On CPU expect 10–30 s. Callers should
//   use a reasonable RERANK_CANDIDATE_LIMIT (default: 50) and only call this
//   after the fast hybrid stage has already narrowed the field.
// ─────────────────────────────────────────────────────────────────────────────

const OLLAMA_URL    = process.env.OLLAMA_URL    ?? 'http://localhost:11434';
const RERANK_MODEL  = process.env.RERANK_MODEL  ?? 'llama3.2';

// How many characters of a chunk to send to the cross-encoder.
// Longer = more accurate but slower. 512 chars (~128 tokens) is a good default.
const RERANK_CONTEXT_CHARS = 512;

export interface RerankCandidate {
  // Opaque ID — anything that lets the caller identify this candidate back.
  // Typically file_id + chunk_index joined, or any string key.
  id:         string;
  content:    string;
  // Any extra fields on the candidate are passed through untouched.
  [key: string]: unknown;
}

export interface RerankResult<T extends RerankCandidate> {
  candidate:   T;
  rerankScore: number;  // 0–10 as returned by the model, normalised to 0–1
}

// ── Internal: score one candidate ────────────────────────────────────────────

async function scoreOne(query: string, content: string): Promise<number> {
  // Truncate to avoid blowing the context window of smaller models.
  const snippet = content.length > RERANK_CONTEXT_CHARS
    ? content.slice(0, RERANK_CONTEXT_CHARS) + '…'
    : content;

  const prompt = [
    'You are a relevance scoring assistant.',
    'Score how relevant the following passage is to answering the query.',
    'Reply with a single integer between 0 (completely irrelevant) and 10 (perfectly relevant).',
    'Do not explain your reasoning. Output the number only.',
    '',
    `Query: ${query}`,
    '',
    `Passage: ${snippet}`,
  ].join('\n');

  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      model:  RERANK_MODEL,
      prompt,
      stream: false,
      options: {
        temperature: 0,      // deterministic scoring
        num_predict: 4,      // we only need 1–2 digits
        stop: ['\n', ' '],   // stop after the first token
      },
    }),
  }).catch(err => {
    throw new Error(`Ollama rerank fetch failed: ${err.cause?.message ?? err.message}`);
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Ollama rerank error (${res.status}): ${body}`);
  }

  const data = await res.json() as { response: string };
  const raw  = data.response.trim();

  // Parse the first integer we find in the response. If the model ignores the
  // stop tokens and outputs extra text, this is still robust.
  const match = raw.match(/\d+/);
  if (!match) {
    // Model returned something unparseable — treat as low relevance rather
    // than crashing. Callers can see rerankScore=0 and filter if needed.
    console.warn(`Rerank: unparseable response "${raw}" for query "${query.slice(0, 60)}"`);
    return 0;
  }

  // Clamp to [0, 10] in case the model ignores the range, then normalise.
  const clamped = Math.max(0, Math.min(10, parseInt(match[0], 10)));
  return clamped / 10;
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface RerankOptions {
  // If true, errors on individual candidates are logged but do not abort the
  // whole rerank — the failing candidate gets score 0 instead.
  // Default: true (partial failure is better than a total outage).
  tolerateErrors?: boolean;
}

/**
 * Reranks `candidates` by relevance to `query` using a cross-encoder prompt.
 * Returns candidates sorted best-first with an added `rerankScore` field.
 *
 * @param query       The user's original search query.
 * @param candidates  Up to ~50 candidates from the hybrid retrieval stage.
 * @param opts        Optional behaviour flags.
 */
export async function rerank<T extends RerankCandidate>(
  query:      string,
  candidates: T[],
  opts:       RerankOptions = {},
): Promise<RerankResult<T>[]> {
  const { tolerateErrors = true } = opts;

  if (candidates.length === 0) return [];

  // Score candidates sequentially to avoid overwhelming Ollama.
  // Parallelism here would only help if Ollama is running on a GPU with enough
  // VRAM to batch requests — for most self-hosted setups sequential is safer.
  const scored: RerankResult<T>[] = [];

  for (const candidate of candidates) {
    let rerankScore = 0;
    try {
      rerankScore = await scoreOne(query, candidate.content);
    } catch (err: any) {
      if (tolerateErrors) {
        console.warn(`Rerank: scoring failed for candidate ${candidate.id}: ${err.message}`);
      } else {
        throw err;
      }
    }
    scored.push({ candidate, rerankScore });
  }

  // Sort best-first.
  scored.sort((a, b) => b.rerankScore - a.rerankScore);
  return scored;
}
