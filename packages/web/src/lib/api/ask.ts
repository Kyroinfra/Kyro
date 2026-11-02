import { request } from "./client";

export interface SemanticSearchResult {
  fileId: string;
  fileName: string;
  chunkIndex: number;
  content: string;
  rrfScore: number;
  rerankScore?: number;
}

export async function semanticSearch(
  q: string,
  opts: {
    collectionId?: string;
    fileIds?: string[];
    /** Metadata filters, same shape POST /ask accepts (AND across keys, OR within values). */
    filters?: Record<string, string | string[]>;
    limit?: number;
  } = {},
): Promise<{
  data: SemanticSearchResult[];
  query: string;
  limit: number;
}> {
  const params = new URLSearchParams({ q });
  if (opts.collectionId) params.set("collection_id", opts.collectionId);
  if (opts.fileIds?.length) params.set("file_ids", opts.fileIds.join(","));
  if (opts.filters && Object.keys(opts.filters).length > 0) {
    params.set("filters", JSON.stringify(opts.filters));
  }
  if (opts.limit) params.set("limit", String(opts.limit));

  return request(`/api/v1/search?${params.toString()}`, {
    method: "GET",
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
  filters?: Record<string, string | string[]>;
  /** Prior turns replayed to the LLM so follow-ups stay in-thread. */
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface AskNonStreamResponse {
  answer: string;
  sources: AskSource[];
}

// Same-origin streaming (#42): the browser POSTs to its own /api/v1/ask —
// the SvelteKit proxy forwards unbuffered and injects the session JWT; no
// API key is ever read in the browser.
export async function askStream(
  input: AskInput,
  handlers: {
    onSources?: (sources: AskSource[]) => void;
    onChunk?: (text: string) => void;
    onError?: (message: string) => void;
  },
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch("/api/v1/ask", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...input, stream: true }),
    signal,
  });

  if (!res.ok || !res.body) {
    const errBody = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(
      typeof errBody.error === "string"
        ? errBody.error
        : (errBody.error?.message ?? "Ask request failed"),
    );
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

export async function ask(input: AskInput): Promise<AskNonStreamResponse> {
  return request<AskNonStreamResponse>("/api/v1/ask", {
    method: "POST",
    body: { ...input, stream: false },
  });
}
