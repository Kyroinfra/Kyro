// rag/ingest.ts — chunk → embed → persist, for one file
//
// This is the embedding side of the ingest pipeline (extract lives in
// lib/extractors and is orchestrated by lib/pipeline.ts; the pipeline
// itself is restructured by #33). Responsibilities:
//
//   - chunk the extracted text           (rag/chunk.ts)
//   - embed the chunks via Ollama        (rag/ollama.ts)
//   - persist chunks + status trails in Postgres
//   - emit the terminal file events file.ready / file.failed (#40;
//     webhooks/dispatch.ts — the old 9-event list lives nowhere else)
//
// Chunk status transitions are unchanged; terminal events map to
// file.ready / file.failed (skips of no-text/no-chunks are terminal
// failures from the consumer's point of view — never queryable).

import { db } from '../db';
import { fileChunks, files } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { dispatchWebhookEvent } from '../webhooks/dispatch';
import { chunkText } from './chunk';
import { embed } from './ollama';

// How many chunk texts make up ONE /api/embed HTTP request (#36 — before,
// this only sliced the loop while every text still got its own request).
const EMBED_BATCH_SIZE = 32;

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
      .set({ status: 'skipped', error: null })
      .where(eq(files.id, fileId));

    await dispatchWebhookEvent(orgId, 'file.failed', {
      fileId,
      error: 'no_extracted_text',
    });

    return { chunksCreated: 0, skipped: true };
  }

  if (replace) {
    await db.delete(fileChunks).where(eq(fileChunks.fileId, fileId));
  }

  const chunks = chunkText(extractedText);

  // ── Skipped: text produced no chunks ──────────────────────────────────────
  if (chunks.length === 0) {
    await db.update(files)
      .set({ status: 'skipped', error: null })
      .where(eq(files.id, fileId));

    await dispatchWebhookEvent(orgId, 'file.failed', {
      fileId,
      error: 'no_chunks_produced',
    });

    return { chunksCreated: 0, skipped: true };
  }

  // ── Embedding: status stays 'processing' (set by the pipeline) ─────────────

  // ── Embed in batches ───────────────────────────────────────────────────────
  const allEmbeddings: number[][] = [];
  try {
    for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
      const batch      = chunks.slice(i, i + EMBED_BATCH_SIZE);
      const embeddings = await embed(batch.map(c => c.content));
      allEmbeddings.push(...embeddings);
    }
  } catch (embedErr) {
    await db.update(files)
      .set({
        status: 'failed',
        error:  embedErr instanceof Error ? embedErr.message : 'Unknown embedding error',
      })
      .where(eq(files.id, fileId));

    await dispatchWebhookEvent(orgId, 'file.failed', {
      fileId,
      error:          embedErr instanceof Error ? embedErr.message : 'Unknown embedding error',
      chunksTotal:    chunks.length,
      chunksEmbedded: allEmbeddings.length,
      stage:          'embed',
    });

    throw embedErr;
  }

  // ── Persist chunks ─────────────────────────────────────────────────────────
  // Embeddings are BOUND parameters: drizzle's native `vector` column maps
  // number[] → '[…]' as a parameter value (#34/#36) — no SQL is built by
  // concatenating vector literals, so the upsert stays injection-safe.
  const INSERT_BATCH = 100;
  try {
    for (let i = 0; i < chunks.length; i += INSERT_BATCH) {
      const batchChunks     = chunks.slice(i, i + INSERT_BATCH);
      const batchEmbeddings = allEmbeddings.slice(i, i + INSERT_BATCH);

      await db
        .insert(fileChunks)
        .values(
          batchChunks.map((chunk, j) => ({
            fileId:     fileId,
            orgId:      orgId,
            chunkIndex: chunk.index,
            content:    chunk.content,
            embedding:  batchEmbeddings[j],
            tokenCount: chunk.tokenCount,
          })),
        )
        // (file_id, chunk_index) — Postgres infers the composite uniqueIndex.
        .onConflictDoUpdate({
          target: [fileChunks.fileId, fileChunks.chunkIndex],
          set: {
            content:    sql`excluded.content`,
            embedding:  sql`excluded.embedding`,
            tokenCount: sql`excluded.token_count`,
          },
        });
    }
  } catch (persistErr) {
    await db.update(files)
      .set({
        status: 'failed',
        error:  persistErr instanceof Error ? persistErr.message : 'Failed to persist chunks',
      })
      .where(eq(files.id, fileId));

    await dispatchWebhookEvent(orgId, 'file.failed', {
      fileId,
      error:          persistErr instanceof Error ? persistErr.message : 'Failed to persist chunks',
      chunksTotal:    chunks.length,
      chunksEmbedded: allEmbeddings.length,
      stage:          'persist',
    });

    throw persistErr;
  }

  // ── Completed — the file is queryable ──────────────────────────────────────
  await db.update(files)
    .set({ status: 'ready', error: null })
    .where(eq(files.id, fileId));

  await dispatchWebhookEvent(orgId, 'file.ready', {
    fileId,
    chunksCreated: chunks.length,
    totalTokens:   chunks.reduce((sum, c) => sum + c.tokenCount, 0),
  });

  return { chunksCreated: chunks.length, skipped: false };
}
