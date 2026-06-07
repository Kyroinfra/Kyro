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
// FIX (2026-06-07):
//   The original rrfSearch() built SQL parameter indices ($N) by reading
//   params.length mid-template-literal, but the fileIds IIFE mutated params
//   during vector-arm template evaluation — so by the time the BM25 arm was
//   evaluated, params.length was already wrong, giving the BM25 query string
//   the wrong bind index. This caused the BM25 arm to silently fail (wrong
//   param), leaving only the vector arm contributing to RRF — and because
//   minScore defaulted to 0, all chunks passed through regardless of relevance.
//
//   Fix: assign ALL parameter indices explicitly BEFORE constructing the SQL
//   string, so there is no implicit dependency on mutation order.
// ─────────────────────────────────────────────────────────────────────────────

import pool from '../db';
import { rerank, RerankCandidate } from './rerank';
import { embedQuery } from './embeddings';

// ── Constants ─────────────────────────────────────────────────────────────────

const RRF_K              = 60;
const CANDIDATE_LIMIT    = 100;
const RERANK_INPUT_LIMIT = 50;

// ── Shared result shape ───────────────────────────────────────────────────────

export interface RetrievalResult {
  fileId:       string;
  fileName:     string;
  chunkIndex:   number;
  content:      string;
  rrfScore:     number;
  rerankScore?: number;
}

// ── Phase 1: BM25 + vector → RRF ─────────────────────────────────────────────

export interface RrfSearchOptions {
  orgId:       string;
  query:       string;
  queryVector: number[];
  fileIds?:    string[];
  limit:       number;
  minScore?:   number;
}

/**
 * Phase 1: retrieve candidates from both the dense (vector) and sparse (BM25)
 * arms, fuse their ranks with RRF, and return up to `limit` results sorted
 * by descending RRF score.
 *
 * Parameter layout (all assigned before SQL construction):
 *   $1  — orgId       (used in both arms)
 *   $2  — query text  (used in BM25 arm)
 *   $3  — fileIds[]   (only when fileIds filter is present)
 *
 * The vector literal is inlined as a safe string (it's a number[] we produced,
 * never raw user input) because pgvector's <=> operator does not accept a bind
 * parameter for the right-hand side.
 */
export async function rrfSearch(opts: RrfSearchOptions): Promise<RetrievalResult[]> {
  const { orgId, query, queryVector, fileIds, limit, minScore = 0 } = opts;

  // ── Build params array and record indices BEFORE touching the SQL string ──
  const params: unknown[] = [];

  // $1 — orgId
  params.push(orgId);
  const P_ORG = params.length; // 1

  // $2 — query text (BM25 arm)
  params.push(query);
  const P_QUERY = params.length; // 2

  // $3 — fileIds array (optional)
  let fileFilterClause = '';
  if (fileIds && fileIds.length > 0) {
    params.push(fileIds);
    const P_FILE_IDS = params.length; // 3
    fileFilterClause = `AND fc.file_id = ANY($${P_FILE_IDS}::uuid[])`;
  }

  // Inline the vector literal — safe because queryVector is number[] we produced
  const vectorLiteral = `[${queryVector.join(',')}]`;

  const sql = `
    WITH vector_ranked AS (
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
            fc.org_id      = $${P_ORG}
        AND f.deleted_at   IS NULL
        AND fc.embedding   IS NOT NULL
        ${fileFilterClause}
      LIMIT ${CANDIDATE_LIMIT}
    ),
    bm25_ranked AS (
      SELECT
        fc.file_id         AS file_id,
        f.name             AS file_name,
        fc.chunk_index     AS chunk_index,
        fc.content         AS content,
        ROW_NUMBER() OVER (
          ORDER BY ts_rank(fc.text_search_vector, websearch_to_tsquery('english', $${P_QUERY})) DESC
        )                  AS rank
      FROM file_chunks fc
      JOIN files f ON f.id = fc.file_id
      WHERE
            fc.org_id              = $${P_ORG}
        AND f.deleted_at           IS NULL
        AND fc.text_search_vector  @@ websearch_to_tsquery('english', $${P_QUERY})
        ${fileFilterClause}
      LIMIT ${CANDIDATE_LIMIT}
    ),
    fused AS (
      SELECT
        COALESCE(v.file_id,     b.file_id)     AS file_id,
        COALESCE(v.file_name,   b.file_name)   AS file_name,
        COALESCE(v.chunk_index, b.chunk_index) AS chunk_index,
        COALESCE(v.content,     b.content)     AS content,
        COALESCE(1.0 / (${RRF_K} + v.rank), 0)
          + COALESCE(1.0 / (${RRF_K} + b.rank), 0) AS rrf_score
      FROM vector_ranked v
      FULL OUTER JOIN bm25_ranked b
        ON  v.file_id     = b.file_id
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

  const result = await pool.query(sql, params);
  return result.rows as RetrievalResult[];
}

// ── Phase 2: cross-encoder rerank ─────────────────────────────────────────────

interface ChunkCandidate extends RerankCandidate {
  fileId:     string;
  fileName:   string;
  chunkIndex: number;
  rrfScore:   number;
}

// ── Public entry point ────────────────────────────────────────────────────────

export interface HybridSearchOptions {
  orgId:         string;
  query:         string;
  fileIds?:      string[];
  limit?:        number;
  minRrfScore?:  number;
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
    limit       = 10,
    minRrfScore = 0,
  } = opts;

  const queryVector = await embedQuery(query);

  const candidates = await rrfSearch({
    orgId,
    query,
    queryVector,
    fileIds,
    limit:    RERANK_INPUT_LIMIT,
    minScore: minRrfScore,
  });

  if (candidates.length === 0) return [];

  if (!process.env.OLLAMA_URL) {
    return candidates.slice(0, limit);
  }

  const rerankInput: ChunkCandidate[] = candidates.map(c => ({
    id:         `${c.fileId}:${c.chunkIndex}`,
    content:    c.content,
    fileId:     c.fileId,
    fileName:   c.fileName,
    chunkIndex: c.chunkIndex,
    rrfScore:   c.rrfScore,
  }));

  const reranked = await rerank(query, rerankInput, { tolerateErrors: true });

  return reranked.slice(0, limit).map(r => ({
    fileId:      r.candidate.fileId,
    fileName:    r.candidate.fileName,
    chunkIndex:  r.candidate.chunkIndex,
    content:     r.candidate.content,
    rrfScore:    r.candidate.rrfScore,
    rerankScore: r.rerankScore,
  }));
}
