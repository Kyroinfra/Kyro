// lib/embeddings.ts  (FIXED)
// ─────────────────────────────────────────────────────────────────────────────
// Fix applied to semanticSearch():
//   The original used db.execute({ sql, params }) with a vector literal as a
//   bind parameter. Postgres receives the vector as a text string and cannot
//   implicitly cast it to the vector type, causing:
//     "operator does not exist: vector <=> text"
//   Fix: use the raw pg pool so the vector literal is inlined directly into
//   the SQL string with an explicit ::vector cast, bypassing Drizzle's
//   parameter binding entirely.
// ─────────────────────────────────────────────────────────────────────────────

import { db } from '../db';
import pool from '../db';            // raw pg Pool (default export)
import { fileChunks, files } from '../db/schema';
import { eq } from 'drizzle-orm';

// ── Config ────────────────────────────────────────────────────────────────────

const OLLAMA_URL      = process.env.OLLAMA_URL      ?? 'http://localhost:11434';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? 'nomic-embed-text';

const CHUNK_SIZE_CHARS    = 1200;
const CHUNK_OVERLAP_CHARS = 200;
const EMBED_BATCH_SIZE    = 32;

// ── Chunking ──────────────────────────────────────────────────────────────────

export interface TextChunk {
  index:      number;
  content:    string;
  tokenCount: number;
}

export function chunkText(text: string): TextChunk[] {
  if (!text.trim()) return [];

  const chunks: TextChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < text.length) {
    let end = start + CHUNK_SIZE_CHARS;

    if (end < text.length) {
      const breakCandidates = [
        text.lastIndexOf('\n\n', end),
        text.lastIndexOf('. ',  end),
        text.lastIndexOf('? ',  end),
        text.lastIndexOf('! ',  end),
        text.lastIndexOf('\n',  end),
        text.lastIndexOf(' ',   end),
      ];

      const minBreak  = start + CHUNK_SIZE_CHARS * 0.5;
      const goodBreak = breakCandidates
        .filter(b => b > minBreak)
        .sort((a, b) => b - a)[0];

      if (goodBreak > minBreak) end = goodBreak + 1;
    }

    const content = text.slice(start, end).trim();
    if (content.length > 0) {
      chunks.push({ index, content, tokenCount: Math.ceil(content.length / 4) });
      index++;
    }

    start = end - CHUNK_OVERLAP_CHARS;
    if (start <= 0) break;
  }

  return chunks;
}

// ── Embedding ─────────────────────────────────────────────────────────────────

