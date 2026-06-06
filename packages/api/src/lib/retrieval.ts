// lib/retrieval.ts
// ─────────────────────────────────────────────────────────────────────────────
// Two-phase hybrid retrieval for file chunks.
//
// Phase 1 — Candidate generation (fast, runs entirely in Postgres):
//   a. Dense retrieval:  cosine similarity via pgvector (<=> operator).
//   b. Sparse retrieval: BM25-style full-text search via tsvector / tsquery.
//   Both return up to CANDIDATE_LIMIT rows with their rank positions.
//   Scores are fused with Reciprocal Rank Fusion (RRF, k=60).
//
// Phase 2 — Reranking (slow, runs against Ollama):
//   The top RERANK_INPUT_LIMIT candidates from Phase 1 are scored by a
//   cross-encoder model that sees (query, chunk) jointly and assigns a
//   relevance score. Final results are sorted by that score.
//
// Callers that do not have OLLAMA_URL set get Phase 1 only (RRF ranking),
// which is already a significant improvement over pure cosine similarity.
//
// Public surface:
//   hybridSearch()   — main entry point used by routes/v2/semantic.ts
//   rrfSearch()      — Phase 1 only (exported for testing / fallback use)
// ─────────────────────────────────────────────────────────────────────────────

import pool from '../db';
import { rerank, RerankCandidate } from './rerank';
import { embedQuery } from './embeddings';

// ── Constants ─────────────────────────────────────────────────────────────────

// RRF constant — 60 is the value used in the original RRF paper (Cormack 2009)
// and remains a sensible default. Increasing it flattens score differences;
// decreasing it amplifies them.
const RRF_K = 60;

// How many candidates each retrieval arm fetches before fusion.
// Larger → better recall at the cost of more Postgres work.
const CANDIDATE_LIMIT = 100;

// How many fused candidates are passed to the cross-encoder.
// Keep this small — each candidate requires one Ollama call.
const RERANK_INPUT_LIMIT = 50;

// ── Shared result shape ───────────────────────────────────────────────────────

export interface RetrievalResult {
  fileId:      string;
  fileName:    string;
  chunkIndex:  number;
  content:     string;
  // Phase-1 score (RRF). Present on all results.
  rrfScore:    number;
  // Phase-2 score (cross-encoder). Only present when reranking ran.
  rerankScore?: number;
}

// ── Phase 1: BM25 + vector → RRF ─────────────────────────────────────────────

export interface RrfSearchOptions {
  orgId:       string;
  query:       string;
  queryVector: number[];
  fileIds?:    string[];    // if set, restrict to these file IDs
  limit:       number;      // how many fused results to return
  minScore?:   number;      // minimum RRF score to include (default: 0)
}

/**
 * Phase 1: retrieve candidates from both the dense (vector) and sparse (BM25)
 * arms, fuse their ranks with RRF, and return up to `limit` results sorted
 * by descending RRF score.
 */
