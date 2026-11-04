// rag/retrieve.ts — hybrid retrieval for file chunks (#35).
//
// Dense arm (pgvector cosine `<=>`, HNSW) + full-text arm (ts_rank over the
// generated tsvector — not BM25), fused with Reciprocal Rank Fusion; ties
// break on file_id/chunk_index so the output order is deterministic. Both
// arms fetch CANDIDATE_LIMIT rows with an explicit ORDER BY before LIMIT.
// Cross-encoder reranking is opt-in (RERANK_ENABLED, default off).
//
// This is the ONLY module permitted to use the raw pg handle (see
// db/index.ts): the fusion SQL is tsvector/vector-specific and is not
// expressible with the Drizzle query builder (#26).

import { pool } from '../db';
import config from '../config';
import { embed } from './ollama';
import { rerank, type RerankCandidate } from './rerank';

// From the original RRF paper (Cormack 2009).
const RRF_K = 60;

const CANDIDATE_LIMIT = 100;

const RERANK_INPUT_LIMIT = 50;

// Cosine distance threshold for the vector arm (#24). pgvector's <=> returns
// distance in [0, 2]: 0 = identical vectors, 1 = orthogonal, 2 = opposite.
// 0.5 admits anything with directional similarity while excluding pure
// noise; tighten via env without a redeploy.
const VECTOR_DISTANCE_THRESHOLD = config.vectorDistanceThreshold;

export interface RetrievalResult {
  fileId:       string;
  fileName:     string;
  chunkIndex:   number;
  content:      string;
  rrfScore:     number;
  rerankScore?: number;
}

export interface RrfSearchOptions {
  orgId:       string;
  query:       string;
  queryVector: number[];
  fileIds?:    string[];
  limit:       number;
}

/**
 * Phase 1: retrieve candidates from both the dense (vector) and full-text
 * arms, fuse their ranks with RRF, and return up to `limit` results sorted by
 * descending RRF score (ties break by fileId/chunkIndex — deterministic).
 */
