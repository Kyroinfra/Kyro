// rag/ask.ts — prompt building + answer generation for POST /ask
//
// The route stays thin (parse → scope checks → SSE plumbing); this module owns
// everything LLM-shaped:
//
//   buildChatMessages() — document-context prompt + system rules + history
//   streamAnswer()      — async iterator over the streamed chat response
//   answerOnce()        — non-streaming fallback returning the full answer
//
// The prompt text and the options passed to Ollama are byte-identical to the
// previous inline implementation.

import config from '../config';
import { chat, chatStreaming, type ChatMessage } from './ollama';
import type { RetrievalResult } from './retrieve';
import { z } from 'zod';

const { chatModel: CHAT_MODEL } = config;

// ── The /ask request contract ────────────────────────────────────────────────
// Lives beside the prompt/LLM logic (the meat of the endpoint) so routes/ask.ts
// stays the thin SSE wire; routes import it from here.
export const askSchema = z.object({
  filters: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional(),
  question:     z.string().min(1).max(2000),
  fileIds:      z.array(z.string().uuid()).max(20).optional(),
  collectionId: z.string().uuid().optional(),
  topK:         z.number().int().min(1).max(20).optional().default(8),
  model:        z.string().optional(),
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

export type AskTurn = { role: 'user' | 'assistant'; content: string };

export function buildChatMessages(
  question: string,
  sources:  RetrievalResult[],
  history?: AskTurn[],
): ChatMessage[] {
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

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...(history ?? []).map(h => ({ role: h.role, content: h.content })),
    {
      role:    'user',
      content: `Document context:\n\n${contextBlock}\n\n---\n\nQuestion: ${question}`,
    },
  ];

  return messages;
}

export interface AnswerOptions {
  /** Optional client model override. Defaults to config.chatModel. */
  model?:    string;
  history?:  AskTurn[];
}

/** Streams the answer for a question over `sources`. */
export async function* streamAnswer(
  question: string,
  sources:  RetrievalResult[],
  opts:     AnswerOptions = {},
): AsyncGenerator<{ delta?: string; done?: boolean }> {
  const messages = buildChatMessages(question, sources, opts.history);
  yield* chatStreaming(messages, opts.model ?? CHAT_MODEL, { temperature: 0.2 });
}

/** Non-streaming fallback: returns the complete answer text. */
export async function answerOnce(
  question: string,
  sources:  RetrievalResult[],
  opts:     AnswerOptions = {},
): Promise<string> {
  const messages = buildChatMessages(question, sources, opts.history);
  return chat(messages, opts.model ?? CHAT_MODEL, { temperature: 0.2 });
}
