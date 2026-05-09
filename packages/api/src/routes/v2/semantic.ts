// routes/v2/semantic.ts
// ─────────────────────────────────────────────────────────────────────────────
// Two new endpoints that complete the RAG stack:
//
//   GET  /v2/files/semantic-search   — vector similarity search over chunks
//   POST /v2/files/ask               — retrieval-augmented answer (streaming)
//
// Mount this in routes/v2/index.ts BEFORE the existing filesRouter so that
// /semantic-search and /ask are matched before /:id.
//
// Both routes require an API key with at least the 'read' scope.
// ─────────────────────────────────────────────────────────────────────────────

import { Router, Response } from 'express';
import { db } from '../../db';
import { files, fileChunks } from '../../db/schema';
import { eq, and, isNull, inArray, sql } from 'drizzle-orm';
import { apiKeyAuthMiddleware, ApiKeyRequest, requireScope } from '../../middleware/apiKeyAuth';
import { embedQuery, chunkText } from '../../lib/embeddings';
import { embedFile } from '../../lib/embeddings';
import { z } from 'zod';
import OpenAI from 'openai';

const router = Router();
router.use(apiKeyAuthMiddleware);

// ── Shared helpers ─────────────────────────────────────────────────────────────

function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is required');
  return new OpenAI({ apiKey });
}

// Cosine similarity between two equal-length vectors
function cosine(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// Build a pgvector literal from a JS float array
function pgVec(v: number[]): string {
  return `[${v.join(',')}]`;
}

// ── GET /semantic-search ───────────────────────────────────────────────────────

/**
 * @swagger
 * /files/semantic-search:
 *   get:
 *     tags: [Files]
 *     summary: Semantic (vector) search over extracted file content
 *     description: |
 *       Embeds the query with the same model used during ingestion, then returns
 *       the most semantically similar document chunks — regardless of exact keyword matches.
 *
 *       Requires that the relevant files have already been embedded (embeddingStatus = "completed").
 *       Files uploaded before embeddings were enabled can be re-embedded via POST /files/:id/embed.
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - name: q
 *         in: query
 *         required: true
 *         schema: { type: string }
 *         description: Natural language search query
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 10, maximum: 50 }
 *         description: Number of chunks to return
 *       - name: min_score
 *         in: query
 *         schema: { type: number, default: 0.3 }
 *         description: Minimum cosine similarity score (0–1). Lower = more results but noisier.
 *       - name: file_ids
 *         in: query
 *         schema: { type: string }
 *         description: Comma-separated list of file UUIDs to restrict the search to
 *     x-scope: read
 *     responses:
 *       200:
 *         description: Ranked list of matching chunks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       fileId:      { type: string, format: uuid }
 *                       fileName:    { type: string }
 *                       chunkIndex:  { type: integer }
 *                       content:     { type: string }
 *                       score:       { type: number, description: "Cosine similarity 0–1" }
 *                 query:  { type: string }
 *                 limit:  { type: integer }
 *       400:
 *         description: Missing query, invalid file_ids, or embeddings not available
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/semantic-search', requireScope('read'), async (req: ApiKeyRequest, res: Response) => {
  try {
    const orgId = req.orgId!;
    const q = (req.query.q as string | undefined)?.trim();

    if (!q) {
      res.status(400).json({ error: 'Query parameter "q" is required' });
      return;
    }

    if (!process.env.OPENAI_API_KEY) {
      res.status(400).json({ error: 'Semantic search requires OPENAI_API_KEY to be configured' });
      return;
    }

    const limit    = Math.min(parseInt((req.query.limit as string) || '10', 10), 50);
    const minScore = parseFloat((req.query.min_score as string) || '0.3');

    // Optional file filter
    let fileIdFilter: string[] | undefined;
    if (req.query.file_ids) {
      fileIdFilter = (req.query.file_ids as string)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      if (fileIdFilter.length === 0) fileIdFilter = undefined;
    }

    // Embed the query
    const queryVec = await embedQuery(q);
    const vecLiteral = pgVec(queryVec);

    // Build the optional file filter
    const fileFilterClause = fileIdFilter && fileIdFilter.length > 0
      ? sql`AND fc.file_id = ANY(${fileIdFilter}::uuid[])`
      : sql``;

    // <=> is pgvector cosine *distance* (0=identical, 2=opposite)
    // We convert to similarity: 1 - distance
    const rows = await db.execute(sql`
      SELECT
        fc.file_id            AS "fileId",
        f.name                AS "fileName",
        fc.chunk_index        AS "chunkIndex",
        fc.content,
        (1 - (fc.embedding <=> ${vecLiteral}::vector))::float4 AS score
      FROM file_chunks fc
      JOIN files f ON f.id = fc.file_id
      WHERE
        fc.org_id   = ${orgId}
        AND f.deleted_at IS NULL
        ${fileFilterClause}
        AND (1 - (fc.embedding <=> ${vecLiteral}::vector)) >= ${minScore}
      ORDER BY fc.embedding <=> ${vecLiteral}::vector
      LIMIT ${limit}
    `);

    res.json({
      data: rows.rows as Array<{ fileId: string; fileName: string; chunkIndex: number; content: string; score: number }>,
      query: q,
      limit,
    });
  } catch (error: any) {
    console.error('Error in semantic-search:', error);
    if (error.message?.includes('OPENAI_API_KEY')) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Semantic search failed' });
  }
});

// ── POST /ask ──────────────────────────────────────────────────────────────────

const askSchema = z.object({
  question: z.string().min(1).max(2000),
  fileIds: z.array(z.string().uuid()).min(1).max(20),
  /** Max chunks to retrieve for context. Default: 8. More = richer context but higher cost. */
  topK: z.number().int().min(1).max(20).optional().default(8),
  /** Override the model. Default: gpt-4o-mini (fast + cheap). */
  model: z.enum([
    'gpt-4o-mini',
    'gpt-4o',
    'gpt-4-turbo',
  ]).optional().default('gpt-4o-mini'),
  /** Minimum similarity score for retrieved chunks. Default: 0.25 */
  minScore: z.number().min(0).max(1).optional().default(0.25),
  /** Whether to stream the response. Default: true */
  stream: z.boolean().optional().default(true),
});

