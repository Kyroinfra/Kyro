import { request } from "./client";
import { browser } from "$app/environment";
import { env } from "$env/dynamic/public";

export interface SemanticSearchResult {
  fileId: string;
  fileName: string;
  chunkIndex: number;
  content: string;
  rrfScore: number;
  rerankScore?: number;
}

export async function semanticSearch(
  apiKey: string,
  q: string,
  opts: {
    collectionId?: string;
    fileIds?: string[];
    limit?: number;
    minScore?: number;
  } = {},
): Promise<{
  data: SemanticSearchResult[];
  query: string;
  limit: number;
  minScore: number;
}> {
  const params = new URLSearchParams({ q });
  if (opts.collectionId) params.set("collection_id", opts.collectionId);
  if (opts.fileIds?.length) params.set("file_ids", opts.fileIds.join(","));
  if (opts.limit) params.set("limit", String(opts.limit));
  if (opts.minScore !== undefined)
    params.set("min_score", String(opts.minScore));

  return request(`/api/v2/files/semantic-search?${params.toString()}`, {
    method: "GET",
    apiKey,
  });
}

export interface AskSource {
  fileId: string;
  fileName: string;
  chunkIndex: number;
  content: string;
  rrfScore: number;
  rerankScore?: number;
}

export interface AskInput {
  question: string;
  collectionId?: string;
  fileIds?: string[];
  topK?: number;
  minScore?: number;
  filters?: Record<string, string | string[]>;
}

export interface AskNonStreamResponse {
  answer: string;
  sources: AskSource[];
}

function getBaseUrl(): string {
  if (browser) {
    return env.PUBLIC_API_URL || "";
  }
  return process.env.INTERNAL_API_URL || "http://api:3000";
}

/**
 * Streams an /ask response. Calls onSources once (when the `sources` event
 * arrives), onChunk for every text token, and resolves when the stream ends
 * (the `done` event) or rejects on an `error` event / network failure.
 */
export async function askStream(
  apiKey: string,
  input: AskInput,
  handlers: {
    onSources?: (sources: AskSource[]) => void;
    onChunk?: (text: string) => void;
    onError?: (message: string) => void;
  },
  signal?: AbortSignal,
): Promise<void> {
  const url = `${getBaseUrl()}/api/v2/files/ask`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({ ...input, stream: true }),
    signal,
  });

  if (!res.ok || !res.body) {
    const errBody = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errBody.error ?? "Ask request failed");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const rawEvent of events) {
      const line = rawEvent.trim();
      if (!line.startsWith("data:")) continue;

      const jsonStr = line.slice(5).trim();
      let parsed: {
        type: string;
        sources?: AskSource[];
        text?: string;
        message?: string;
      };
      try {
        parsed = JSON.parse(jsonStr);
      } catch {
        continue;
      }

      if (parsed.type === "sources" && parsed.sources) {
        handlers.onSources?.(parsed.sources);
      } else if (parsed.type === "chunk" && parsed.text) {
        handlers.onChunk?.(parsed.text);
      } else if (parsed.type === "error") {
        handlers.onError?.(parsed.message ?? "Unknown error");
      } else if (parsed.type === "done") {
        return;
      }
    }
  }
}

export async function ask(
  apiKey: string,
  input: AskInput,
): Promise<AskNonStreamResponse> {
  return request<AskNonStreamResponse>("/api/v2/files/ask", {
    method: "POST",
    apiKey,
    body: { ...input, stream: false },
  });
}
