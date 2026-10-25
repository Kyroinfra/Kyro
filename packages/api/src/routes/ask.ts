// routes/ask.ts — POST /ask (RAG question answering with SSE streaming)
//
// Supported modes (all via the same endpoint):
//   { question, collectionId }   — search within a specific collection
//   { question, fileIds: [...] } — search within specific files
//   { question }                 — search across the entire org's embedded corpus
//   + optional history: prior user/assistant turns, replayed as conversation
//     context to the LLM (multi-turn follow-ups; retrieval stays fresh each turn)
//
// Everything else is owned elsewhere and this route stays the thin wire:
//   scope rules + uniform errors → rag/scope.ts (#37, one resolver shared
//   with /search — no per-route scope branches and no embedded-file
//   pre-counts; retrieval itself only surfaces status='ready' files)
//   prompt + LLM calls           → rag/ask.ts (askSchema also lives there)

import { Router, type Response } from 'express';
import { requireScope, type AuthedRequest } from '../middleware/auth';
import { hybridSearch } from '../rag/retrieve';
import { streamAnswer, answerOnce, askSchema } from '../rag/ask';
import { resolveScope, isScopeError } from '../rag/scope';
import config from '../config';

const router = Router();

const { ragEnabled: RAG_ENABLED } = config;

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

  // ── Scope: the one resolver (#37) ──────────────────────────────────────
  // `fileIds: undefined` means org-wide; every scope failure answers with
  // the same status/message /search would give for the same input.
  const scope = await resolveScope(orgId, {
    collectionId: parsed.data.collectionId,
    fileIds:      parsed.data.fileIds,
    filters:      parsed.data.filters,
  });

  if (isScopeError(scope)) {
    res.status(scope.status).json({ error: scope.error });
    return;
  }

  // ── Hybrid retrieval ───────────────────────────────────────────────────
  const sources = await hybridSearch({
    orgId,
    query:   parsed.data.question,
    fileIds: scope.fileIds,   // undefined = whole org
    limit:   parsed.data.topK,
  });

  // ── Prompt + streaming response ────────────────────────────────────────
  // Prompt building, the Ollama chat calls and stream parsing live in
  // rag/ask.ts + rag/ollama.ts; this route owns only the SSE wire.
  if (parsed.data.stream) {
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
      for await (const evt of streamAnswer(parsed.data.question, sources, {
        model:   parsed.data.model,
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
  const answer = await answerOnce(parsed.data.question, sources, {
    model:   parsed.data.model,
    history: parsed.data.history,
  });

  res.json({ answer, sources });
});

export default router;
