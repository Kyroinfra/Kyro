// rag/ollama.ts — the ONLY Ollama client in the codebase
//
// Every conversation with Ollama goes through this module (per #32): one base
// URL from config, one request helper, one error shape. Callers never build an
// Ollama URL or parse raw HTTP.
//
//   embed(texts)               POST /api/embed        (one request per call;
//                                                     the input is the batch)
//   generate(prompt)           POST /api/generate
//   chat(messages)             POST /api/chat         (non-streaming)
//   chatStreaming(messages)    POST /api/chat         (streaming async
//                                                     iterator of deltas)

import config from '../config';

const { ollamaUrl: OLLAMA_URL } = config;

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaStreamEvent {
  /** Incremental model output for this line, when any. */
  delta?: string;
  /** True when the model signalled the end of generation. */
  done?: boolean;
}

async function ollamaPost(path: string, body: unknown): Promise<Response> {
  const res = await fetch(`${OLLAMA_URL}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  }).catch(err => {
    throw new Error(`Ollama ${path} request failed: ${err.cause?.message ?? err.message}`);
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Ollama ${path} failed (${res.status}): ${detail}`);
  }

  return res;
}

// ── Embeddings ────────────────────────────────────────────────────────────────

/** Embeds a batch in ONE HTTP request via Ollama's batch endpoint
 *  /api/embed (#36) — input order is preserved in the returned embeddings.
 *  Callers slice the input (rag/ingest, EMBED_BATCH_SIZE) so that one batch
 *  equals one HTTP request. */
export async function embed(texts: string[]): Promise<number[][]> {
  const res = await ollamaPost('/api/embed', {
    model: config.embeddingModel,
    input: texts,
  });
  const data = await res.json() as { embeddings: number[][] };

  if (!Array.isArray(data.embeddings) || data.embeddings.length !== texts.length) {
    throw new Error(
      `Ollama /api/embed returned ${data.embeddings?.length ?? 0} embeddings ` +
      `for ${texts.length} inputs`,
    );
  }
  return data.embeddings;
}

// ── Generation ────────────────────────────────────────────────────────────────

export async function generate(
  prompt:  string,
  model:   string,
  options?: Record<string, unknown>,
): Promise<{ response: string }> {
  const res  = await ollamaPost('/api/generate', {
    model,
    prompt,
    stream: false,
    options,
  });
  return await res.json() as { response: string };
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export async function chat(
  messages: ChatMessage[],
  model:    string,
  options?: { temperature?: number },
): Promise<string> {
  const res  = await ollamaPost('/api/chat', {
    model,
    messages,
    stream: false,
    options,
  });
  const data = await res.json() as { message?: { content?: string } };
  return data.message?.content ?? '';
}

/** Streams /api/chat. Yields `{ delta }` per output token line and a final
 *  `{ done: true }`; a line may carry both. Callers render events exactly as
 *  they arrive (the SSE wire keeps its original shape). */
export async function* chatStreaming(
  messages: ChatMessage[],
  model:    string,
  options?: { temperature?: number },
): AsyncGenerator<OllamaStreamEvent> {
  const res = await ollamaPost('/api/chat', {
    model,
    messages,
    stream: true,
    options,
  });

  if (!res.body) {
    throw new Error('Ollama chat stream returned no body');
  }

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let   buffer  = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {break;}

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const evt = parseOllamaLine(line);
      if (evt) {yield evt;}
    }
  }

  if (buffer.trim()) {
    const evt = parseOllamaLine(buffer);
    if (evt) {yield evt;}
  }

  yield { done: true };
}

function parseOllamaLine(line: string): OllamaStreamEvent | null {
  if (!line.trim()) {return null;}

  let json: { message?: { content?: string }; done?: boolean };
  try {
    json = JSON.parse(line) as { message?: { content?: string }; done?: boolean };
  } catch {
    return null; // malformed line — skip (same as the original inline reader)
  }

  const delta = json.message?.content;
  const isDone = json.done === true;

  if (delta) {
    return { delta, done: isDone };
  }
  if (isDone) {
    return { done: true };
  }
  return null;
}