type AskInput = z.infer<typeof askSchema>;

/**
 * @swagger
 * /files/ask:
 *   post:
 *     tags: [Files]
 *     summary: Ask a question over one or more files (RAG)
 *     description: |
 *       Retrieves the most relevant chunks from the specified files using vector
 *       similarity, then streams an AI-generated answer grounded in that context.
 *
 *       The response is a **Server-Sent Events (SSE)** stream. Each event contains
 *       a JSON object:
 *
 *       - `{ type: "chunk", text: "..." }` — incremental answer text
 *       - `{ type: "sources", sources: [...] }` — cited chunks (sent before the answer)
 *       - `{ type: "done" }` — stream complete
 *       - `{ type: "error", message: "..." }` — fatal error
 *
 *       Set `stream: false` to get a single JSON response instead.
 *
 *       Files must have `embeddingStatus = "completed"` to be included in retrieval.
 *       If none of the requested files have embeddings, a 422 is returned.
 *     security:
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [question, fileIds]
 *             properties:
 *               question:
 *                 type: string
 *                 description: The question to answer
 *                 maxLength: 2000
 *               fileIds:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *                 minItems: 1
 *                 maxItems: 20
 *                 description: IDs of files to search for relevant context
 *               topK:
 *                 type: integer
 *                 default: 8
 *                 description: Max chunks to retrieve (more = richer context, higher cost)
 *               model:
 *                 type: string
 *                 enum: [gpt-4o-mini, gpt-4o, gpt-4-turbo]
 *                 default: gpt-4o-mini
 *               minScore:
 *                 type: number
 *                 default: 0.25
 *               stream:
 *                 type: boolean
 *                 default: true
 *     x-scope: read
 *     responses:
 *       200:
 *         description: |
 *           SSE stream (Content-Type: text/event-stream) when stream=true,
 *           or JSON object when stream=false.
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               description: Each line is "data: <JSON>\n\n"
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 answer:   { type: string }
 *                 sources:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       fileId:     { type: string }
 *                       fileName:   { type: string }
 *                       chunkIndex: { type: integer }
 *                       content:    { type: string }
 *                       score:      { type: number }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       422:
 *         description: None of the requested files have embeddings yet
 *       500:
 *         description: LLM or retrieval failure
 */
