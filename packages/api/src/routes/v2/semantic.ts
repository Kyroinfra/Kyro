// routes/v2/semantic.ts
// ─────────────────────────────────────────────────────────────────────────────
// Changes from original:
//   • /semantic-search now calls hybridSearch() (BM25+vector→RRF→rerank)
//     instead of a raw cosine-only SQL query. Query params are unchanged.
//   • /ask now calls hybridSearch() for its retrieval step instead of the
//     inline cosine SQL. All other /ask logic (prompt, streaming, sources)
//     is unchanged.
//   • /:id/embed is unchanged.
//   • The resolveCollectionToFileIds helper is unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import { Router, Response } from 'express';
import { db } from '../../db';
import pool from '../../db';
import { collections, collectionFiles } from '../../db/schema';
import { files, fileChunks } from '../../db/schema';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { ApiKeyRequest, requireScope } from '../../middleware/apiKeyAuth';
import { embedFile } from '../../lib/embeddings';
import { hybridSearch } from '../../lib/retrieval';
import { z } from 'zod';

const router = Router();

router.use((req, res, next) => {
  console.log('semanticRouter hit:', req.method, req.path);
  next();
});

const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';
const CHAT_MODEL = process.env.CHAT_MODEL ?? 'llama3.2';

// ── Helper: resolve a collection to its file IDs ──────────────────────────────

async function resolveCollectionToFileIds(
  collectionId: string,
  orgId:        string,
): Promise<string[] | null> {
  const [col] = await db
    .select({ id: collections.id })
    .from(collections)
    .where(and(eq(collections.id, collectionId), eq(collections.orgId, orgId)));

  if (!col) return null;

  const rows = await db
    .select({ fileId: collectionFiles.fileId })
    .from(collectionFiles)
    .where(eq(collectionFiles.collectionId, collectionId));

  return rows.map(r => r.fileId);
}

// ── GET /semantic-search ──────────────────────────────────────────────────────

router.get('/semantic-search', requireScope('read'), async (req: ApiKeyRequest, res: Response) => {
  try {
    const orgId = req.orgId!;
    const q     = (req.query.q as string | undefined)?.trim();

    if (!q) {
      res.status(400).json({ error: 'Query parameter "q" is required' });
      return;
    }

    if (!process.env.OLLAMA_URL) {
      res.status(400).json({ error: 'OLLAMA_URL must be configured for semantic search' });
      return;
    }

    const limit    = Math.min(parseInt((req.query.limit    as string) || '10',  10), 50);
    const minScore = parseFloat((req.query.min_score as string) || '0');

    // ── Resolve file ID filter ─────────────────────────────────────────────
    const hasCollectionId = !!req.query.collection_id;
    const hasFileIds      = !!req.query.file_ids;

    if (hasCollectionId && hasFileIds) {
      res.status(400).json({ error: 'Provide either collection_id or file_ids, not both' });
      return;
    }

    let fileIdFilter: string[] | undefined;

    if (hasCollectionId) {
      const ids = await resolveCollectionToFileIds(req.query.collection_id as string, orgId);
      if (ids === null) {
        res.status(400).json({ error: 'Collection not found' });
        return;
      }
      if (ids.length === 0) {
        res.status(400).json({ error: 'Collection has no files' });
        return;
      }
      fileIdFilter = ids;
    } else if (hasFileIds) {
      const ids = (req.query.file_ids as string)
        .split(',').map(s => s.trim()).filter(Boolean);
      fileIdFilter = ids.length > 0 ? ids : undefined;
    }

    // ── Run hybrid retrieval ───────────────────────────────────────────────
    const results = await hybridSearch({
      orgId,
      query:       q,
      fileIds:     fileIdFilter,
      limit,
      minRrfScore: minScore,
    });

    res.json({
      data:  results,
      query: q,
      limit,
    });
  } catch (error: any) {
    console.error('Error in semantic-search:', error);
    res.status(500).json({ error: 'Semantic search failed', detail: error.message });
  }
});

// ── POST /ask ─────────────────────────────────────────────────────────────────

const askSchema = z.object({
  question:     z.string().min(1).max(2000),
  fileIds:      z.array(z.string().uuid()).max(20).optional(),
  collectionId: z.string().uuid().optional(),
  topK:         z.number().int().min(1).max(20).optional().default(8),
  model:        z.string().optional(),
  minScore:     z.number().min(0).max(1).optional().default(0.25),
  stream:       z.boolean().optional().default(true),
}).refine(
  data => data.fileIds || data.collectionId,
  { message: 'Either fileIds or collectionId is required' },
).refine(
  data => !(data.fileIds && data.collectionId),
  { message: 'Provide either fileIds or collectionId, not both' },
);

