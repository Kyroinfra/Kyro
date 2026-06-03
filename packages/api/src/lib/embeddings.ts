// lib/embeddings.ts
// ─────────────────────────────────────────────────────────────────────────────
// Changes from original:
//   • embedFile() now dispatches embedding.started / embedding.completed /
//     embedding.failed / embedding.skipped webhooks.
//   • After settling, it calls dispatchCollectionEmbeddingEvents() so that
//     collection.embedding_completed / collection.embedding_failed fire once
//     every file in the collection has a final status.
//   • semanticSearch() and chunkText() are unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import { db } from '../db';
import pool from '../db';            // raw pg Pool (default export)
import { fileChunks, files } from '../db/schema';
import { eq } from 'drizzle-orm';
import {
  dispatchWebhookEvent,
  dispatchCollectionEmbeddingEvents,
} from './webhook';

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

  // ── Skipped: no text to embed ──────────────────────────────────────────────
  if (!extractedText?.trim()) {
    await db.update(files)
      .set({ embeddingStatus: 'skipped' })
      .where(eq(files.id, fileId));

    await dispatchWebhookEvent(orgId, 'embedding.skipped', {
      fileId,
      reason: 'no_extracted_text',
    });

    // Check if this settles any collections
    await dispatchCollectionEmbeddingEvents(orgId, fileId);

    return { chunksCreated: 0, skipped: true };
  }

  if (replace) {
    await db.delete(fileChunks).where(eq(fileChunks.fileId, fileId));
  }

  const chunks = chunkText(extractedText);

  // ── Skipped: text produced no chunks ──────────────────────────────────────
  if (chunks.length === 0) {
    await db.update(files)
      .set({ embeddingStatus: 'skipped' })
      .where(eq(files.id, fileId));

    await dispatchWebhookEvent(orgId, 'embedding.skipped', {
      fileId,
      reason: 'no_chunks_produced',
    });

    await dispatchCollectionEmbeddingEvents(orgId, fileId);

    return { chunksCreated: 0, skipped: true };
  }

  // ── Started ────────────────────────────────────────────────────────────────
  await db.update(files)
    .set({ embeddingStatus: 'embedding' })
    .where(eq(files.id, fileId));

  await dispatchWebhookEvent(orgId, 'embedding.started', {
    fileId,
    totalChunks: chunks.length,
  });

  // ── Embed in batches ───────────────────────────────────────────────────────
  let allEmbeddings: number[][] = [];
  try {
    for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
      const batch      = chunks.slice(i, i + EMBED_BATCH_SIZE);
      const embeddings = await embedBatch(batch.map(c => c.content));
      allEmbeddings.push(...embeddings);
    }
  } catch (embedErr: any) {
    // Mark the file as failed and fire the webhook before re-throwing so the
    // worker's outer catch can still log/mark the job status.
    await db.update(files)
      .set({ embeddingStatus: 'failed' })
      .where(eq(files.id, fileId));

    await dispatchWebhookEvent(orgId, 'embedding.failed', {
      fileId,
      error:        embedErr.message ?? 'Unknown embedding error',
      chunksTotal:  chunks.length,
      // chunksEmbedded tells consumers how far we got before the failure
      chunksEmbedded: allEmbeddings.length,
    });

    // Settle any collections that contain this file
    await dispatchCollectionEmbeddingEvents(orgId, fileId);

    throw embedErr; // let the worker decide whether to retry
  }

  // ── Persist chunks ─────────────────────────────────────────────────────────
  // Uses raw pool — Drizzle cannot bind vector arrays correctly for bulk
  // inserts with ON CONFLICT DO UPDATE that reference the vector column.
  const INSERT_BATCH = 100;
  try {
    for (let i = 0; i < chunks.length; i += INSERT_BATCH) {
      const batchChunks     = chunks.slice(i, i + INSERT_BATCH);
      const batchEmbeddings = allEmbeddings.slice(i, i + INSERT_BATCH);

      const valuePlaceholders: string[] = [];
      const values: unknown[]           = [];
      let   paramIdx = 1;

      for (let j = 0; j < batchChunks.length; j++) {
        const chunk  = batchChunks[j];
        const vecLit = `[${batchEmbeddings[j].join(',')}]`;
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
  } catch (persistErr: any) {
    await db.update(files)
      .set({ embeddingStatus: 'failed' })
      .where(eq(files.id, fileId));

    await dispatchWebhookEvent(orgId, 'embedding.failed', {
      fileId,
      error:          persistErr.message ?? 'Failed to persist chunks',
      chunksTotal:    chunks.length,
      chunksEmbedded: allEmbeddings.length,
      stage:          'persist',
    });

    await dispatchCollectionEmbeddingEvents(orgId, fileId);

    throw persistErr;
  }

  // ── Completed ──────────────────────────────────────────────────────────────
  await db.update(files)
    .set({ embeddingStatus: 'completed' })
    .where(eq(files.id, fileId));

  await dispatchWebhookEvent(orgId, 'embedding.completed', {
    fileId,
    chunksCreated: chunks.length,
    totalTokens:   chunks.reduce((sum, c) => sum + c.tokenCount, 0),
  });

  // Check if every file in any containing collection is now settled
  await dispatchCollectionEmbeddingEvents(orgId, fileId);

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
  const vectorLiteral  = `[${queryEmbedding.join(',')}]`;

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
