// lib/embeddings.ts
// ─────────────────────────────────────────────────────────────────────────────
// Responsible for:
//   1. Chunking extracted text into overlapping windows
//   2. Embedding chunks via OpenAI text-embedding-3-small
//   3. Storing chunks + embeddings in the file_chunks table
//
// Requires env:
//   OPENAI_API_KEY   — your OpenAI key
//   EMBEDDING_MODEL  — optional override (default: text-embedding-3-small)
//
// You can swap the embedding provider by replacing `embedBatch` with a call to
// Cohere, Mistral, or a local model — the rest of the pipeline is provider-agnostic.
// ─────────────────────────────────────────────────────────────────────────────

import OpenAI from 'openai';
import { db } from '../db';
import { fileChunks, files } from '../db/schema';
import { eq } from 'drizzle-orm';

// ── Config ────────────────────────────────────────────────────────────────────

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536; // text-embedding-3-small default; matches vector(1536) in schema

// Chunk sizing — tune these for your use-case.
// Smaller chunks → more precise retrieval but higher token cost.
// Larger chunks  → more context per result but noisier similarity.
const CHUNK_SIZE_CHARS = 1200;   // ~300 tokens at ~4 chars/token
const CHUNK_OVERLAP_CHARS = 200; // overlap between consecutive chunks

// OpenAI embeds up to 2048 texts per request — batch to stay under the limit.
const EMBED_BATCH_SIZE = 512;

let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY environment variable is required for embeddings');
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}

// ── Chunking ──────────────────────────────────────────────────────────────────

export interface TextChunk {
  index: number;
  content: string;
  tokenCount: number; // rough estimate
}

/**
 * Split `text` into overlapping character windows.
 * Breaks on sentence/paragraph boundaries where possible.
 */
export function chunkText(text: string): TextChunk[] {
  if (!text.trim()) return [];

  const chunks: TextChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < text.length) {
    let end = start + CHUNK_SIZE_CHARS;

    if (end < text.length) {
      // Try to break at a paragraph, then sentence, then word boundary
      const breakCandidates = [
        text.lastIndexOf('\n\n', end),
        text.lastIndexOf('. ', end),
        text.lastIndexOf('? ', end),
        text.lastIndexOf('! ', end),
        text.lastIndexOf('\n', end),
        text.lastIndexOf(' ', end),
      ];

      // Use the furthest break that's still reasonably into the chunk (> 50% of size)
      const minBreak = start + CHUNK_SIZE_CHARS * 0.5;
      const goodBreak = breakCandidates
        .filter(b => b > minBreak)
        .sort((a, b) => b - a)[0];

      if (goodBreak > minBreak) {
        end = goodBreak + 1; // include the break character
      }
    }

    const content = text.slice(start, end).trim();
    if (content.length > 0) {
      chunks.push({
        index,
        content,
        tokenCount: Math.ceil(content.length / 4), // rough estimate
      });
      index++;
    }

    // Advance with overlap so consecutive chunks share context
    start = end - CHUNK_OVERLAP_CHARS;
    if (start <= 0) break;
  }

  return chunks;
}

// ── Embedding ─────────────────────────────────────────────────────────────────

/**
 * Embed a batch of strings. Returns a parallel array of float32 vectors.
 */
async function embedBatch(texts: string[]): Promise<number[][]> {
  const openai = getOpenAI();
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  // Response items are returned in the same order as inputs
  return response.data
    .sort((a: { index: number }, b: { index: number }) => a.index - b.index)
    .map((item: { embedding: number[] }) => item.embedding);
}

// ── Main entry point ──────────────────────────────────────────────────────────

export interface EmbedFileOptions {
  fileId: string;
  orgId: string;
  extractedText: string;
  /** If true, deletes existing chunks for this file before inserting new ones. Default: true */
  replace?: boolean;
}

export interface EmbedFileResult {
  chunksCreated: number;
  skipped: boolean;
}

