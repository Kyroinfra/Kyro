// lib/embeddings.ts
// ─────────────────────────────────────────────────────────────────────────────
// Changes from previous version:
//   • semanticSearch() now delegates to hybridSearch() from lib/retrieval.ts.
//     The function signature and return type are unchanged so all existing
//     callers continue to work without modification.
//   • All other functions (chunkText, embedFile, embedQuery, embedBatch,
//     embedOne) are unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import { db } from '../db';
import pool from '../db';            // raw pg Pool (default export)
import { fileChunks, files } from '../db/schema';
import { eq } from 'drizzle-orm';
import {
  dispatchWebhookEvent,
  dispatchCollectionEmbeddingEvents,
} from './webhook';
import { hybridSearch } from './retrieval';

// ── Config ────────────────────────────────────────────────────────────────────

const OLLAMA_URL      = process.env.OLLAMA_URL      ?? 'http://localhost:11434';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? 'nomic-embed-text';

// Chunking thresholds (characters, not tokens)
const CHUNK_TARGET_CHARS  = 1200; // aim for this size per chunk
const CHUNK_MIN_CHARS     = 400;  // below this, merge with the next paragraph
const CHUNK_MAX_CHARS     = 1800; // above this, force a sentence-level split
const CHUNK_OVERLAP_CHARS = 200;  // tail of prev chunk prepended as context

const EMBED_BATCH_SIZE = 32;

// ── Chunking ──────────────────────────────────────────────────────────────────

export interface TextChunk {
  index:      number;
  content:    string;
  tokenCount: number;
}

export function chunkText(text: string): TextChunk[] {
  if (!text.trim()) return [];

  // ── 1. Split on paragraph boundaries ──────────────────────────────────────
  // Handles \n\n, \r\n\r\n, or any line that is entirely whitespace.
  const rawParagraphs = text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  // ── 2. Merge short paragraphs forward ─────────────────────────────────────
  // Walk forward: while the accumulated buffer is below CHUNK_MIN_CHARS, keep
  // appending the next paragraph. This keeps related short clauses together
  // (e.g. numbered legal sub-clauses, citation lines, figure captions).
  const merged: string[] = [];
  let buffer = '';

  for (const para of rawParagraphs) {
    if (buffer.length === 0) {
      buffer = para;
    } else if (buffer.length < CHUNK_MIN_CHARS) {
      buffer += '\n\n' + para;
    } else {
      merged.push(buffer);
      buffer = para;
    }
  }
  if (buffer.length > 0) {
    merged.push(buffer);
  }

  // ── 3. Split oversized blocks at sentence boundaries ──────────────────────
  // A paragraph that exceeds CHUNK_MAX_CHARS is split greedily: sentences are
  // accumulated until adding the next one would exceed CHUNK_TARGET_CHARS,
  // at which point the current accumulator is flushed and a new one starts.
  const sized: string[] = [];

  for (const block of merged) {
    if (block.length <= CHUNK_MAX_CHARS) {
      sized.push(block);
      continue;
    }

    // Match sequences ending with sentence-terminating punctuation.
    // Keeps ". " boundaries intact without stripping the period.
    const sentences = block.match(/[^.!?]+[.!?]*/g) ?? [block];
    let current = '';

    for (const sentence of sentences) {
      const s = sentence.trim();
      if (!s) continue;

      if (current.length > 0 && current.length + 1 + s.length > CHUNK_TARGET_CHARS) {
        sized.push(current.trim());
        current = s;
      } else {
        current = current ? current + ' ' + s : s;
      }
    }
    if (current.trim()) {
      sized.push(current.trim());
    }
  }

  // ── 4. Build final chunks with soft overlap ────────────────────────────────
  // Each chunk begins with the tail of the previous chunk (CHUNK_OVERLAP_CHARS)
  // so that a sentence split mid-way between two chunks does not lose context.
  // The overlap is prepended as genuine text; the primary paragraph boundary is
  // still honoured — the chunk does not start mid-sentence.
  const chunks: TextChunk[] = [];
  let previousTail = '';

  for (let i = 0; i < sized.length; i++) {
    const primary = sized[i];
    const content = previousTail
      ? previousTail + '\n\n' + primary
      : primary;

    const trimmed = content.trim();
    chunks.push({
      index:      i,
      content:    trimmed,
      tokenCount: Math.ceil(trimmed.length / 4),
    });

    // Capture the tail of *primary* (not the full content including overlap)
    // so we don't accumulate overlap-of-overlap across many chunks.
    previousTail = primary.length > CHUNK_OVERLAP_CHARS
      ? primary.slice(-CHUNK_OVERLAP_CHARS)
      : primary;
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
    await db.update(files)
      .set({ embeddingStatus: 'failed' })
      .where(eq(files.id, fileId));

    await dispatchWebhookEvent(orgId, 'embedding.failed', {
      fileId,
      error:          embedErr.message ?? 'Unknown embedding error',
      chunksTotal:    chunks.length,
      chunksEmbedded: allEmbeddings.length,
    });

    await dispatchCollectionEmbeddingEvents(orgId, fileId);

    throw embedErr;
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

  await dispatchCollectionEmbeddingEvents(orgId, fileId);

  return { chunksCreated: chunks.length, skipped: false };
}

// ── Query embedding ───────────────────────────────────────────────────────────

export async function embedQuery(query: string): Promise<number[]> {
  return embedOne(query);
}

// ── Semantic search ───────────────────────────────────────────────────────────
// Delegates to hybridSearch() (Phase 1: BM25+vector→RRF, Phase 2: rerank).
// The function signature and SemanticSearchResult shape are unchanged so that
// routes/v2/semantic.ts and any other callers need no modifications.

export interface SemanticSearchOptions {
  orgId:     string;
  query:     string;
  fileIds?:  string[];
  limit?:    number;
  minScore?: number;
}

export interface SemanticSearchResult {
  fileId:      string;
  fileName:    string;
  chunkIndex:  number;
  content:     string;
  score:       number;   // rrfScore when no reranker; rerankScore when reranker ran
  rrfScore?:   number;   // always present (useful for debugging)
  rerankScore?: number;  // only present when OLLAMA_URL is set
}

export async function semanticSearch(opts: SemanticSearchOptions): Promise<SemanticSearchResult[]> {
  const { orgId, query, fileIds, limit = 10, minScore = 0 } = opts;

  const results = await hybridSearch({
    orgId,
    query,
    fileIds,
    limit,
    minRrfScore: minScore,
  });

  // Map to the established SemanticSearchResult shape.
  // `score` is the most relevant score available: rerankScore when present
  // (Phase 2 ran), otherwise rrfScore (Phase 1 only).
  return results.map(r => ({
    fileId:      r.fileId,
    fileName:    r.fileName,
    chunkIndex:  r.chunkIndex,
    content:     r.content,
    score:       r.rerankScore !== undefined ? r.rerankScore : r.rrfScore,
    rrfScore:    r.rrfScore,
    rerankScore: r.rerankScore,
  }));
}
