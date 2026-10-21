// routes/ask.ts — POST /ask (RAG question answering with SSE streaming)
//
// Supported modes (all via the same endpoint):
//   { question, collectionId }   — search within a specific collection
//   { question, fileIds: [...] } — search within specific files
//   { question }                 — search across the entire org's embedded corpus
//   + optional history: prior user/assistant turns, replayed as conversation
//     context to the LLM (multi-turn follow-ups; retrieval stays fresh each turn)

import { Router, type Response } from 'express';
import { db } from '../db';
import { files } from '../db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { requireScope, type AuthedRequest } from '../middleware/auth';
import { hybridSearch } from '../rag/retrieve';
import { streamAnswer, answerOnce } from '../rag/ask';
import { resolveCollectionToFileIds } from '../rag/scope';
import { z } from 'zod';
import { resolveMetadataFilter } from '../lib/metadata';
import config from '../config';

const router = Router();

const { ragEnabled: RAG_ENABLED } = config;

export const askSchema = z.object({
  filters: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional(),
  question:     z.string().min(1).max(2000),
  fileIds:      z.array(z.string().uuid()).max(20).optional(),
  collectionId: z.string().uuid().optional(),
  topK:         z.number().int().min(1).max(20).optional().default(8),
  model:        z.string().optional(),
  minScore:     z.number().min(0).max(1).optional().default(0),
  stream:       z.boolean().optional().default(true),
  // Conversation memory: prior user/assistant turns so follow-ups like
  // "what about page 2?" resolve against the thread. Recent turns are
  // replayed to the LLM verbatim (read-only — they never affect retrieval).
  history: z.array(z.object({
    role:    z.enum(['user', 'assistant']),
    content: z.string().min(1).max(2000),
  })).max(10).optional(),
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
  const model    = parsed.data.model;

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
      .select({ id: files.id, name: files.name, status: files.status })
      .from(files)
      .where(and(
        eq(files.orgId, orgId),
        inArray(files.id, resolvedFileIds),
      ));

    if (ownedFiles.length === 0) {
      res.status(404).json({ error: 'No matching files found' });
      return;
    }

    embeddedFileIds = ownedFiles
      .filter(f => f.status === 'ready')
      .map(f => f.id);

    if (embeddedFileIds.length === 0) {
      res.status(422).json({
        error: 'None of the requested files have embeddings yet.',
        fileStatuses: ownedFiles.map(f => ({
          id:              f.id,
          name:            f.name,
          status:          f.status,
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
        eq(files.status, 'ready'),
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

  // ── Prompt + streaming response ────────────────────────────────────────
  // Prompt building, the Ollama chat calls and stream parsing live in
  // rag/ask.ts + rag/ollama.ts; this route owns only the SSE wire.
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
      // chatStreaming always yields a final { done: true } event, so the
      // done count matches the previous implementation (per Ollama done
      // line + one terminal event) without an extra unconditional send.
      for await (const evt of streamAnswer(question, sources, {
        model,
        history: parsed.data.history,
      })) {
        if (evt.delta) {sendEvent({ type: 'chunk', text: evt.delta });}
        if (evt.done)  {sendEvent({ type: 'done' });}
      }
    } catch (llmErr) {
      console.error('Ollama streaming error:', llmErr);
      sendEvent({ type: 'error', message: llmErr instanceof Error ? llmErr.message : 'LLM request failed' });
    } finally {
      res.end();
    }
    return;
  }

  // ── Non-streaming response ─────────────────────────────────────────────
  const answer = await answerOnce(question, sources, {
    model,
    history: parsed.data.history,
  });

  res.json({ answer, sources });
});

export default router;