router.post('/ask', requireScope('read'), async (req: ApiKeyRequest, res: Response) => {
  try {
    const orgId = req.orgId!;

    const parsed = askSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
      return;
    }

    if (!process.env.OLLAMA_URL) {
      res.status(400).json({ error: 'OLLAMA_URL must be configured to use the /ask endpoint' });
      return;
    }

    const { question, topK, stream } = parsed.data;
    const minScore = parsed.data.minScore;
    const model    = parsed.data.model ?? CHAT_MODEL;

    // ── Resolve file IDs ───────────────────────────────────────────────────
    let resolvedFileIds: string[];

    if (parsed.data.collectionId) {
      const ids = await resolveCollectionToFileIds(parsed.data.collectionId, orgId);
      if (ids === null) {
        res.status(404).json({ error: 'Collection not found' });
        return;
      }
      if (ids.length === 0) {
        res.status(422).json({ error: 'Collection has no files' });
        return;
      }
      resolvedFileIds = ids;
    } else {
      resolvedFileIds = parsed.data.fileIds!;
    }

    // ── Verify ownership + embedding status ────────────────────────────────
    const ownedFiles = await db
      .select({ id: files.id, name: files.name, embeddingStatus: files.embeddingStatus })
      .from(files)
      .where(and(
        eq(files.orgId, orgId),
        isNull(files.deletedAt),
        inArray(files.id, resolvedFileIds),
      ));

    if (ownedFiles.length === 0) {
      res.status(404).json({ error: 'No matching files found' });
      return;
    }

    const embeddedFileIds = ownedFiles
      .filter(f => f.embeddingStatus === 'completed')
      .map(f => f.id);

    if (embeddedFileIds.length === 0) {
      res.status(422).json({
        error: 'None of the requested files have embeddings yet.',
        fileStatuses: ownedFiles.map(f => ({
          id:              f.id,
          name:            f.name,
          embeddingStatus: f.embeddingStatus,
        })),
      });
      return;
    }

    // ── Phase 1 + 2: hybrid retrieval ──────────────────────────────────────
    // hybridSearch handles: embed query → BM25+vector → RRF → cross-encoder rerank
    const sources = await hybridSearch({
      orgId,
      query:       question,
      fileIds:     embeddedFileIds,
      limit:       topK,
      minRrfScore: minScore,
    });

    // ── Build prompt ───────────────────────────────────────────────────────
    const contextBlock = sources.length > 0
      ? sources
          .map((s, i) =>
            `[${i + 1}] File: "${s.fileName}" (chunk ${s.chunkIndex})\n${s.content}`,
          )
          .join('\n\n---\n\n')
      : '(No relevant document context was found for this question.)';

    const systemPrompt = `You are a precise document analyst. Answer the user's question using ONLY the provided document context.

Rules:
- Cite sources using [1], [2], etc. referencing the chunk numbers in the context.
- If the answer cannot be determined from the context, say so clearly — do not hallucinate.
- Be concise but complete. Include numbers, dates, or specific details when they appear in the context.
- If asked to aggregate (e.g. "total across all invoices"), work through the math explicitly.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      {
        role:    'user',
        content: `Document context:\n\n${contextBlock}\n\n---\n\nQuestion: ${question}`,
      },
    ];

    // ── Streaming response ─────────────────────────────────────────────────
    if (stream) {
      res.setHeader('Content-Type',  'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();

      const sendEvent = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);
      sendEvent({ type: 'sources', sources });

      try {
        const ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ model, messages, stream: true, options: { temperature: 0.2 } }),
        });

        if (!ollamaRes.ok || !ollamaRes.body) {
          throw new Error(`Ollama chat failed (${ollamaRes.status}): ${await ollamaRes.text()}`);
        }

        const reader  = ollamaRes.body.getReader();
        const decoder = new TextDecoder();
        let   buffer  = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const json = JSON.parse(line) as { message?: { content?: string }; done?: boolean };
              if (json.message?.content) sendEvent({ type: 'chunk', text: json.message.content });
              if (json.done) sendEvent({ type: 'done' });
            } catch { /* malformed line — skip */ }
          }
        }

        // Flush any remaining buffered data
        if (buffer.trim()) {
          try {
            const json = JSON.parse(buffer) as { message?: { content?: string } };
            if (json.message?.content) sendEvent({ type: 'chunk', text: json.message.content });
          } catch { /* ignore */ }
        }

        sendEvent({ type: 'done' });
      } catch (llmErr: any) {
        console.error('Ollama streaming error:', llmErr);
        sendEvent({ type: 'error', message: llmErr.message ?? 'LLM request failed' });
      } finally {
        res.end();
      }
      return;
    }

    // ── Non-streaming response ─────────────────────────────────────────────
    const ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ model, messages, stream: false, options: { temperature: 0.2 } }),
    });

    if (!ollamaRes.ok) {
      throw new Error(`Ollama chat failed (${ollamaRes.status}): ${await ollamaRes.text()}`);
    }

    const ollamaData = await ollamaRes.json() as { message?: { content?: string } };
    res.json({ answer: ollamaData.message?.content ?? '', sources });

  } catch (error: any) {
    console.error('Error in /ask:', error);
    res.status(500).json({ error: 'Failed to process question', detail: error.message });
  }
});

// ── POST /:id/embed ───────────────────────────────────────────────────────────
// Unchanged from original.

router.post('/:id/embed', requireScope('write'), async (req: ApiKeyRequest, res: Response) => {
  try {
    const orgId = req.orgId!;
    const id    = req.params.id as string;

    if (!process.env.OLLAMA_URL) {
      res.status(400).json({ error: 'OLLAMA_URL must be configured to use embeddings' });
      return;
    }

    const [file] = await db
      .select({ id: files.id, extractedText: files.extractedText, embeddingStatus: files.embeddingStatus })
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
      fileId:        file.id,
      orgId,
      extractedText: file.extractedText,
      replace:       true,
    });

    res.json({
      fileId:          file.id,
      embeddingStatus: result.skipped ? 'skipped' : 'completed',
      chunksCreated:   result.chunksCreated,
    });
  } catch (error: any) {
    console.error('Error embedding file:', error);
    res.status(500).json({ error: 'Embedding failed', detail: error.message });
  }
});

export default router;