router.post('/ask', requireScope('read'), async (req: ApiKeyRequest, res: Response) => {
  try {
    const orgId = req.orgId!;

    // Validate input
    const parsed = askSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
      return;
    }

    const { question, fileIds, topK, model, minScore, stream } = parsed.data;

    if (!process.env.OPENAI_API_KEY) {
      res.status(400).json({ error: 'OPENAI_API_KEY must be configured to use the /ask endpoint' });
      return;
    }

    // ── 1. Verify files belong to this org ────────────────────────────────────
    const ownedFiles = await db
      .select({ id: files.id, name: files.name, embeddingStatus: files.embeddingStatus })
      .from(files)
      .where(
        and(
          eq(files.orgId, orgId),
          isNull(files.deletedAt),
          inArray(files.id, fileIds),
        ),
      );

    if (ownedFiles.length === 0) {
      res.status(404).json({ error: 'No matching files found' });
      return;
    }

    // Warn about files that haven't been embedded yet (but don't hard-fail —
    // some files in a mixed batch might be ready).
    const embeddedFileIds = ownedFiles
      .filter(f => f.embeddingStatus === 'completed')
      .map(f => f.id);

    if (embeddedFileIds.length === 0) {
      res.status(422).json({
        error: 'None of the requested files have embeddings yet. Upload files via /v2/files and wait for embeddingStatus to become "completed".',
        fileStatuses: ownedFiles.map(f => ({ id: f.id, name: f.name, embeddingStatus: f.embeddingStatus })),
      });
      return;
    }

    // ── 2. Embed the question + retrieve relevant chunks ──────────────────────
    const queryVec = await embedQuery(question);
    const vecLiteral = pgVec(queryVec);

    const retrievedRows = await db.execute(sql`
      SELECT
        fc.file_id            AS "fileId",
        f.name                AS "fileName",
        fc.chunk_index        AS "chunkIndex",
        fc.content,
        (1 - (fc.embedding <=> ${vecLiteral}::vector))::float4 AS score
      FROM file_chunks fc
      JOIN files f ON f.id = fc.file_id
      WHERE
        fc.org_id  = ${orgId}
        AND fc.file_id = ANY(${embeddedFileIds}::uuid[])
        AND f.deleted_at IS NULL
        AND (1 - (fc.embedding <=> ${vecLiteral}::vector)) >= ${minScore}
      ORDER BY fc.embedding <=> ${vecLiteral}::vector
      LIMIT ${topK}
    `);

    const sources = retrievedRows.rows as Array<{
      fileId: string; fileName: string; chunkIndex: number; content: string; score: number;
    }>;

    if (sources.length === 0) {
      // No relevant chunks found — answer with just the question as context
      // (the model will say it doesn't know, which is honest)
    }

    // ── 3. Build the prompt ────────────────────────────────────────────────────
    const contextBlock = sources.length > 0
      ? sources
          .map((s, i) =>
            `[${i + 1}] File: "${s.fileName}" (chunk ${s.chunkIndex}, score ${s.score.toFixed(3)})\n${s.content}`,
          )
          .join('\n\n---\n\n')
      : '(No relevant document context was found for this question.)';

    const systemPrompt = `You are a precise document analyst. Answer the user's question using ONLY the provided document context.

Rules:
- Cite sources using [1], [2], etc. referencing the chunk numbers in the context.
- If the answer cannot be determined from the context, say so clearly — do not hallucinate.
- Be concise but complete. Include numbers, dates, or specific details when they appear in the context.
- If asked to aggregate (e.g. "total across all invoices"), work through the math explicitly.`;

    const userMessage = `Document context:\n\n${contextBlock}\n\n---\n\nQuestion: ${question}`;

    const openai = getOpenAI();

    // ── 4a. Streaming response ─────────────────────────────────────────────────
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable NGINX buffering
      res.flushHeaders();

      const sendEvent = (data: object) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      // Always send sources first so the client can render citations immediately
      sendEvent({ type: 'sources', sources });

      try {
        const completion = await openai.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          stream: true,
          temperature: 0.2, // Low temp for factual RAG
          max_tokens: 2048,
        });

        for await (const chunk of completion) {
          const text = chunk.choices[0]?.delta?.content;
          if (text) sendEvent({ type: 'chunk', text });
        }

        sendEvent({ type: 'done' });
      } catch (llmErr: any) {
        console.error('LLM streaming error:', llmErr);
        sendEvent({ type: 'error', message: 'LLM request failed' });
      } finally {
        res.end();
      }

      return;
    }

    // ── 4b. Non-streaming response ─────────────────────────────────────────────
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.2,
      max_tokens: 2048,
    });

    const answer = completion.choices[0]?.message?.content ?? '';

    res.json({ answer, sources });
  } catch (error: any) {
    console.error('Error in /ask:', error);
    if (error.message?.includes('OPENAI_API_KEY')) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Failed to process question' });
  }
});

