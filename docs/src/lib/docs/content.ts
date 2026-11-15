const raw = String.raw;

export type Block =
  | { t: "p"; text: string }
  | { t: "h"; text: string }
  | { t: "note"; text: string }
  | { t: "code"; lang: string; text: string }
  | { t: "facts"; items: [string, string][] }
  | { t: "table"; head: string[]; rows: string[][] }
  | {
      t: "cards";
      items: { tag: string; title: string; text: string; href: string; link: string }[];
    }
  | {
      t: "steps";
      items: { title: string; text: string; code?: { lang: string; text: string } }[];
    }
  | { t: "methods"; items: { sig: string; desc: string; code: string }[] };

export interface Section {
  id: string;
  label: string;
  title: string;
  sub?: boolean;
  blocks: Block[];
}

const scopes = raw`read   — list and download files, search, ask questions
write  — upload, delete and reprocess files; manage collections`;

export const sections: Section[] = [
  {
    id: "access-methods",
    label: "How to use Kyro",
    title: "How to use Kyro",
    blocks: [
      {
        t: "p",
        text: "Kyro gives you three ways to work with your documents. All three talk to the same backend running on your server.",
      },
      {
        t: "cards",
        items: [
          {
            tag: "no code",
            title: "Dashboard",
            text: "A web UI built into Kyro. Upload files, manage collections, create API keys, view usage and ask questions without writing code.",
            href: "#dashboard",
            link: "Dashboard guide",
          },
          {
            tag: "recommended",
            title: "TypeScript SDK",
            text: "The official `@kyroinfra/kyro` package. Typed methods for files, collections and metadata, plus client-side `search`, `ask` and `askStream`.",
            href: "#sdk",
            link: "SDK reference",
          },
          {
            tag: "advanced",
            title: "HTTP API",
            text: "Raw REST endpoints, for other languages, curl scripts, or direct control over request shape and headers.",
            href: "#http-reference",
            link: "HTTP reference",
          },
        ],
      },
    ],
  },

  {
    id: "dashboard",
    label: "Dashboard",
    title: "Dashboard",
    blocks: [
      {
        t: "p",
        text: "Kyro ships with a built-in web dashboard at the root of your instance (for example `http://localhost:3000`). It is the fastest way to get started and needs no API calls.",
      },
      {
        t: "steps",
        items: [
          {
            title: "Register your organisation",
            text: "On first run, open your instance URL and register. This creates your organisation and owner account. Other users are added from the Settings page; registration locks after the first organisation is created.",
          },
          {
            title: "Create an API key",
            text: "Open API Keys in the sidebar and create a key with the scopes you need. The full key is shown once, so copy it immediately. You need it for the SDK and the HTTP API.",
            code: { lang: "scopes", text: scopes },
          },
          {
            title: "Upload and manage files",
            text: "The Files page supports drag-and-drop uploads, per-file pipeline status, downloading originals and adding files to collections. Extraction and embedding run automatically; failed files can be re-run from the file row.",
          },
          {
            title: "Organise with collections",
            text: "Collections group files so you can scope search and `/ask` to a set of documents, such as a matter, product or project. Create a collection, add files, and pass its ID in the SDK or API.",
          },
          {
            title: "Ask questions",
            text: "The Ask page is a chat interface for the `/ask` endpoint. Choose a scope (whole org or one collection), type a question and get a streamed answer with source citations. Useful for testing retrieval quality before building your own UI.",
          },
          {
            title: "Monitor usage",
            text: "The Usage page shows total requests, data in and out, storage used and a daily request chart. Switch between 7, 30 and 90-day windows.",
          },
        ],
      },
      {
        t: "note",
        text: "Dashboard vs API key: the dashboard authenticates with a session cookie (JWT). The API key is a separate credential used by the SDK and HTTP API. You manage keys in the dashboard but use them outside it.",
      },
    ],
  },

  {
    id: "sdk",
    label: "TypeScript SDK",
    title: "TypeScript SDK",
    blocks: [
      {
        t: "p",
        text: "`@kyroinfra/kyro` is the official client for Node.js and the browser. It wraps every HTTP endpoint in typed methods, handles streaming SSE responses, and throws typed errors you can catch and branch on. Current version: 2.0.0.",
      },
      {
        t: "facts",
        items: [
          ["Package", "@kyroinfra/kyro"],
          ["Latest version", "2.0.0"],
          ["Install", "npm i @kyroinfra/kyro"],
          ["Environments", "Node.js · Browser · Edge"],
          ["Default API version", "v1"],
        ],
      },
      { t: "code", lang: "shell", text: "npm i @kyroinfra/kyro" },
      {
        t: "code",
        lang: "typescript",
        text: raw`import { KyroClient } from "@kyroinfra/kyro";

const kyro = new KyroClient({
  baseURL: "http://localhost:3000/api/v1",
  apiKey:  "kyro_live_...",
});

// Upload a file — extraction + embedding run automatically
const file = await kyro.files.upload(blob, "report.pdf");

// Check the pipeline status (files.status)
const { status } = await kyro.files.getText(file.id);
// status: "pending" | "processing" | "ready" | "failed" | "skipped"`,
      },
      { t: "h", text: "Typical workflow" },
      { t: "p", text: "End to end: upload, tag, organise, ask." },
      {
        t: "code",
        lang: "typescript",
        text: raw`// 1. Upload — the pipeline runs automatically (extract → chunk → embed)
const file = await kyro.files.upload(pdfBlob, "agreement.pdf");

// 2. Tag with metadata
await kyro.files.setMetadata(file.id, {
  document_type: "contract",
  matter_number: "M-2024-001",
});

// 3. Add to a collection
await kyro.collections.addFiles(collectionId, { fileIds: [file.id] });

// 4. Wait for the pipeline to finish
let { status } = await kyro.files.getText(file.id);
while (status === "pending" || status === "processing") {
  await new Promise((r) => setTimeout(r, 2000));
  ({ status } = await kyro.files.getText(file.id));
}
if (status !== "ready") throw new Error("File ended in status " + status);

// 5. Ask — a grounded answer with source citations
const { answer, sources } = await kyro.ask({
  question: "What are the termination conditions?",
  collectionId,
});`,
      },
    ],
  },

  {
    id: "sdk-files",
    label: "Files",
    title: "SDK · Files",
    sub: true,
    blocks: [
      {
        t: "p",
        text: "All file operations live on `kyro.files`. The ingest pipeline (extract → chunk → embed) runs automatically on upload, and failed files re-run with `kyro.files.reprocess()`. Search and ask are client methods: `kyro.search`, `kyro.ask` and `kyro.askStream`.",
      },
      {
        t: "methods",
        items: [
          {
            sig: "kyro.files.upload(blob, filename)",
            desc: "Upload a file. Returns the file record including its ID and initial status. PDF, DOCX and TXT are extracted; CSV and JSON are stored with status `skipped`; other types are rejected with 415.",
            code: raw`const file = await kyro.files.upload(blob, "contract.pdf");
// file.id, file.status`,
          },
          {
            sig: "kyro.files.list(limit?, cursor?)",
            desc: "Paginated file list. Pass `pagination.nextCursor` as the cursor argument to fetch the next page.",
            code: raw`const { data, pagination } = await kyro.files.list(50);
if (pagination.hasMore) {
  const next = await kyro.files.list(50, pagination.nextCursor);
}`,
          },
          {
            sig: "kyro.files.download(fileId)",
            desc: "Download the original file as a Blob.",
            code: "const blob = await kyro.files.download(fileId);",
          },
          {
            sig: "kyro.files.delete(fileId)",
            desc: "Delete a file permanently: the record, its chunks, metadata and collection memberships, and the blob on disk all go. There is no soft delete.",
            code: raw`await kyro.files.delete(fileId);
// { message: "File deleted", id }`,
          },
          {
            sig: "kyro.files.getText(fileId)",
            desc: "Get the file's pipeline status and extracted text. Poll this after upload to know when the file is queryable.",
            code: raw`const { status, extractedText } = await kyro.files.getText(fileId);
// status: "pending" | "processing" | "ready" | "failed" | "skipped"`,
          },
          {
            sig: "kyro.files.reprocess(fileId)",
            desc: "Set the file back to `pending` and re-run the full pipeline (extract → chunk → embed). Use after a failure, or to pick up a new extractor.",
            code: raw`await kyro.files.reprocess(fileId);
// Sets the file back to "pending" and re-runs extraction + embedding`,
          },
          {
            sig: "kyro.files.setMetadata(fileId, meta)",
            desc: "Upsert arbitrary key-value metadata on a file. Non-destructive: keys not in the payload are left untouched.",
            code: raw`await kyro.files.setMetadata(fileId, {
  matter_number: "M-2024-001",
  document_type: "contract",
});`,
          },
          {
            sig: "kyro.files.getMetadata(fileId)",
            desc: "Return all metadata keys and values for a file.",
            code: "const meta = await kyro.files.getMetadata(fileId);",
          },
          {
            sig: "kyro.files.deleteMetadataKey(fileId, key)",
            desc: "Remove a single metadata key.",
            code: 'await kyro.files.deleteMetadataKey(fileId, "counterparty");',
          },
        ],
      },
    ],
  },

  {
    id: "sdk-collections",
    label: "Collections",
    title: "SDK · Collections",
    sub: true,
    blocks: [
      {
        t: "p",
        text: "All collection operations live on `kyro.collections`. A collection is a named group of files. Scope search and `/ask` to it by passing its ID.",
      },
      {
        t: "methods",
        items: [
          {
            sig: "kyro.collections.create({ name, description? })",
            desc: "Create a collection. `name` is required (1–255 chars); `description` is optional (up to 2000 chars). Duplicate names within an org are allowed.",
            code: raw`const col = await kyro.collections.create({
  name:        "Q4 Contracts",
  description: "All contracts signed in Q4 2024",
});`,
          },
          {
            sig: "kyro.collections.list()",
            desc: "List all collections. Each item includes `fileCount`, `embeddedCount`, `pendingCount` and `failedCount`.",
            code: "const collections = await kyro.collections.list();",
          },
          {
            sig: "kyro.collections.get(collectionId)",
            desc: "Get a collection with full status. `col.queryReady` is true when all files are embedded.",
            code: raw`const col = await kyro.collections.get(collectionId);
// col.queryReady — true when ready to search`,
          },
          {
            sig: "kyro.collections.update(collectionId, { name?, description? })",
            desc: "Update the collection name or description.",
            code: 'await kyro.collections.update(collectionId, { name: "Q4 Agreements" });',
          },
          {
            sig: "kyro.collections.delete(collectionId)",
            desc: "Delete a collection. The files themselves are not deleted.",
            code: "await kyro.collections.delete(collectionId);",
          },
          {
            sig: "kyro.collections.addFiles(collectionId, { fileIds })",
            desc: "Add up to 100 files to a collection in one call.",
            code: raw`await kyro.collections.addFiles(collectionId, {
  fileIds: [fileId1, fileId2],
});`,
          },
          {
            sig: "kyro.collections.listFiles(collectionId, limit?, offset?)",
            desc: "List files in a collection, offset-paginated. Each row carries the file's pipeline status.",
            code: raw`const { data, pagination } = await kyro.collections.listFiles(collectionId, 20, 0);
// offset-paginated: pagination is { total, limit, offset, hasMore }
// data[i].status — per-file pipeline status`,
          },
          {
            sig: "kyro.collections.removeFile(collectionId, fileId)",
            desc: "Remove a file from a collection without deleting it.",
            code: "await kyro.collections.removeFile(collectionId, fileId);",
          },
        ],
      },
    ],
  },

  {
    id: "sdk-search-ask",
    label: "Search & Ask",
    title: "SDK · Search & Ask",
    sub: true,
    blocks: [
      {
        t: "p",
        text: "Retrieval and question answering are client methods. Scope with `collectionId` or `fileIds`; passing both throws a client-side `TypeError` before any request. Omit both to search the whole org. `filters` (AND across keys, OR across values) combines with either scope.",
      },
      {
        t: "methods",
        items: [
          {
            sig: "kyro.search({ query })",
            desc: "Hybrid retrieval: pgvector cosine fused with `ts_rank` via Reciprocal Rank Fusion (k = 60). Returns chunk-level rows ranked by `rrfScore` (a small number; higher is better; there is no minimum-score filter). `limit` defaults to 10 and the server caps it at 50.",
            code: raw`const { data, query, limit } = await kyro.search({ query: "force majeure clause" });
// data[i]: { fileId, fileName, chunkIndex, content, rrfScore }`,
          },
          {
            sig: "kyro.search({ query, collectionId | fileIds })",
            desc: "Scope to one collection or to specific files. The two are mutually exclusive; passing both throws before any request.",
            code: raw`await kyro.search({
  query:        "termination rights",
  collectionId: collectionId,
});

await kyro.search({
  query:   "payment terms",
  fileIds: [fileId1, fileId2],
});`,
          },
          {
            sig: "kyro.search({ query, filters })",
            desc: "Metadata filters: a single string is an exact match, an array is an OR match. AND across keys, OR across values. Combinable with `collectionId` or `fileIds`.",
            code: raw`const res = await kyro.search({
  query: "indemnification obligations",
  filters: {
    document_type: "contract",                     // exact match
    matter_number: ["M-2024-001", "M-2024-002"],   // OR match
  },
});`,
          },
          {
            sig: "kyro.ask({ question })",
            desc: "Grounded answer with source citations. `topK` defaults to 8 (1–20) and the question is 1–2000 chars. Sources carry `fileId`, `fileName`, `chunkIndex`, `content` and `rrfScore`.",
            code: raw`const { answer, sources } = await kyro.ask({
  question:     "What is the total contract value across all agreements?",
  collectionId: collectionId,
});
// sources[i]: { fileId, fileName, chunkIndex, content, rrfScore }`,
          },
          {
            sig: "kyro.ask({ question, history })",
            desc: "Follow-up questions: pass the last turns as `history` (max 10, content 1–2000 chars each). History is replayed to the LLM verbatim as read-only context and never affects retrieval.",
            code: raw`const { answer } = await kyro.ask({
  question:     "Who are the parties?",
  collectionId: collectionId,
});

const followUp = await kyro.ask({
  question:     "Which of them indemnifies the other?",
  collectionId: collectionId,
  history: [
    { role: "user",      content: "Who are the parties?" },
    { role: "assistant", content: answer },
  ],
});`,
          },
          {
            sig: "kyro.askStream({ question })",
            desc: "Streaming variant: an async iterable of SSE events. One `sources` frame opens the stream, `chunk` frames carry the answer text, `done` ends it, and `error` arrives in-band if the LLM fails after the stream is open.",
            code: raw`for await (const event of kyro.askStream({ question: "Summarise the key risks." })) {
  switch (event.type) {
    case "sources": console.log("Sources:", event.sources); break;
    case "chunk":   process.stdout.write(event.text);       break;
    case "done":    console.log("\nDone");                  break;
    case "error":   console.error("Error:", event.message); break;
  }
}`,
          },
        ],
      },
    ],
  },

  {
    id: "sdk-ask",
    label: "Search & Ask (HTTP)",
    title: "Search & Ask — HTTP API",
    sub: true,
    blocks: [
      {
        t: "p",
        text: "Retrieval and question answering on the REST surface. Both accept `X-Api-Key` or `Authorization: Bearer`, and share the same scope rules: `collectionId` XOR `fileIds`, or org-wide when neither is given.",
      },
      { t: "h", text: "GET /api/v1/search" },
      {
        t: "p",
        text: "Ranked chunks without a generated answer. This is the same hybrid retrieval `/ask` uses: a `ts_rank` keyword arm fused with the pgvector cosine arm via Reciprocal Rank Fusion, optionally followed by cross-encoder reranking. Scope with `collection_id` or `file_ids`; `filters` takes a URL-encoded JSON object of metadata filters.",
      },
      {
        t: "code",
        lang: "shell",
        text: raw`curl "http://localhost:3000/api/v1/search?q=payment+terms&collection_id=c_xyz&limit=5" \
  -H "X-Api-Key: $API_KEY"`,
      },
      { t: "h", text: "POST /api/v1/ask" },
      {
        t: "p",
        text: "Ask a natural-language question and get an answer grounded in your documents, with source citations. `stream: true` (the default) answers over Server-Sent Events; `stream: false` returns one JSON body. `parseSSE` below stands for your own helper that yields each `data:` frame as parsed JSON; `askStream` in the SDK does this for you.",
      },
      {
        t: "code",
        lang: "non-streaming",
        text: raw`const res = await fetch("http://localhost:3000/api/v1/ask", {
  method: "POST",
  headers: { "X-Api-Key": process.env.KYRO_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({
    question:     "What is the total contract value?",
    collectionId: collectionId,
    stream:       false,
  }),
});
const { answer, sources } = await res.json();

// sources[i]: { fileId, fileName, chunkIndex, content, rrfScore }`,
      },
      {
        t: "code",
        lang: "streaming (SSE)",
        text: raw`const res = await fetch("http://localhost:3000/api/v1/ask", {
  method: "POST",
  headers: { "X-Api-Key": process.env.KYRO_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ question: "Summarise the risks." }),
});

for await (const event of parseSSE(res.body)) {
  switch (event.type) {
    case "sources": console.log(event.sources); break;
    case "chunk":   process.stdout.write(event.text); break;
    case "done":    console.log("\nDone"); break;
    case "error":   console.error(event.message); break;
  }
}`,
      },
      {
        t: "table",
        head: ["Option", "Type", "Default", "Description"],
        rows: [
          ["`question`", "string", "—", "The question to answer (1–2000 chars)"],
          ["`collectionId`", "string", "—", "Scope to a collection. Mutually exclusive with `fileIds`"],
          ["`fileIds`", "string[]", "—", "Scope to specific files (max 20). Mutually exclusive with `collectionId`"],
          ["`filters`", "object", "—", "Metadata key-value filters. AND across keys, OR across values"],
          ["`topK`", "number", "8", "Number of chunks to retrieve (1–20)"],
          ["`model`", "string", "server default", "Ollama model override"],
          ["`stream`", "boolean", "true", "Whether to stream the response as SSE"],
          ["`history`", "array", "—", "Up to 10 prior user/assistant turns for follow-ups. Replayed to the LLM, never affects retrieval"],
        ],
      },
    ],
  },

  {
    id: "sdk-errors",
    label: "Error handling",
    title: "SDK · Error handling",
    sub: true,
    blocks: [
      {
        t: "p",
        text: "All SDK methods throw typed errors. Import the class you want to catch; each maps to a distinct HTTP status code.",
      },
      {
        t: "code",
        lang: "typescript",
        text: raw`import {
  KyroApiError,
  KyroAuthError,
  KyroConflictError,
  KyroFileTooLargeError,
  KyroForbiddenError,
  KyroNotFoundError,
  KyroRateLimitError,
  KyroServiceUnavailableError,
  KyroStorageLimitError,
  KyroUnprocessableError,
  KyroUnsupportedMediaTypeError,
  KyroValidationError,
} from "@kyroinfra/kyro";

try {
  await kyro.files.upload(blob, "file.pdf");
} catch (err) {
  if (err instanceof KyroAuthError) {
    // 401 — invalid or missing API key
  } else if (err instanceof KyroForbiddenError) {
    // 403 — the API key lacks the required scope
  } else if (err instanceof KyroStorageLimitError) {
    // 507 — deployment storage cap reached
  } else if (err instanceof KyroNotFoundError) {
    // 404 — file or resource not found
  } else if (err instanceof KyroRateLimitError) {
    // 429 — slow down; err.retryAfter is the wait in seconds
    if (err.retryAfter) setTimeout(retry, err.retryAfter * 1000);
  } else if (err instanceof KyroValidationError) {
    // 400 — bad input; err.details has per-field messages
    console.error(err.details);
  } else if (err instanceof KyroConflictError) {
    // 409 — a duplicate or conflicting resource
  } else if (err instanceof KyroFileTooLargeError) {
    // 413 — upload exceeds the size limit
  } else if (err instanceof KyroUnsupportedMediaTypeError) {
    // 415 — unsupported content type (err.data.supportedTypes)
  } else if (err instanceof KyroUnprocessableError) {
    // 422 — the requested scope resolves to nothing
  } else if (err instanceof KyroServiceUnavailableError) {
    // 503 — server busy or a degraded dependency
  } else if (err instanceof KyroApiError) {
    // catch-all for anything unexpected
    console.error(err.status, err.code, err.message);
  }
}`,
      },
      {
        t: "table",
        head: ["Class", "HTTP status", "When it is thrown"],
        rows: [
          ["`KyroValidationError`", "400", "Bad input; `err.details` has per-field messages"],
          ["`KyroAuthError`", "401", "Missing or invalid API key"],
          ["`KyroForbiddenError`", "403", "The API key lacks the required scope"],
          ["`KyroNotFoundError`", "404", "File, collection or resource not found"],
          ["`KyroConflictError`", "409", "The file's ingest pipeline is already running"],
          ["`KyroFileTooLargeError`", "413", "Upload exceeds the 100 MB size limit"],
          ["`KyroUnsupportedMediaTypeError`", "415", "Unsupported content type; `err.data.supportedTypes` lists what is accepted"],
          ["`KyroUnprocessableError`", "422", "The requested scope resolves to nothing"],
          ["`KyroRateLimitError`", "429", "Rate limit hit; `err.retryAfter` is seconds to wait"],
          ["`KyroServiceUnavailableError`", "503", "Server busy or a degraded dependency"],
          ["`KyroStorageLimitError`", "507", "Deployment storage cap reached"],
          ["`KyroApiError`", "any", "Catch-all; `err.status`, `err.code` and `err.message` are available"],
        ],
      },
    ],
  },

  {
    id: "self-hosting",
    label: "Self-hosting",
    title: "Self-hosting",
    blocks: [
      {
        t: "p",
        text: "Kyro runs entirely on your own infrastructure. Postgres (with pgvector) stores files, chunks and embeddings, the API runs the ingest pipeline and webhook delivery in-process, and Ollama runs your embedding and chat models locally. Nothing leaves your network.",
      },
      {
        t: "steps",
        items: [
          {
            title: "Start the stack",
            text: "One command brings up Postgres, nginx, the Kyro API and the web dashboard. Migrations run at API startup under a Postgres advisory lock.",
            code: { lang: "shell", text: "./scripts/prod.sh" },
          },
          {
            title: "Pull the Ollama models",
            text: "Kyro uses `nomic-embed-text` for embeddings and `llama3.2` for answering questions. Set `OLLAMA_URL`, `EMBEDDING_MODEL` and `CHAT_MODEL` in your `.env` to use different models.",
            code: {
              lang: "shell",
              text: raw`ollama pull nomic-embed-text
ollama pull llama3.2`,
            },
          },
          {
            title: "Create an account and API key",
            text: "Register via `POST /api/v1/auth/register` (the first registration creates your organisation and owner), then create an API key from the dashboard or with `POST /api/v1/keys`. Keys carry one of two scopes.",
            code: { lang: "scopes", text: scopes },
          },
        ],
      },
    ],
  },

  {
    id: "auth",
    label: "Authentication",
    title: "Authentication",
    blocks: [
      {
        t: "p",
        text: "One gate covers every org-scoped route: send either an `X-Api-Key` header or a `Bearer` JWT. An explicit `X-Api-Key` wins when both are present, because it is the narrower credential. Key management (`/auth`, `/org`, `/keys`, `/usage`, `/webhooks`) uses the short-lived JWT from `/auth/login`.",
      },
      { t: "h", text: "API key: file operations" },
      { t: "code", lang: "http", text: "X-Api-Key: kyro_live_your_key_here" },
      { t: "h", text: "Bearer JWT: org and key management" },
      { t: "code", lang: "http", text: "Authorization: Bearer <token from /auth/login>" },
    ],
  },

  {
    id: "rag-pipeline",
    label: "RAG pipeline",
    title: "RAG pipeline",
    blocks: [
      {
        t: "p",
        text: "Every document goes through three stages before it can be queried. All processing runs on your server; no external API calls are made at any stage.",
      },
      {
        t: "steps",
        items: [
          {
            title: "Upload",
            text: "`POST /files` saves the file to disk and starts the in-process pipeline immediately. The file moves through `pending → processing → ready` (or `failed`, with the reason in `files.error`). Supported types: PDF, DOCX and TXT; CSV and JSON are stored without extraction (`skipped`).",
          },
          {
            title: "Extract",
            text: "The pipeline extracts text (PDF via `unpdf`, DOCX via `mammoth`), splits it into overlapping chunks (~1200 chars each) and stores them in Postgres. Poll `GET /files/:id/text` for status. Failed files re-run with `POST /files/:id/reprocess`.",
          },
          {
            title: "Embed",
            text: "Embedding is part of the same pipeline; there is no manual trigger. It calls your local Ollama embedding model (`nomic-embed-text` by default) and stores 768-dimensional vectors alongside each chunk in `pgvector`. When the file becomes queryable the `file.ready` webhook fires (or `file.failed` if anything went wrong).",
          },
        ],
      },
    ],
  },

  {
    id: "rag-ask",
    label: "/ask",
    title: "/ask — grounded answers",
    sub: true,
    blocks: [
      {
        t: "p",
        text: "Send a question, get a cited answer. Kyro retrieves the most relevant chunks via hybrid search, builds a grounded prompt, and streams the response from your local LLM. The LLM only sees what is in your documents.",
      },
      {
        t: "facts",
        items: [
          ["Retrieval", "ts_rank + pgvector → RRF"],
          ["Reranking", "Cross-encoder (opt-in)"],
          ["Response", "SSE stream (or JSON)"],
          ["Scope", "file IDs, collection, or entire org"],
        ],
      },
      {
        t: "code",
        lang: "typescript",
        text: raw`const res = await fetch("/api/v1/ask", {
  method: "POST",
  headers: { "X-Api-Key": process.env.KYRO_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({
    question: "What are the payment terms?",
    collectionId: "c_xyz",  // or fileIds: [...], or omit for org-wide
    topK: 8,
    stream: true,
  }),
});

for await (const event of parseSSE(res.body)) {
  if (event.type === "sources") console.log(event.sources);
  if (event.type === "chunk")   process.stdout.write(event.text);
  if (event.type === "done")    break;
}`,
      },
      {
        t: "table",
        head: ["SSE event type", "Payload"],
        rows: [
          ["`sources`", "Array of retrieved chunks with file name, chunk index, content and RRF score. Sent before the first answer token."],
          ["`chunk`", "A token fragment from the LLM. Accumulate these to build the full answer."],
          ["`done`", "Stream complete."],
          ["`error`", "LLM or retrieval error. Includes a `message` field."],
        ],
      },
    ],
  },

  {
    id: "rag-search",
    label: "/search",
    title: "/search — chunk retrieval",
    sub: true,
    blocks: [
      {
        t: "p",
        text: "Returns ranked chunks without generating an answer. Useful for building your own UI, debugging retrieval quality, or feeding results into your own pipeline. It uses the same hybrid retrieval as `/ask`: a `ts_rank` keyword arm over the generated tsvector, fused with pgvector cosine similarity via Reciprocal Rank Fusion, optionally followed by cross-encoder reranking (`RERANK_ENABLED`, off by default).",
      },
      {
        t: "code",
        lang: "shell",
        text: raw`curl "http://localhost:3000/api/v1/search?q=payment+terms&collection_id=c_xyz&limit=5" \
  -H "X-Api-Key: $API_KEY"`,
      },
    ],
  },

  {
    id: "metadata-filters",
    label: "Metadata filters",
    title: "Metadata filters",
    blocks: [
      {
        t: "p",
        text: "Every file can carry arbitrary key/value metadata, useful for tagging documents with fields like `matter_number`, `document_type`, `product` or `version`. Set metadata with `PUT /files/:id/metadata`, then pass a `filters` object to `/ask` to scope retrieval.",
      },
      {
        t: "code",
        lang: "set metadata",
        text: raw`curl -X PUT http://localhost:3000/api/v1/files/3f1c2a4b-0000-0000-0000-000000000000/metadata \
  -H "X-Api-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"matter_number": "M-2024-001", "document_type": "contract"}'`,
      },
      {
        t: "code",
        lang: "filter in /ask",
        text: raw`{
  "question": "What are the termination clauses?",
  "filters": {
    "matter_number": "M-2024-001",
    "document_type": ["contract", "amendment"]
  }
}`,
      },
      {
        t: "p",
        text: "Filters are AND across keys and OR across values. The example above matches files where `matter_number` is `M-2024-001` and `document_type` is either `contract` or `amendment`.",
      },
    ],
  },

  {
    id: "rate-limiting",
    label: "Rate limiting",
    title: "Rate limiting",
    blocks: [
      {
        t: "p",
        text: "The default limit is 100 requests per minute per API key, enforced by an in-memory sliding window inside each API process. It applies to the `files`, `search` and `ask` routes (`collections` is not rate-limited). Bearer-JWT requests, which carry no API key, are keyed by client IP instead. Replicas do not share a budget, a documented trade-off of the no-Redis architecture. When the window is exhausted the API answers `429` with a `retryAfter` value in seconds.",
      },
      {
        t: "code",
        lang: "json",
        text: raw`{
  "error": "Too many requests",
  "retryAfter": 42
}`,
      },
    ],
  },

  {
    id: "errors",
    label: "Error codes",
    title: "Error codes",
    blocks: [
      {
        t: "p",
        text: "Errors come in two shapes. Route handlers answer with the simple envelope; anything that reaches the central error handler returns the structured envelope (`stack` appears in development only).",
      },
      {
        t: "code",
        lang: "json — simple envelope",
        text: raw`{
  "error": "API key does not have write scope"
}`,
      },
      {
        t: "code",
        lang: "json — structured envelope",
        text: raw`{
  "error": {
    "message": "Unsupported file type: application/zip"
  }
}`,
      },
      {
        t: "table",
        head: ["Code", "Label", "Description"],
        rows: [
          ["`400`", "Bad Request", "Invalid input or missing required fields"],
          ["`401`", "Unauthorized", "Missing or invalid API key"],
          ["`403`", "Forbidden", "Insufficient scope for this operation; the key lacks the required read/write scope"],
          ["`404`", "Not Found", "Resource does not exist"],
          ["`409`", "Conflict", "The file's ingest pipeline is already running"],
          ["`413`", "Payload Too Large", "File exceeds the 100 MB size limit"],
          ["`415`", "Unsupported Media Type", "The file's type is neither extractable (PDF, DOCX, TXT) nor storable without extraction (CSV, JSON)"],
          ["`422`", "Unprocessable", "Empty scope: the collection has no embedded files, no files match the metadata filters, or the intersection of all constraints is empty"],
          ["`429`", "Too Many Requests", "Rate limit exceeded; the body carries `retryAfter` (seconds)"],
          ["`500`", "Internal Server Error", "Unexpected server-side error"],
          ["`503`", "Service Unavailable", "A dependency is degraded, typically the database (the health endpoint answers 503 when it is unreachable)"],
          ["`507`", "Insufficient Storage", "Deployment storage limit reached"],
        ],
      },
    ],
  },

  {
    id: "http-reference",
    label: "HTTP reference",
    title: "HTTP API reference",
    blocks: [
      {
        t: "p",
        text: "All endpoints are documented below. Authenticate file and search operations with your API key in the `X-Api-Key` header (a `Bearer` JWT works too). The base URL defaults to `http://localhost:3000/api/v1`; replace it with the host you deployed Kyro on.",
      },
      { t: "code", lang: "http", text: "X-Api-Key: kyro_live_your_key_here" },
    ],
  },
];
