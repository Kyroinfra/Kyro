// rag/rerank.ts — cross-encoder reranking using a locally hosted model via Ollama
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
// Latency note:
//   Each candidate requires one Ollama call. Set RERANK_MODEL in your
//   environment to choose the model; for most self-hosted setups candidates
//   are scored sequentially (#35 makes reranking opt-in end to end).

import config from '../config';
import { generate } from './ollama';

const { rerankModel: RERANK_MODEL } = config;

// How many candidates we score in flight at once when rerank runs (#35).
// Purely serial scoring takes 2-5s (GPU) to 10-30s (CPU) PER CANDIDATE with
// RERANK_INPUT_LIMIT up to 50 - minutes per query. A small bounded pool keeps
// Ollama busy without pile-up: Ollama serialises model execution internally
// anyway, so a pool of 4 saturates a single model instance without
// backpressure blowing up its queue.
const RERANK_CONCURRENCY = 4;

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

export interface RerankOptions {
  // If true, errors on individual candidates are logged but do not abort the
  // whole rerank — the failing candidate gets score 0 instead.
  // Default: true (partial failure is better than a total outage).
  tolerateErrors?: boolean;
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

  const data = await generate(prompt, RERANK_MODEL, {
    temperature: 0,      // deterministic scoring
    num_predict: 4,      // we only need 1–2 digits
    stop: ['\n', ' '],   // stop after the first token
  });

  const raw = data.response.trim();

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

  if (candidates.length === 0) {return [];}

  // Small bounded pool (#35): split the candidate list into
  // RERANK_CONCURRENCY interleaved lanes and drain them in parallel.
  // Order-dependent nothing — the final sort below is deterministic, and ties
  // preserve the input order (Array.sort is stable), i.e. RRF order.
  const results: Array<RerankResult<T>> = new Array(candidates.length);
  let next = 0;         // shared cursor into `candidates`
  let firstError: unknown; // tolerateErrors=false: surface AFTER the pool drains

  const worker = async (): Promise<void> => {
    while (true) {
      const index = next++;
      if (index >= candidates.length) {break;}

      const candidate = candidates[index];
      let rerankScore = 0;
      try {
        rerankScore = await scoreOne(query, candidate.content);
      } catch (err: any) {
        if (tolerateErrors) {
          console.warn(`Rerank: scoring failed for candidate ${candidate.id}: ${err.message}`);
        } else if (firstError === undefined) {
          firstError = err;
        }
      }
      results[index] = { candidate, rerankScore };
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(RERANK_CONCURRENCY, candidates.length) }, () => worker()),
  );

  if (!tolerateErrors && firstError !== undefined) {
    throw firstError;
  }

  // `tolerateErrors=true` (default) leaves score 0 rows in place of failures.
  const scored = results as RerankResult<T>[];

  // Sort best-first.
  scored.sort((a, b) => b.rerankScore - a.rerankScore);
  return scored;
}