// ── POST /files/:id/embed ──────────────────────────────────────────────────────
// Manually trigger (or re-trigger) embedding for a single file.
// Useful for files uploaded before embeddings were enabled, or after failures.

/**
 * @swagger
 * /files/{id}/embed:
 *   post:
 *     tags: [Files]
 *     summary: Trigger (or re-trigger) embedding for a file
 *     description: |
 *       Chunks the file's extracted text and embeds each chunk using the configured
 *       embedding model. Existing chunks are replaced.
 *
 *       The file must have already had text extracted (extractionStatus = "completed").
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     x-scope: write
 *     responses:
 *       200:
 *         description: Embedding result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 fileId:        { type: string }
 *                 embeddingStatus: { type: string }
 *                 chunksCreated: { type: integer }
 *       400:
 *         description: No extracted text available
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/:id/embed', requireScope('write'), async (req: ApiKeyRequest, res: Response) => {
  try {
    const orgId = req.orgId!;
    const id = req.params.id as string;

    if (!process.env.OPENAI_API_KEY) {
      res.status(400).json({ error: 'OPENAI_API_KEY must be configured to use embeddings' });
      return;
    }

    const [file] = await db
      .select({
        id: files.id,
        extractedText: files.extractedText,
        embeddingStatus: files.embeddingStatus,
      })
      .from(files)
      .where(and(eq(files.id, id), eq(files.orgId, orgId), isNull(files.deletedAt)));

    if (!file) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    if (!file.extractedText) {
      res.status(400).json({
        error: 'No extracted text available. Run text extraction first via POST /files/:id/extract.',
      });
      return;
    }

    const result = await embedFile({
      fileId: file.id,
      orgId,
      extractedText: file.extractedText,
      replace: true,
    });

    res.json({
      fileId: file.id,
      embeddingStatus: result.skipped ? 'skipped' : 'completed',
      chunksCreated: result.chunksCreated,
    });
  } catch (error: any) {
    console.error('Error embedding file:', error);
    res.status(500).json({ error: 'Embedding failed' });
  }
});

export default router;
