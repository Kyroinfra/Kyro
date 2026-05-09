// lib/embeddings.ts
// ─────────────────────────────────────────────────────────────────────────────
// Embeddings via Ollama (nomic-embed-text, 768 dims) — zero API cost.
//
// Requires:
//   ollama pull nomic-embed-text
//   ollama serve   (or it runs as a background service after install)
//
// Env vars:
//   OLLAMA_URL       — default: http://localhost:11434
//   EMBEDDING_MODEL  — default: nomic-embed-text
// ─────────────────────────────────────────────────────────────────────────────

import { db } from '../db';
import { fileChunks, files } from '../db/schema';
import { eq } from 'drizzle-orm';

// ── Config ────────────────────────────────────────────────────────────────────

const OLLAMA_URL      = process.env.OLLAMA_URL      ?? 'http://localhost:11434';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? 'nomic-embed-text';

// Chunk sizing
const CHUNK_SIZE_CHARS    = 1200;
const CHUNK_OVERLAP_CHARS = 200;

// Ollama handles one text per request — keep batches small to avoid timeouts
const EMBED_BATCH_SIZE = 32;

// ── Chunking ──────────────────────────────────────────────────────────────────

export interface TextChunk {
  index: number;
  content: string;
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
        text.lastIndexOf('. ', end),
        text.lastIndexOf('? ', end),
        text.lastIndexOf('! ', end),
        text.lastIndexOf('\n', end),
        text.lastIndexOf(' ', end),
      ];

      const minBreak = start + CHUNK_SIZE_CHARS * 0.5;
      const goodBreak = breakCandidates
        .filter(b => b > minBreak)
        .sort((a, b) => b - a)[0];

      if (goodBreak > minBreak) {
        end = goodBreak + 1;
      }
    }

    const content = text.slice(start, end).trim();
    if (content.length > 0) {
      chunks.push({
        index,
        content,
        tokenCount: Math.ceil(content.length / 4),
      });
      index++;
    }

    start = end - CHUNK_OVERLAP_CHARS;
    if (start <= 0) break;
  }

  return chunks;
}

// ── Embedding ─────────────────────────────────────────────────────────────────

/**
 * Embed a single text via Ollama.
 */
async function embedOne(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBEDDING_MODEL, prompt: text }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Ollama embedding failed (${res.status}): ${body}`);
  }

  const data = await res.json() as { embedding: number[] };
  return data.embedding;
}

/**
 * Embed a batch of strings sequentially.
 * Ollama's /api/embeddings endpoint is one-at-a-time; parallelism is handled
 * by the caller batching across multiple worker concurrency slots.
 */
async function embedBatch(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  for (const text of texts) {
    results.push(await embedOne(text));
  }
  return results;
}

// ── Main entry point ──────────────────────────────────────────────────────────

export interface EmbedFileOptions {
  fileId: string;
  orgId: string;
  extractedText: string;
  replace?: boolean;
}

export interface EmbedFileResult {
  chunksCreated: number;
  skipped: boolean;
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
    const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
    const embeddings = await embedBatch(batch.map(c => c.content));
    allEmbeddings.push(...embeddings);
  }

  // Persist chunks + vectors
  const rows = chunks.map((chunk, i) => ({
    fileId,
    orgId,
    chunkIndex: chunk.index,
    content: chunk.content,
    embedding: allEmbeddings[i],
    tokenCount: chunk.tokenCount,
  }));

  const INSERT_BATCH = 100;
  for (let i = 0; i < rows.length; i += INSERT_BATCH) {
    await db.insert(fileChunks)
      .values(rows.slice(i, i + INSERT_BATCH))
      .onConflictDoUpdate({
        target: [fileChunks.fileId, fileChunks.chunkIndex],
        set: {
          content: fileChunks.content,
          embedding: fileChunks.embedding,
          tokenCount: fileChunks.tokenCount,
        },
      });
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
  orgId: string;
  query: string;
  fileIds?: string[];
  limit?: number;
  minScore?: number;
}

export interface SemanticSearchResult {
  fileId: string;
  fileName: string;
  chunkIndex: number;
  content: string;
  score: number;
}

export async function semanticSearch(opts: SemanticSearchOptions): Promise<SemanticSearchResult[]> {
  const { orgId, query, fileIds, limit = 10, minScore = 0.3 } = opts;

  const queryEmbedding = await embedQuery(query);
  const vectorLiteral  = `[${queryEmbedding.join(',')}]`;

  const fileFilter = fileIds && fileIds.length > 0
    ? `AND fc.file_id = ANY($3::uuid[])`
    : '';

  const params: unknown[] = [orgId, vectorLiteral];
  if (fileIds && fileIds.length > 0) params.push(fileIds);
  params.push(minScore, limit);

  const scoreParam = params.length - 1;
  const limitParam = params.length;

  const sql = `
    SELECT
      fc.file_id        AS "fileId",
      f.name            AS "fileName",
      fc.chunk_index    AS "chunkIndex",
      fc.content,
      1 - (fc.embedding <=> $2::vector) AS score
    FROM file_chunks fc
    JOIN files f ON f.id = fc.file_id
    WHERE
      fc.org_id = $1
      AND f.deleted_at IS NULL
      ${fileFilter}
      AND (1 - (fc.embedding <=> $2::vector)) >= $${scoreParam}
    ORDER BY fc.embedding <=> $2::vector
    LIMIT $${limitParam}
  `;

  const { rows } = await db.execute({ sql, params } as any);
  return rows as unknown as SemanticSearchResult[];
}
