// routes/ask.ts — POST /ask (RAG question answering with SSE streaming)
//
// Supported modes (all via the same endpoint):
//   { question, collectionId }   — search within a specific collection
//   { question, fileIds: [...] } — search within specific files
//   { question }                 — search across the entire org's embedded corpus

import { Router, type Response } from 'express';
import { db } from '../db';
import { files } from '../db/schema';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { requireScope, type AuthedRequest } from '../middleware/auth';
import { hybridSearch } from '../lib/retrieval';
import { z } from 'zod';
import { resolveMetadataFilter } from '../lib/metadata';
import config from '../config';
import { resolveCollectionToFileIds } from './search';

const router = Router();

const { ollamaUrl: OLLAMA_URL, chatModel: CHAT_MODEL, ragEnabled: RAG_ENABLED } = config;

const askSchema = z.object({
  filters: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional(),
  question:     z.string().min(1).max(2000),
  fileIds:      z.array(z.string().uuid()).max(20).optional(),
  collectionId: z.string().uuid().optional(),
  topK:         z.number().int().min(1).max(20).optional().default(8),
  model:        z.string().optional(),
  minScore:     z.number().min(0).max(1).optional().default(0),
  stream:       z.boolean().optional().default(true),
}).refine(
  // Mutual exclusion — providing both is always an error
  data => !(data.fileIds && data.collectionId),
  { message: 'Provide either fileIds or collectionId, not both' },
);

// ── POST / — answer a question from retrieved context ────────────────────────

router.post('/', requireScope('read'), async (req: AuthedRequest, res: Response) => {
  const orgId = req.orgId!;

  const parsed = askSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
    return;
  }

  if (!RAG_ENABLED) {
    res.status(400).json({ error: 'OLLAMA_URL must be configured to use the /ask endpoint' });
    return;
  }

  const { question, topK, stream } = parsed.data;
  const minScore = parsed.data.minScore;
  const model    = parsed.data.model ?? CHAT_MODEL;

  // ── Resolve file IDs ───────────────────────────────────────────────────
  // resolvedFileIds === undefined means "search the whole org" — this is
  // intentional and handled correctly downstream by hybridSearch / rrfSearch.
  let resolvedFileIds: string[] | undefined;

  // Filter from filters
  if (parsed.data.filters && Object.keys(parsed.data.filters).length > 0) {
    const filteredIds = await resolveMetadataFilter(orgId, parsed.data.filters);
    if (filteredIds.length === 0) {
      res.status(422).json({ error: 'No files match the provided metadata filters' });
      return;
    }
    // Intersect with resolvedFileIds if already scoped, otherwise use directly
    resolvedFileIds = resolvedFileIds
      ? resolvedFileIds.filter(id => filteredIds.includes(id))
      : filteredIds;
  }

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
  } else if (parsed.data.fileIds) {
    resolvedFileIds = parsed.data.fileIds;
  }
  // else: resolvedFileIds stays undefined → org-wide search

  // ── Verify ownership + embedding status ────────────────────────────────
  //
  // Scoped mode (resolvedFileIds is defined):
  //   Verify the caller owns the files and at least some are embedded.
  //   Return a 422 with per-file statuses if none are ready.
  //
  // Org-wide mode (resolvedFileIds is undefined):
  //   Skip per-file ownership check (orgId scoping in hybridSearch is
  //   sufficient). Just confirm the org has at least one embedded file so
  //   we can return a useful error rather than an empty result.
  let embeddedFileIds: string[] | undefined;

  if (resolvedFileIds !== undefined) {
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

    embeddedFileIds = ownedFiles
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
  } else {
    // Org-wide mode — confirm the org has at least one embedded file
    const embeddedCheck = await db
      .select({ id: files.id })
      .from(files)
      .where(and(
        eq(files.orgId, orgId),
        isNull(files.deletedAt),
        eq(files.embeddingStatus, 'completed'),
      ))
      .limit(1);

    if (embeddedCheck.length === 0) {
      res.status(422).json({
        error: 'No embedded files found for this organisation. Upload and embed files first.',
      });
      return;
    }
    // embeddedFileIds stays undefined → hybridSearch searches the whole org
  }

  // ── Hybrid retrieval ───────────────────────────────────────────────────
  const sources = await hybridSearch({
    orgId,
    query:       question,
    fileIds:     embeddedFileIds,   // undefined = whole org
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

    // Inner try/catch is intentional: once the SSE stream is open, failures
    // must be reported as an in-band error event — the status code is moot.
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
        if (done) {break;}

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) {continue;}
          try {
            const json = JSON.parse(line) as { message?: { content?: string }; done?: boolean };
            if (json.message?.content) {sendEvent({ type: 'chunk', text: json.message.content });}
            if (json.done) {sendEvent({ type: 'done' });}
          } catch { /* malformed line — skip */ }
        }
      }

      if (buffer.trim()) {
        try {
          const json = JSON.parse(buffer) as { message?: { content?: string } };
          if (json.message?.content) {sendEvent({ type: 'chunk', text: json.message.content });}
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
});

export default router;