async function embedOne(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ model: EMBEDDING_MODEL, prompt: text }),
  }).catch(err => {
    // This shows the real cause: ECONNREFUSED, ENOTFOUND, etc.
    throw new Error(`fetch failed: ${err.cause?.message ?? err.message}`);
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Ollama embedding failed (${res.status}): ${body}`);
  }

  const data = await res.json() as { embedding: number[] };
  return data.embedding;
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  for (const text of texts) {
    results.push(await embedOne(text));
  }
  return results;
}

// ── Main entry point ──────────────────────────────────────────────────────────

export interface EmbedFileOptions {
  fileId:        string;
  orgId:         string;
  extractedText: string;
  replace?:      boolean;
}

export interface EmbedFileResult {
  chunksCreated: number;
  skipped:       boolean;
}

export async function embedFile(opts: EmbedFileOptions): Promise<EmbedFileResult> {
  const { fileId, orgId, extractedText, replace = true } = opts;

  if (!extractedText?.trim()) {
    await db.update(files).set({ embeddingStatus: 'skipped' }).where(eq(files.id, fileId));
    return { chunksCreated: 0, skipped: true };
  }

  if (replace) {
    await db.delete(fileChunks).where(eq(fileChunks.fileId, fileId));
  }

  const chunks = chunkText(extractedText);
  if (chunks.length === 0) {
    await db.update(files).set({ embeddingStatus: 'skipped' }).where(eq(files.id, fileId));
    return { chunksCreated: 0, skipped: true };
  }

  await db.update(files).set({ embeddingStatus: 'embedding' }).where(eq(files.id, fileId));

  // Embed in batches
  const allEmbeddings: number[][] = [];
  for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
    const batch      = chunks.slice(i, i + EMBED_BATCH_SIZE);
    const embeddings = await embedBatch(batch.map(c => c.content));
    allEmbeddings.push(...embeddings);
  }

  // Persist using raw pool — Drizzle cannot bind vector arrays correctly
  // for bulk inserts with ON CONFLICT DO UPDATE that reference the vector column.
  const INSERT_BATCH = 100;
  for (let i = 0; i < chunks.length; i += INSERT_BATCH) {
    const batchChunks     = chunks.slice(i, i + INSERT_BATCH);
    const batchEmbeddings = allEmbeddings.slice(i, i + INSERT_BATCH);

    // Build a multi-row VALUES clause with vector literals inlined
    const valuePlaceholders: string[] = [];
    const values: unknown[]           = [];
    let   paramIdx = 1;

    for (let j = 0; j < batchChunks.length; j++) {
      const chunk     = batchChunks[j];
      const vecLit    = `[${batchEmbeddings[j].join(',')}]`;
      // fileId, orgId, chunkIndex, content are parameterized; vector is inlined
      valuePlaceholders.push(
        `($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, '${vecLit}'::vector, $${paramIdx++})`
      );
      values.push(fileId, orgId, chunk.index, chunk.content, chunk.tokenCount);
    }

    const insertSql = `
      INSERT INTO file_chunks (file_id, org_id, chunk_index, content, embedding, token_count)
      VALUES ${valuePlaceholders.join(', ')}
      ON CONFLICT (file_id, chunk_index)
      DO UPDATE SET
        content     = EXCLUDED.content,
        embedding   = EXCLUDED.embedding,
        token_count = EXCLUDED.token_count
    `;

    await pool.query(insertSql, values);
  }

  await db.update(files).set({ embeddingStatus: 'completed' }).where(eq(files.id, fileId));

  return { chunksCreated: chunks.length, skipped: false };
}

// ── Query embedding ───────────────────────────────────────────────────────────

export async function embedQuery(query: string): Promise<number[]> {
  return embedOne(query);
}

// ── Semantic search ───────────────────────────────────────────────────────────

export interface SemanticSearchOptions {
  orgId:     string;
  query:     string;
  fileIds?:  string[];
  limit?:    number;
  minScore?: number;
}

export interface SemanticSearchResult {
  fileId:     string;
  fileName:   string;
  chunkIndex: number;
  content:    string;
  score:      number;
}

export async function semanticSearch(opts: SemanticSearchOptions): Promise<SemanticSearchResult[]> {
  const { orgId, query, fileIds, limit = 10, minScore = 0.3 } = opts;

  const queryEmbedding = await embedQuery(query);
  // Inline vector as a SQL literal — do NOT use a bind parameter.
  // Postgres cannot implicitly cast a text bind param to the vector type,
  // which causes "operator does not exist: vector <=> text".
  const vectorLiteral = `[${queryEmbedding.join(',')}]`;

  const params: unknown[] = [orgId];
  let fileFilter = '';

  if (fileIds && fileIds.length > 0) {
    params.push(fileIds);
    fileFilter = `AND fc.file_id = ANY($${params.length}::uuid[])`;
  }

  params.push(minScore);
  const minScoreParam = params.length;
  params.push(limit);
  const limitParam = params.length;

  const rawSql = `
    SELECT
      fc.file_id        AS "fileId",
      f.name            AS "fileName",
      fc.chunk_index    AS "chunkIndex",
      fc.content,
      (1 - (fc.embedding <=> '${vectorLiteral}'::vector))::float4 AS score
    FROM file_chunks fc
    JOIN files f ON f.id = fc.file_id
    WHERE
      fc.org_id = $1
      AND f.deleted_at IS NULL
      ${fileFilter}
      AND (1 - (fc.embedding <=> '${vectorLiteral}'::vector)) >= $${minScoreParam}
    ORDER BY fc.embedding <=> '${vectorLiteral}'::vector
    LIMIT $${limitParam}
  `;

  const result = await pool.query(rawSql, params);
  return result.rows as SemanticSearchResult[];
}
