// rag/rerank.ts — cross-encoder reranking via a locally hosted Ollama model.
//
// A cross-encoder sees the query and a candidate chunk *together* in a single
// forward pass, so it can model their interaction directly — unlike the
// bi-encoder used for initial retrieval, which embeds them separately.
// Each candidate costs one Ollama call, which is why reranking is opt-in
// end to end (#35).

import config from '../config';
import { generate } from './ollama';

const { rerankModel: RERANK_MODEL } = config;

// Purely serial scoring takes 2-5s (GPU) to 10-30s (CPU) PER CANDIDATE with
// RERANK_INPUT_LIMIT up to 50 — minutes per query. Ollama serialises model
// execution internally anyway, so a pool of 4 saturates a single model
// instance without backpressure blowing up its queue (#35).
const RERANK_CONCURRENCY = 4;

// Longer context = more accurate but slower; 512 chars (~128 tokens) is a
// good default.
const RERANK_CONTEXT_CHARS = 512;

export interface RerankCandidate {
  // Opaque ID — lets the caller identify this candidate back (typically
  // file_id + chunk_index joined).
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
  // Default true: a failing candidate scores 0 instead of aborting the whole
  // rerank — partial failure beats a total outage.
  tolerateErrors?: boolean;
}

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

  // Parse the first integer found — still robust if the model ignores the
  // stop tokens and emits extra text.
  const match = raw.match(/\d+/);
  if (!match) {
    // Unparseable model output — score 0 rather than crash; callers can see
    // rerankScore=0 and filter if needed.
    console.warn(`Rerank: unparseable response "${raw}" for query "${query.slice(0, 60)}"`);
    return 0;
  }

  // Clamp to [0, 10] in case the model ignores the range, then normalise.
  const clamped = Math.max(0, Math.min(10, parseInt(match[0], 10)));
  return clamped / 10;
}

/**
 * Reranks `candidates` by relevance to `query` using a cross-encoder prompt.
 * Returns candidates sorted best-first with an added `rerankScore` field.
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

  // Sort best-first; ties preserve the input order (Array.sort is stable),
  // i.e. RRF order.
  scored.sort((a, b) => b.rerankScore - a.rerankScore);
  return scored;
}