/**
 * Chunk + embed a file's extracted text, then persist to `file_chunks`.
 *
 * Safe to call multiple times — existing chunks are deleted first (when replace=true).
 */
export async function embedFile(opts: EmbedFileOptions): Promise<EmbedFileResult> {
  const { fileId, orgId, extractedText, replace = true } = opts;

  if (!extractedText?.trim()) {
    await db.update(files)
      .set({ embeddingStatus: 'skipped' })
      .where(eq(files.id, fileId));
    return { chunksCreated: 0, skipped: true };
  }

  // Delete old chunks if re-embedding
  if (replace) {
    await db.delete(fileChunks).where(eq(fileChunks.fileId, fileId));
  }

  const chunks = chunkText(extractedText);
  if (chunks.length === 0) {
    await db.update(files)
      .set({ embeddingStatus: 'skipped' })
      .where(eq(files.id, fileId));
    return { chunksCreated: 0, skipped: true };
  }

  // Mark as in-progress
  await db.update(files)
    .set({ embeddingStatus: 'embedding' })
    .where(eq(files.id, fileId));

  // Embed in batches to stay within OpenAI request limits
  const allEmbeddings: number[][] = [];
  for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
    const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
    const embeddings = await embedBatch(batch.map(c => c.content));
    allEmbeddings.push(...embeddings);
  }

  // Insert all chunks + their embeddings
  const rows = chunks.map((chunk, i) => ({
    fileId,
    orgId,
    chunkIndex: chunk.index,
    content: chunk.content,
    embedding: allEmbeddings[i],
    tokenCount: chunk.tokenCount,
  }));

  // Insert in batches of 100 to avoid huge parameter lists
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

  await db.update(files)
    .set({ embeddingStatus: 'completed' })
    .where(eq(files.id, fileId));

  return { chunksCreated: chunks.length, skipped: false };
}

// ── Query embedding ───────────────────────────────────────────────────────────

/**
 * Embed a single query string for similarity search.
 */
export async function embedQuery(query: string): Promise<number[]> {
  const [embedding] = await embedBatch([query]);
  return embedding;
}

// ── Semantic search ───────────────────────────────────────────────────────────

export interface SemanticSearchOptions {
  orgId: string;
  query: string;
  /** Filter to specific file IDs (optional) */
  fileIds?: string[];
  limit?: number;
  /** Minimum cosine similarity score 0–1. Default: 0.3 */
  minScore?: number;
}

export interface SemanticSearchResult {
  fileId: string;
  fileName: string;
  chunkIndex: number;
  content: string;
  score: number; // cosine similarity 0–1
}

/**
 * Run a semantic similarity search across all embedded chunks for an org.
 * Returns chunks ranked by cosine similarity to the query.
 */
export async function semanticSearch(opts: SemanticSearchOptions): Promise<SemanticSearchResult[]> {
  const { orgId, query, fileIds, limit = 10, minScore = 0.3 } = opts;

  const queryEmbedding = await embedQuery(query);
  const vectorLiteral = `[${queryEmbedding.join(',')}]`;

  // Build file filter clause
  const fileFilter = fileIds && fileIds.length > 0
    ? `AND fc.file_id = ANY($3::uuid[])`
    : '';

  const params: unknown[] = [orgId, vectorLiteral];
  if (fileIds && fileIds.length > 0) params.push(fileIds);
  params.push(minScore, limit);

  const scoreParam = params.length - 1; // 1-indexed position of minScore
  const limitParam = params.length;     // 1-indexed position of limit

  // pgvector cosine distance: 1 - cosine_similarity
  // We convert: similarity = 1 - distance
  const sql = `
    SELECT
      fc.file_id            AS "fileId",
      f.name                AS "fileName",
      fc.chunk_index        AS "chunkIndex",
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

  const { rows } = await db.execute(
    // We use the raw pool query here because drizzle doesn't yet have first-class
    // pgvector operator support — the <=> operator is injected as a raw SQL fragment.
    { sql, params } as any
  );

  return rows as unknown as SemanticSearchResult[];
}