export async function rrfSearch(opts: RrfSearchOptions): Promise<RetrievalResult[]> {
  const { orgId, query, queryVector, fileIds, limit } = opts;

  // Assign every parameter index BEFORE building the SQL string — deriving
  // them from params.length mid-construction silently corrupts the queries.
  const params: unknown[] = [];

  params.push(orgId);
  const P_ORG = params.length;

  // pgvector accepts the driver's string form when cast to ::vector.
  params.push(`[${queryVector.join(',')}]`);
  const P_VECTOR = params.length;

  params.push(VECTOR_DISTANCE_THRESHOLD);
  const P_THRESHOLD = params.length;

  params.push(CANDIDATE_LIMIT);
  const P_CANDIDATES = params.length;

  params.push(query);
  const P_QUERY = params.length;

  let fileFilterClause = '';
  if (fileIds && fileIds.length > 0) {
    params.push(fileIds);
    const P_FILE_IDS = params.length;
    fileFilterClause = `AND fc.file_id = ANY($${P_FILE_IDS}::uuid[])`;
  }

  params.push(limit);
  const P_LIMIT = params.length;

  const fusedSql = `
    WITH vector_ranked AS (
      -- Dense arm: keep only chunks within the configured cosine distance of
      -- the query vector, ranked by distance ASC. The ORDER BY before LIMIT is
      -- what makes the kept set mean "closest $4", not "any $4 rows".
      SELECT
        fc.file_id         AS file_id,
        f.name             AS file_name,
        fc.chunk_index     AS chunk_index,
        fc.content         AS content,
        ROW_NUMBER() OVER (
          ORDER BY fc.embedding <=> $${P_VECTOR}::vector
        )                          AS rank
      FROM file_chunks fc
      JOIN files f ON f.id = fc.file_id
      WHERE
            fc.org_id                            = $${P_ORG}
        AND f.org_id  IS NOT DISTINCT FROM $${P_ORG}
        AND f.status = 'ready' -- files still processing/failed never surface (#37)
        AND fc.embedding IS NOT NULL
        AND fc.embedding <=> $${P_VECTOR}::vector < $${P_THRESHOLD}::float8
        ${fileFilterClause}
      ORDER BY fc.embedding <=> $${P_VECTOR}::vector
      LIMIT $${P_CANDIDATES}::int
    ),
    text_ranked AS (
      -- Full-text arm: ts_rank over the generated tsvector (NOT BM25 — the
      -- simpler ts_rank relevance postgres ships). Self-filtering: only
      -- chunks matching the tsquery are included, no threshold needed.
      SELECT
        fc.file_id         AS file_id,
        f.name             AS file_name,
        fc.chunk_index     AS chunk_index,
        fc.content         AS content,
        ROW_NUMBER() OVER (
          ORDER BY ts_rank(fc.text_search_vector, websearch_to_tsquery('english', $${P_QUERY})) DESC
        )                          AS rank
      FROM file_chunks fc
      JOIN files f ON f.id = fc.file_id
      WHERE
            fc.org_id  = $${P_ORG}
        AND f.org_id IS NOT DISTINCT FROM $${P_ORG}
        AND f.status = 'ready' -- files still processing/failed never surface (#37)
        AND fc.text_search_vector @@ websearch_to_tsquery('english', $${P_QUERY})
        ${fileFilterClause}
      ORDER BY ts_rank(fc.text_search_vector, websearch_to_tsquery('english', $${P_QUERY})) DESC
      LIMIT $${P_CANDIDATES}::int
    ),
    fused AS (
      -- Reciprocal Rank Fusion over the union of both arms.
      -- A chunk that appears in both arms gets contributions from each.
      -- A chunk that appears in neither arm is not present at all.
      SELECT
        COALESCE(v.file_id,     t.file_id)     AS file_id,
        COALESCE(v.file_name,   t.file_name)   AS file_name,
        COALESCE(v.chunk_index, t.chunk_index) AS chunk_index,
        COALESCE(v.content,     t.content)     AS content,
        COALESCE(1.0 / (${RRF_K} + v.rank), 0)
          + COALESCE(1.0 / (${RRF_K} + t.rank), 0) AS rrf_score
      FROM vector_ranked v
      FULL OUTER JOIN text_ranked t
        ON  v.file_id     = t.file_id
        AND v.chunk_index = t.chunk_index
    )
    SELECT
      file_id     AS "fileId",
      file_name   AS "fileName",
      chunk_index AS "chunkIndex",
      content,
      rrf_score   AS "rrfScore"
    FROM fused
    ORDER BY rrf_score DESC, "fileId", "chunkIndex"
    LIMIT $${P_LIMIT}::int
  `;

  const result = await pool.query(fusedSql, params);
  return result.rows as RetrievalResult[];
}

// ── Phase 2: cross-encoder rerank (opt-in) ───────────────────────────────────

interface ChunkCandidate extends RerankCandidate {
  fileId:     string;
  fileName:   string;
  chunkIndex: number;
  rrfScore:   number;
}

export interface HybridSearchOptions {
  orgId:    string;
  query:    string;
  fileIds?: string[];
  limit?:   number;
}

/**
 * Hybrid retrieval: phase 1 fuses full-text + vector ranks with RRF; phase 2
 * (only when RERANK_ENABLED is on) cross-encoder-reranks the top
 * RERANK_INPUT_LIMIT candidates. With reranking off, the RRF order is the
 * final answer and no LLM calls are made beyond the query embedding.
 */
export async function hybridSearch(opts: HybridSearchOptions): Promise<RetrievalResult[]> {
  const { orgId, query, fileIds, limit = 10 } = opts;

  const [queryVector] = await embed([query]);

  const wantsRerank = config.ragEnabled && config.rerankEnabled;

  const candidates = await rrfSearch({
    orgId,
    query,
    queryVector,
    fileIds,
    limit: wantsRerank ? RERANK_INPUT_LIMIT : limit,
  });

  if (candidates.length === 0) {return [];}

  if (!wantsRerank) {
    return candidates;
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