export async function rrfSearch(opts: RrfSearchOptions): Promise<RetrievalResult[]> {
  const { orgId, query, queryVector, fileIds, limit, minScore = 0 } = opts;

  const vectorLiteral = `[${queryVector.join(',')}]`;

  // Optional file-ID filter. We build a parameterised clause used in both CTEs.
  // The params array grows as we add bind values, so we track the next index.
  const params: unknown[] = [orgId];
  const fileFilterClause  = fileIds && fileIds.length > 0
    ? `AND fc.file_id = ANY($${(() => { params.push(fileIds); return params.length; })()}::uuid[])`
    : '';

  // We need the vector literal in the SQL but it is NOT a bind parameter —
  // pgvector's <=> operator requires the literal to be cast inline. It is safe
  // here because queryVector is a number[] we produced ourselves (never user
  // input as a raw string).
  const sql = `
    WITH vector_ranked AS (
      -- Dense arm: cosine distance, ascending (smaller = more similar)
      SELECT
        fc.file_id         AS file_id,
        f.name             AS file_name,
        fc.chunk_index     AS chunk_index,
        fc.content         AS content,
        ROW_NUMBER() OVER (
          ORDER BY fc.embedding <=> '${vectorLiteral}'::vector
        )                  AS rank
      FROM file_chunks fc
      JOIN files f ON f.id = fc.file_id
      WHERE
        fc.org_id     = $1
        AND f.deleted_at IS NULL
        AND fc.embedding IS NOT NULL
        ${fileFilterClause}
      LIMIT ${CANDIDATE_LIMIT}
    ),
    bm25_ranked AS (
      -- Sparse arm: BM25 via tsvector, descending (larger ts_rank = more relevant)
      SELECT
        fc.file_id         AS file_id,
        f.name             AS file_name,
        fc.chunk_index     AS chunk_index,
        fc.content         AS content,
        ROW_NUMBER() OVER (
          ORDER BY ts_rank(fc.text_search_vector, websearch_to_tsquery('english', $${params.length + 1})) DESC
        )                  AS rank
      FROM file_chunks fc
      JOIN files f ON f.id = fc.file_id
      WHERE
        fc.org_id     = $1
        AND f.deleted_at IS NULL
        AND fc.text_search_vector @@ websearch_to_tsquery('english', $${params.length + 1})
        ${fileFilterClause}
      LIMIT ${CANDIDATE_LIMIT}
    ),
    fused AS (
      -- Reciprocal Rank Fusion over the union of both arms.
      -- A chunk that appears in both arms gets contributions from each.
      SELECT
        COALESCE(v.file_id,     b.file_id)     AS file_id,
        COALESCE(v.file_name,   b.file_name)   AS file_name,
        COALESCE(v.chunk_index, b.chunk_index) AS chunk_index,
        COALESCE(v.content,     b.content)     AS content,
        COALESCE(1.0 / (${RRF_K} + v.rank), 0)
          + COALESCE(1.0 / (${RRF_K} + b.rank), 0) AS rrf_score
      FROM vector_ranked v
      FULL OUTER JOIN bm25_ranked b
        ON  v.file_id    = b.file_id
        AND v.chunk_index = b.chunk_index
    )
    SELECT
      file_id     AS "fileId",
      file_name   AS "fileName",
      chunk_index AS "chunkIndex",
      content,
      rrf_score   AS "rrfScore"
    FROM fused
    WHERE rrf_score >= ${minScore}
    ORDER BY rrf_score DESC
    LIMIT ${limit}
  `;

  // Push the query string for the BM25 arm (referenced twice via the same $N)
  params.push(query);

  const result = await pool.query(sql, params);
  return result.rows as RetrievalResult[];
}

// ── Phase 2: cross-encoder rerank ─────────────────────────────────────────────

// Shape expected by rerank() from lib/rerank.ts
interface ChunkCandidate extends RerankCandidate {
  fileId:     string;
  fileName:   string;
  chunkIndex: number;
  rrfScore:   number;
}

// ── Public entry point ────────────────────────────────────────────────────────

export interface HybridSearchOptions {
  orgId:      string;
  query:      string;
  fileIds?:   string[];
  // Final number of results to return to the caller.
  limit?:     number;
  // Minimum RRF score to pass into the reranker. Filters noise before the
  // (expensive) cross-encoder step. Default: 0 (no filtering).
  minRrfScore?: number;
}

/**
 * Full two-phase retrieval:
 *   Phase 1 — BM25 + vector → RRF → top RERANK_INPUT_LIMIT candidates
 *   Phase 2 — Cross-encoder rerank → top `limit` results
 *
 * If OLLAMA_URL is not set, Phase 2 is skipped and Phase 1 results are
 * returned sorted by RRF score.
 */
export async function hybridSearch(opts: HybridSearchOptions): Promise<RetrievalResult[]> {
  const {
    orgId,
    query,
    fileIds,
    limit        = 10,
    minRrfScore  = 0,
  } = opts;

  // ── Phase 1 ───────────────────────────────────────────────────────────────
  // Embed the query for the dense arm. We do this once and reuse.
  const queryVector = await embedQuery(query);

  const candidates = await rrfSearch({
    orgId,
    query,
    queryVector,
    fileIds,
    limit:    RERANK_INPUT_LIMIT,   // fetch wider than final limit for reranker
    minScore: minRrfScore,
  });

  if (candidates.length === 0) return [];

  // ── Phase 2 (optional) ────────────────────────────────────────────────────
  if (!process.env.OLLAMA_URL) {
    // No Ollama — return Phase 1 results trimmed to the requested limit.
    return candidates.slice(0, limit);
  }

  // Build the candidate list for the cross-encoder.
  const rerankInput: ChunkCandidate[] = candidates.map(c => ({
    // id is used only for deduplication inside rerank(); format is arbitrary.
    id:         `${c.fileId}:${c.chunkIndex}`,
    content:    c.content,
    fileId:     c.fileId,
    fileName:   c.fileName,
    chunkIndex: c.chunkIndex,
    rrfScore:   c.rrfScore,
  }));

  const reranked = await rerank(query, rerankInput, { tolerateErrors: true });

  // Map back to RetrievalResult, merging both scores.
  return reranked.slice(0, limit).map(r => ({
    fileId:      r.candidate.fileId,
    fileName:    r.candidate.fileName,
    chunkIndex:  r.candidate.chunkIndex,
    content:     r.candidate.content,
    rrfScore:    r.candidate.rrfScore,
    rerankScore: r.rerankScore,
  }));
}
