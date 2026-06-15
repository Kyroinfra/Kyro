<script lang="ts">
  import { onMount } from "svelte";
  import Logo from "$lib/components/Logo.svelte";

  const openapiSpec = {
    openapi: "3.0.0",
    info: {
      title: "Kyro API",
      version: "2.0.0",
      description:
        "Self-hosted RAG API. Upload documents, embed them locally, and ask questions grounded in your own files — no data leaves your server.",
    },
    servers: [
      { url: "http://localhost:3000/api/v2" },
      { url: "https://your-kyro-instance.internal/api/v2" },
    ],
    tags: [
      {
        name: "Files",
        description:
          "Upload, list, download, delete, and extract text from files stored on your server.",
      },
      {
        name: "Embeddings",
        description:
          "Trigger chunk embedding via your local Ollama model and query embedded files.",
      },
      {
        name: "Collections",
        description:
          "Group files into named collections and query them as a unit.",
      },
      {
        name: "Health",
        description:
          "Check whether the Kyro backend and its dependencies are reachable.",
      },
    ],
    paths: {
      "/files": {
        get: {
          summary: "List files",
          tags: ["Files"],
          security: [{ apiKey: [] }],
          "x-scope": "read",
          parameters: [
            {
              name: "limit",
              in: "query",
              required: false,
              description: "Max results (default 100, max 100).",
              schema: { type: "integer" },
            },
            {
              name: "cursor",
              in: "query",
              required: false,
              description: "Pagination cursor from previous response.",
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": { description: "Paginated file list." },
            "401": { description: "Missing or invalid API key." },
          },
          "x-response-example": JSON.stringify({
            data: [
              {
                id: "f_abc123",
                name: "contract.pdf",
                mimeType: "application/pdf",
                sizeBytes: 204800,
                createdAt: "2025-01-15T12:00:00Z",
                extractionStatus: "completed",
              },
            ],
            pagination: { limit: 100, hasMore: false, nextCursor: null },
          }),
        },
        post: {
          summary: "Upload file",
          tags: ["Files"],
          security: [{ apiKey: [] }],
          "x-scope": "write",
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["file"],
                  properties: {
                    file: {
                      type: "string",
                      format: "binary",
                      description:
                        "The file to upload. PDF, DOCX, and TXT are supported for text extraction.",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description:
                "File uploaded. Text extraction queued automatically if Redis is available.",
            },
            "401": { description: "Missing or invalid API key." },
            "403": { description: "Storage quota exceeded." },
            "413": { description: "File exceeds the 100 MB limit." },
          },
          "x-response-example": JSON.stringify({
            id: "f_abc123",
            name: "contract.pdf",
            mimeType: "application/pdf",
            sizeBytes: 204800,
            createdAt: "2025-01-15T12:00:00Z",
            extractionStatus: "pending",
          }),
        },
      },
      "/files/{id}": {
        get: {
          summary: "Download file",
          tags: ["Files"],
          security: [{ apiKey: [] }],
          "x-scope": "read",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "File UUID.",
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "200": { description: "Binary file stream." },
            "401": { description: "Unauthorized." },
            "404": { description: "File not found." },
          },
          "x-response-example": "Binary file stream.",
        },
        delete: {
          summary: "Delete file",
          tags: ["Files"],
          security: [{ apiKey: [] }],
          "x-scope": "write",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "File UUID.",
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "200": { description: "File soft-deleted and removed from disk." },
            "401": { description: "Unauthorized." },
            "404": { description: "File not found." },
          },
          "x-response-example": JSON.stringify({
            message: "File deleted",
            id: "f_abc123",
          }),
        },
      },
      "/files/{id}/extract": {
        post: {
          summary: "Trigger text extraction",
          tags: ["Files"],
          security: [{ apiKey: [] }],
          "x-scope": "write",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "File UUID.",
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "202": { description: "Extraction queued (Redis available)." },
            "200": {
              description: "Extraction completed synchronously (no Redis).",
            },
            "400": { description: "File type not supported for extraction." },
            "409": { description: "Extraction already in progress." },
          },
          "x-response-example": JSON.stringify({
            fileId: "f_abc123",
            extractionStatus: "pending",
            message: "Extraction queued. Poll GET /files/:id/text for status.",
          }),
        },
      },
      "/files/{id}/text": {
        get: {
          summary: "Get extracted text",
          tags: ["Files"],
          security: [{ apiKey: [] }],
          "x-scope": "read",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "File UUID.",
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "200": { description: "Extraction status and text if available." },
            "404": { description: "File not found." },
          },
          "x-response-example": JSON.stringify({
            fileId: "f_abc123",
            extractionStatus: "completed",
            extractedText: "This agreement is entered into...",
          }),
        },
      },
      "/files/{id}/embed": {
        post: {
          summary: "Embed file chunks",
          tags: ["Embeddings"],
          security: [{ apiKey: [] }],
          "x-scope": "write",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "File UUID.",
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "200": { description: "Chunks embedded via local Ollama model." },
            "400": {
              description:
                "No extracted text available — run extraction first.",
            },
            "404": { description: "File not found." },
          },
          "x-response-example": JSON.stringify({
            fileId: "f_abc123",
            embeddingStatus: "completed",
            chunksCreated: 14,
          }),
        },
      },
      "/files/ask": {
        post: {
          summary: "Ask a question",
          tags: ["Embeddings"],
          security: [{ apiKey: [] }],
          "x-scope": "read",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["question"],
                  properties: {
                    question: {
                      type: "string",
                      description:
                        "The question to answer from your documents.",
                    },
                    fileIds: {
                      type: "array",
                      items: { type: "string", format: "uuid" },
                      description:
                        "Scope search to specific files. Omit to search the entire org.",
                    },
                    collectionId: {
                      type: "string",
                      format: "uuid",
                      description:
                        "Scope search to a collection. Mutually exclusive with fileIds.",
                    },
                    filters: {
                      type: "object",
                      description:
                        "Metadata key/value filters to scope the search. AND across keys, OR across values.",
                    },
                    topK: {
                      type: "integer",
                      description: "Chunks to retrieve (default 8, max 20).",
                    },
                    stream: {
                      type: "boolean",
                      description:
                        "Stream the answer as SSE events (default true).",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description:
                "SSE stream of sources, answer chunks, and done event.",
            },
            "422": {
              description: "No embedded files found matching the scope.",
            },
          },
          "x-response-example": `// SSE stream:\ndata: {"type":"sources","sources":[{"fileId":"...","fileName":"contract.pdf","content":"...","rrfScore":0.031}]}\ndata: {"type":"chunk","text":"According to [1], the payment terms..."}\ndata: {"type":"done"}`,
        },
      },
      "/files/semantic-search": {
        get: {
          summary: "Semantic search",
          tags: ["Embeddings"],
          security: [{ apiKey: [] }],
          "x-scope": "read",
          parameters: [
            {
              name: "q",
              in: "query",
              required: true,
              description: "Search query.",
              schema: { type: "string" },
            },
            {
              name: "limit",
              in: "query",
              required: false,
              description: "Max chunks returned (default 10, max 50).",
              schema: { type: "integer" },
            },
            {
              name: "file_ids",
              in: "query",
              required: false,
              description: "Comma-separated file UUIDs to scope the search.",
              schema: { type: "string" },
            },
            {
              name: "collection_id",
              in: "query",
              required: false,
              description: "Collection UUID to scope the search.",
              schema: { type: "string" },
            },
            {
              name: "min_score",
              in: "query",
              required: false,
              description: "Minimum RRF score threshold (default 0.01).",
              schema: { type: "number" },
            },
          ],
          responses: {
            "200": {
              description: "Ranked chunks from hybrid BM25 + vector retrieval.",
            },
            "400": {
              description: "Missing query or OLLAMA_URL not configured.",
            },
          },
          "x-response-example": JSON.stringify({
            data: [
              {
                fileId: "f_abc123",
                fileName: "contract.pdf",
                chunkIndex: 2,
                content: "Payment is due within 30 days...",
                rrfScore: 0.031,
              },
            ],
            query: "payment terms",
            limit: 10,
            minScore: 0.01,
          }),
        },
      },
      "/collections": {
        get: {
          summary: "List collections",
          tags: ["Collections"],
          security: [{ apiKey: [] }],
          "x-scope": "read",
          parameters: [],
          responses: {
            "200": {
              description: "Collections with embedding status summary.",
            },
          },
          "x-response-example": JSON.stringify([
            {
              id: "c_xyz",
              name: "Q1 Contracts",
              slug: "q1-contracts",
              fileCount: 12,
              embeddedCount: 11,
              pendingCount: 1,
              failedCount: 0,
              createdAt: "2025-01-10T09:00:00Z",
            },
          ]),
        },
        post: {
          summary: "Create collection",
          tags: ["Collections"],
          security: [{ apiKey: [] }],
          "x-scope": "write",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name"],
                  properties: {
                    name: {
                      type: "string",
                      description: "Collection name (unique within your org).",
                    },
                    description: {
                      type: "string",
                      description: "Optional description.",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Collection created." },
          },
          "x-response-example": JSON.stringify({
            id: "c_xyz",
            name: "Q1 Contracts",
            slug: "q1-contracts",
            description: null,
            createdAt: "2025-01-10T09:00:00Z",
          }),
        },
      },
      "/collections/{id}/files": {
        post: {
          summary: "Add files to collection",
          tags: ["Collections"],
          security: [{ apiKey: [] }],
          "x-scope": "write",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Collection UUID.",
              schema: { type: "string", format: "uuid" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["fileIds"],
                  properties: {
                    fileIds: {
                      type: "array",
                      items: { type: "string", format: "uuid" },
                      description: "Up to 100 file UUIDs to add.",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Files added." },
            "400": {
              description: "Some file IDs not found or not owned by your org.",
            },
          },
          "x-response-example": JSON.stringify({
            added: 3,
            collectionId: "c_xyz",
          }),
        },
      },
      "/health": {
        get: {
          summary: "Health check",
          tags: ["Health"],
          security: [],
          parameters: [],
          responses: {
            "200": { description: "All dependencies healthy." },
            "503": { description: "One or more dependencies degraded." },
          },
          "x-response-example": JSON.stringify({
            status: "ok",
            database: "connected",
            redis: "connected",
            uptime: 86400,
          }),
        },
      },
    },
  };

  interface SchemaProperty {
    type?: string;
    format?: string;
    description?: string;
    enum?: string[];
    minLength?: number;
    maxLength?: number;
    nullable?: boolean;
    items?: SchemaProperty;
    default?: unknown;
  }

  interface Schema {
    type?: string;
    required?: string[];
    properties?: Record<string, SchemaProperty>;
  }

  interface Parameter {
    name: string;
    in: string;
    required?: boolean;
    description?: string;
    schema?: SchemaProperty;
  }

  interface RequestBody {
    required?: boolean;
    content?: Record<string, { schema?: Schema }>;
  }

  interface ResponseEntry {
    description?: string;
  }

  interface Operation {
    summary?: string;
    description?: string;
    tags?: string[];
    security?: Array<Record<string, string[]>>;
    parameters?: Parameter[];
    requestBody?: RequestBody;
    responses?: Record<string, ResponseEntry>;
    "x-scope"?: string | null;
    "x-body-description"?: string | null;
    "x-response-example"?: string;
  }

  interface Endpoint {
    method: string;
    path: string;
    op: Operation;
    id: string;
  }

  const TAG_ORDER = ["Files", "Embeddings", "Collections", "Health"];

  const TAG_IDS: Record<string, string> = {
    Files: "files",
    Embeddings: "embeddings",
    Collections: "collections",
    Health: "health",
  };

  const endpointsByTag: Record<string, Endpoint[]> = {};

  for (const [path, pathItem] of Object.entries(
    (openapiSpec as any).paths || {},
  )) {
    for (const [method, operation] of Object.entries(
      pathItem as Record<string, unknown>,
    )) {
      if (["parameters", "summary", "description"].includes(method)) continue;
      const op = operation as Operation;
      const tag = op.tags?.[0] || "Other";
      const tagId = TAG_IDS[tag] || tag.toLowerCase();
      if (!endpointsByTag[tagId]) endpointsByTag[tagId] = [];
      const id = `${tagId}-${method}-${path.replace(/\//g, "-").replace(/[{}]/g, "")}`;
      endpointsByTag[tagId].push({
        method: method.toUpperCase(),
        path,
        op,
        id,
      });
    }
  }

  const allTags = TAG_ORDER.map((t) => ({
    label: t,
    id: TAG_IDS[t] || t.toLowerCase(),
    endpoints: endpointsByTag[TAG_IDS[t] || t.toLowerCase()] || [],
  })).filter((t) => t.endpoints.length > 0);

  const staticSections = [
    { id: "overview", label: "Overview" },
    { id: "self-hosting", label: "Self-hosting" },
    { id: "auth", label: "Authentication" },
    { id: "rag-pipeline", label: "RAG Pipeline" },
    { id: "rag-ask", label: "↳ /ask" },
    { id: "rag-search", label: "↳ semantic-search" },
    { id: "metadata-filters", label: "Metadata Filters" },
    { id: "rate-limiting", label: "Rate Limiting" },
    { id: "errors", label: "Error Codes" },
    { id: "http-reference", label: "HTTP Reference" },
  ];

  function getAuthType(op: Operation): "bearer" | "apiKey" | "none" {
    if (!op.security || op.security.length === 0) return "none";
    if (op.security.some((s) => "bearerAuth" in s)) return "bearer";
    if (op.security.some((s) => "apiKey" in s)) return "apiKey";
    return "none";
  }

  function getScopeRequired(op: Operation): string | null {
    return op["x-scope"] || null;
  }

  interface ParsedSchema {
    fields: Array<{
      name: string;
      type: string;
      required: boolean;
      description: string;
      enum?: string[];
      default?: unknown;
    }>;
    isFormData: boolean;
    contentType: string;
  }

  function parseRequestBody(op: Operation): ParsedSchema | null {
    if (!op.requestBody?.content) return null;
    const content = op.requestBody.content;

    if (content["multipart/form-data"]) {
      const schema = content["multipart/form-data"].schema;
      const required = schema?.required || [];
      const fields = Object.entries(schema?.properties || {}).map(
        ([name, prop]) => ({
          name,
          type:
            (prop as SchemaProperty).format === "binary"
              ? "File (binary)"
              : (prop as SchemaProperty).type || "string",
          required: required.includes(name),
          description: (prop as SchemaProperty).description || "",
          enum: (prop as SchemaProperty).enum,
          default: (prop as SchemaProperty).default,
        }),
      );
      return {
        fields,
        isFormData: true,
        contentType: "multipart/form-data",
      };
    }

    if (content["application/json"]) {
      const schema = content["application/json"].schema;
      const required = schema?.required || [];
      const fields = Object.entries(schema?.properties || {}).map(
        ([name, prop]) => ({
          name,
          type: formatType(prop as SchemaProperty),
          required: required.includes(name),
          description: (prop as SchemaProperty).description || "",
          enum: (prop as SchemaProperty).enum,
          default: (prop as SchemaProperty).default,
        }),
      );
      return {
        fields,
        isFormData: false,
        contentType: "application/json",
      };
    }

    return null;
  }

  function formatType(prop: SchemaProperty): string {
    if (prop.type === "array" && prop.items)
      return `${formatType(prop.items)}[]`;
    if (prop.format) return `${prop.type} (${prop.format})`;
    return prop.type || "any";
  }

  function generateCurl(ep: Endpoint): string {
    const authType = getAuthType(ep.op);
    const body = parseRequestBody(ep.op);
    const baseUrl = "http://localhost:3000/api/v2";

    const lines: string[] = [`curl -X ${ep.method} \\`];
    lines.push(`  "${baseUrl}${ep.path}" \\`);

    if (authType === "bearer") {
      lines.push(`  -H "Authorization: Bearer $JWT_TOKEN" \\`);
    } else if (authType === "apiKey") {
      lines.push(`  -H "X-Api-Key: $API_KEY" \\`);
    }

    if (body?.isFormData) {
      lines.push(`  -F "file=@./your-file.pdf"`);
    } else if (body) {
      lines.push(`  -H "Content-Type: application/json" \\`);
      const bodyObj: Record<string, unknown> = {};
      for (const f of body.fields) {
        if (f.required)
          bodyObj[f.name] =
            f.default ??
            (f.type.includes("string")
              ? `"${f.name}_value"`
              : f.type.includes("array")
                ? []
                : "value");
      }
      lines.push(
        `  -d '${JSON.stringify(bodyObj, null, 2).replace(/\n/g, "\n  ")}'`,
      );
    }

    const last = lines[lines.length - 1];
    if (last.endsWith(" \\")) lines[lines.length - 1] = last.slice(0, -2);
    return lines.join("\n");
  }

  function generateFetch(ep: Endpoint): string {
    const authType = getAuthType(ep.op);
    const body = parseRequestBody(ep.op);
    const baseUrl = "http://localhost:3000/api/v2";

    const headers: Record<string, string> = {};
    if (authType === "bearer") headers["Authorization"] = "Bearer JWT_TOKEN";
    else if (authType === "apiKey") headers["X-Api-Key"] = "API_KEY";
    if (body && !body.isFormData) headers["Content-Type"] = "application/json";

    const headersStr = JSON.stringify(headers, null, 2)
      .replace(/"([^"]+)":/g, "$1:")
      .replace(/"/g, "'");

    let bodyStr = "";
    if (body?.isFormData) {
      bodyStr = `\n  const form = new FormData();\n  form.append('file', file);\n`;
    } else if (body) {
      const bodyObj: Record<string, unknown> = {};
      for (const f of body.fields) {
        bodyObj[f.name] =
          f.default ??
          (f.type.includes("string")
            ? `${f.name}_value`
            : f.type.includes("array")
              ? []
              : "value");
      }
      bodyStr = `\n  const payload = ${JSON.stringify(bodyObj, null, 2).replace(/\n/g, "\n  ")};\n`;
    }

    const fetchBody = body
      ? body.isFormData
        ? ",\n  body: form"
        : ",\n  body: JSON.stringify(payload)"
      : "";

    return `const response = await fetch('${baseUrl}${ep.path}', {
  method: '${ep.method}',
  headers: ${headersStr}${fetchBody}
});${bodyStr ? `\n${bodyStr.trimEnd()}` : ""}

const data = await response.json();`;
  }

  function formatResponseExample(raw: string | undefined): string {
    if (!raw) return "";
    if (
      raw.startsWith("Binary") ||
      raw.includes("No Content") ||
      raw.startsWith("//")
    )
      return raw;
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  }

  function getStatusBadgeClass(code: string): string {
    const n = parseInt(code);
    if (n >= 200 && n < 300) return "status-2xx";
    if (n >= 400 && n < 500) return "status-4xx";
    if (n >= 500) return "status-5xx";
    return "";
  }

  function getStatusLabel(code: string, desc: string | undefined): string {
    return desc || code;
  }

  let copiedId = $state<string | null>(null);

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    copiedId = id;
    setTimeout(() => (copiedId = null), 2000);
  }

  let activeTab = $state<Record<string, "curl" | "fetch">>({});

  function getTab(id: string): "curl" | "fetch" {
    return activeTab[id] ?? "curl";
  }

  function setTab(id: string, tab: "curl" | "fetch") {
    activeTab = { ...activeTab, [id]: tab };
  }

  let sidebarOpen = $state(false);
  let activeSection = $state("overview");

  onMount(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            activeSection = entry.target.id;
            const link = document.querySelector(
              `.sidebar a[href="#${entry.target.id}"]`,
            );
            link?.scrollIntoView({
              block: "nearest",
              behavior: "smooth",
            });
            break;
          }
        }
      },
      { rootMargin: "-80px 0px -55% 0px", threshold: 0 },
    );
    document
      .querySelectorAll(".doc-section, .endpoint-section")
      .forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  });

  const errorCodes = [
    {
      code: "400",
      label: "Bad Request",
      desc: "Invalid input or missing required fields",
    },
    {
      code: "401",
      label: "Unauthorized",
      desc: "Missing or invalid API key",
    },
    {
      code: "403",
      label: "Forbidden",
      desc: "Insufficient scope or storage quota exceeded",
    },
    { code: "404", label: "Not Found", desc: "Resource does not exist" },
    { code: "409", label: "Conflict", desc: "Operation already in progress" },
    {
      code: "413",
      label: "Payload Too Large",
      desc: "File exceeds the 100 MB size limit",
    },
    {
      code: "422",
      label: "Unprocessable",
      desc: "No embedded files found for the requested scope — embed files first",
    },
    {
      code: "429",
      label: "Too Many Requests",
      desc: "Rate limit exceeded — check Retry-After header",
    },
    {
      code: "500",
      label: "Internal Server Error",
      desc: "Unexpected server-side error",
    },
  ];
</script>

<svelte:head>
  <title>API Reference — Kyro</title>
</svelte:head>

<div class="page">
  <!-- ── Top bar ── -->
  <header class="topbar">
    <div class="topbar-left">
      <button
        class="hamburger"
        onclick={() => (sidebarOpen = !sidebarOpen)}
        aria-label="Open menu"
        aria-expanded={sidebarOpen}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      <a href="/" class="logo">
        <Logo size={20} />
        <span>kyro</span>
      </a>
      <span class="topbar-divider">/</span>
      <span class="topbar-label">API Reference</span>
    </div>
    <nav class="topbar-nav">
      <a
        href="https://github.com/Kyroinfra/Kyro"
        target="_blank"
        rel="noopener noreferrer"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"
          />
        </svg>
        github
      </a>
    </nav>
  </header>

  <div class="layout">
    <!-- ── Overlay ── -->
    {#if sidebarOpen}
      <div
        class="overlay"
        onclick={() => (sidebarOpen = false)}
        role="presentation"
      ></div>
    {/if}

    <!-- ── Sidebar ── -->
    <aside class="sidebar" class:open={sidebarOpen}>
      <div class="sidebar-inner">
        <div class="sidebar-close-row">
          <span class="sidebar-heading">docs</span>
          <button class="sidebar-close" onclick={() => (sidebarOpen = false)}
            >✕</button
          >
        </div>

        <div class="sidebar-group">
          <span class="sidebar-group-label">General</span>
          {#each staticSections as s}
            <a
              href="#{s.id}"
              class="sidebar-link"
              class:active={activeSection === s.id}
              onclick={() => (sidebarOpen = false)}>{s.label}</a
            >
          {/each}
        </div>

        {#each allTags as tag}
          <div class="sidebar-group">
            <span class="sidebar-group-label">{tag.label}</span>
            {#each tag.endpoints as ep}
              <a
                href="#{ep.id}"
                class="sidebar-endpoint"
                class:active={activeSection === ep.id}
                onclick={() => (sidebarOpen = false)}
              >
                <span class="sidebar-method method-{ep.method.toLowerCase()}"
                  >{ep.method}</span
                >
                <span class="sidebar-path"
                  >{ep.path.replace("/api/v2", "")}</span
                >
              </a>
            {/each}
          </div>
        {/each}
      </div>
    </aside>

    <!-- ── Main content ── -->
    <main class="content">
      <!-- OVERVIEW -->
      <section id="overview" class="doc-section">
        <div class="section-eyebrow">
          v{(openapiSpec as any).info.version}
        </div>
        <h1 class="section-hero">{(openapiSpec as any).info.title}</h1>
        <p class="section-lead">
          {(openapiSpec as any).info.description}
        </p>

        <div class="info-grid">
          <div class="info-card">
            <span class="info-label">Default URL</span>
            <code class="info-value">http://localhost:3000/api/v2</code>
          </div>
          <div class="info-card">
            <span class="info-label">License</span>
            <code class="info-value">MIT — free to self-host</code>
          </div>
          <div class="info-card">
            <span class="info-label">Spec format</span>
            <code class="info-value"
              >OpenAPI {(openapiSpec as any).openapi}</code
            >
          </div>
          <div class="info-card">
            <span class="info-label">Auth</span>
            <code class="info-value">X-Api-Key</code>
          </div>
        </div>

        <div class="spec-download">
          <a href="/openapi.yaml" target="_blank" class="spec-link">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              ><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline
                points="7 10 12 15 17 10"
              /><line x1="12" y1="15" x2="12" y2="3" /></svg
            >
            Download OpenAPI YAML
          </a>
        </div>
      </section>

      <!-- SELF-HOSTING -->
      <section id="self-hosting" class="doc-section">
        <h2 class="section-title">Self-hosting</h2>
        <p class="section-desc">
          Kyro runs entirely on your own infrastructure. Postgres stores files
          and metadata, Redis queues background jobs, and Ollama runs your
          embedding and chat models locally. Nothing leaves your network.
        </p>

        <div class="steps">
          <div class="step">
            <div class="step-num">01</div>
            <div class="step-body">
              <h4>Start the stack</h4>
              <p class="section-desc" style="margin-bottom: 10px">
                One command brings up Postgres, Redis, and the Kyro API server.
              </p>
              <div class="code-block">
                <div class="code-toolbar">
                  <span class="code-lang">shell</span>
                  <button
                    class="copy-btn"
                    onclick={() =>
                      copy("docker compose up -d", "self-host-start")}
                  >
                    {copiedId === "self-host-start" ? "✓ copied" : "copy"}
                  </button>
                </div>
                <pre><code>docker compose up -d</code></pre>
              </div>
            </div>
          </div>

          <div class="step">
            <div class="step-num">02</div>
            <div class="step-body">
              <h4>Pull an Ollama model</h4>
              <p class="section-desc" style="margin-bottom: 10px">
                Kyro uses <code>nomic-embed-text</code> for embeddings and
                <code>llama3.2</code>
                for answering questions. Set <code>OLLAMA_URL</code>,
                <code>EMBEDDING_MODEL</code>, and <code>CHAT_MODEL</code> in
                your <code>.env</code> to use different models.
              </p>
              <div class="code-block">
                <div class="code-toolbar">
                  <span class="code-lang">shell</span>
                  <button
                    class="copy-btn"
                    onclick={() =>
                      copy(
                        "ollama pull nomic-embed-text\nollama pull llama3.2",
                        "self-host-models",
                      )}
                  >
                    {copiedId === "self-host-models" ? "✓ copied" : "copy"}
                  </button>
                </div>
                <pre><code
                    >ollama pull nomic-embed-text
ollama pull llama3.2</code
                  ></pre>
              </div>
            </div>
          </div>

          <div class="step">
            <div class="step-num">03</div>
            <div class="step-body">
              <h4>Create an account and API key</h4>
              <p class="section-desc" style="margin-bottom: 10px">
                Register via <code>POST /api/v2/auth/register</code>, then
                create an API key from the dashboard or via
                <code>POST /api/v2/keys</code>. Keys carry one of three scopes.
              </p>
              <div class="code-block">
                <div class="code-toolbar">
                  <span class="code-lang">scopes</span>
                </div>
                <pre><code
                    >read   — list files, search, ask questions
write  — upload, delete, embed files
admin  — full access including key management</code
                  ></pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- AUTH -->
      <section id="auth" class="doc-section">
        <h2 class="section-title">Authentication</h2>
        <p class="section-desc">
          File and search endpoints use API keys. Dashboard and key-management
          endpoints use a short-lived JWT obtained from <code>/auth/login</code
          >.
        </p>

        <div class="sdk-methods">
          <div class="sdk-method">
            <div class="sdk-method-header">
              <code class="sdk-method-name"
                >X-Api-Key header — file operations</code
              >
              <span class="auth-badge auth-apikey">API Key</span>
            </div>
            <div class="code-block">
              <div class="code-toolbar">
                <span class="code-lang">http</span>
                <button
                  class="copy-btn"
                  onclick={() =>
                    copy("X-Api-Key: kyro_live_your_key_here", "auth-apikey")}
                >
                  {copiedId === "auth-apikey" ? "✓" : "copy"}
                </button>
              </div>
              <pre><code>X-Api-Key: kyro_live_your_key_here</code></pre>
            </div>
          </div>

          <div class="sdk-method">
            <div class="sdk-method-header">
              <code class="sdk-method-name"
                >Authorization header — org & key management</code
              >
              <span class="auth-badge auth-bearer">Bearer JWT</span>
            </div>
            <div class="code-block">
              <div class="code-toolbar">
                <span class="code-lang">http</span>
                <button
                  class="copy-btn"
                  onclick={() =>
                    copy(
                      "Authorization: Bearer <token from /auth/login>",
                      "auth-bearer",
                    )}
                >
                  {copiedId === "auth-bearer" ? "✓" : "copy"}
                </button>
              </div>
              <pre><code
                  >Authorization: Bearer &lt;token from /auth/login&gt;</code
                ></pre>
            </div>
          </div>
        </div>
      </section>

      <!-- RAG PIPELINE -->
      <section id="rag-pipeline" class="doc-section">
        <h2 class="section-title">RAG Pipeline</h2>
        <p class="section-desc">
          Every document goes through three stages before it can be queried. All
          processing runs on your server — no external API calls are made at any
          stage.
        </p>

        <div class="steps">
          <div class="step">
            <div class="step-num">01</div>
            <div class="step-body">
              <h4>Upload</h4>
              <p class="section-desc">
                <code>POST /files</code> saves the file to disk and, if Redis is
                running, automatically queues text extraction in the background.
                Supported types: <strong>PDF, DOCX, TXT</strong>.
              </p>
            </div>
          </div>

          <div class="step">
            <div class="step-num">02</div>
            <div class="step-body">
              <h4>Extract</h4>
              <p class="section-desc">
                The BullMQ worker pulls text from the file, splits it into
                overlapping chunks (~1200 chars each), and stores them in
                Postgres. Poll <code>GET /files/:id/text</code> for status.
                Re-trigger manually with <code>POST /files/:id/extract</code>.
              </p>
            </div>
          </div>

          <div class="step">
            <div class="step-num">03</div>
            <div class="step-body">
              <h4>Embed</h4>
              <p class="section-desc">
                After extraction, the worker calls your local Ollama embedding
                model (<code>nomic-embed-text</code> by default) and stores
                768-dimensional vectors alongside each chunk in
                <code>pgvector</code>. Trigger manually with
                <code>POST /files/:id/embed</code>.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- RAG ASK -->
      <section id="rag-ask" class="doc-section">
        <h2 class="section-title">/ask — grounded answers</h2>
        <p class="section-desc">
          Send a question, get a cited answer. Kyro retrieves the most relevant
          chunks via hybrid search, builds a grounded prompt, and streams the
          response from your local LLM. The LLM only sees what is in your
          documents — it cannot fabricate facts from outside them.
        </p>

        <div class="info-grid" style="margin-bottom: 20px">
          <div class="info-card">
            <span class="info-label">Retrieval</span>
            <code class="info-value">BM25 + pgvector → RRF</code>
          </div>
          <div class="info-card">
            <span class="info-label">Reranking</span>
            <code class="info-value">Cross-encoder via Ollama</code>
          </div>
          <div class="info-card">
            <span class="info-label">Response</span>
            <code class="info-value">SSE stream (or JSON)</code>
          </div>
          <div class="info-card">
            <span class="info-label">Scope</span>
            <code class="info-value">file IDs, collection, or entire org</code>
          </div>
        </div>

        <div class="code-block">
          <div class="code-toolbar">
            <span class="code-lang">typescript</span>
            <button
              class="copy-btn"
              onclick={() =>
                copy(
                  `const res = await fetch('/api/v2/files/ask', {
  method: 'POST',
  headers: { 'X-Api-Key': process.env.KYRO_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: 'What are the payment terms?',
    collectionId: 'c_xyz',  // or fileIds: [...], or omit for org-wide
    topK: 8,
    stream: true,
  }),
});

for await (const event of parseSSE(res)) {
  if (event.type === 'sources')  console.log(event.sources);
  if (event.type === 'chunk')    process.stdout.write(event.text);
  if (event.type === 'done')     break;
}`,
                  "rag-ask-example",
                )}
            >
              {copiedId === "rag-ask-example" ? "✓ copied" : "copy"}
            </button>
          </div>
          <pre><code
              ><span class="ck">const</span> res = <span class="ck">await</span
              > <span class="cs">fetch</span>(<span class="cs"
                >'/api/v2/files/ask'</span
              >, {"{"}
  method: <span class="cs">'POST'</span>,
  headers: {"{"} <span class="cs">'X-Api-Key'</span>: process.env.<span
                class="ck">KYRO_KEY</span
              >, <span class="cs">'Content-Type'</span>: <span class="cs"
                >'application/json'</span
              > {"}"},
  body: JSON.<span class="cs">stringify</span>({"{"} 
    question: <span class="cs">'What are the payment terms?'</span>,
    collectionId: <span class="cs">'c_xyz'</span>,  <span class="c-comment"
                >// or fileIds: [...], or omit for org-wide</span
              >
    topK: <span class="cs">8</span>,
    stream: <span class="ck">true</span>,
  {"}"}),
{"}"});

<span class="ck">for await</span> (<span class="ck">const</span> event <span
                class="ck">of</span
              > <span class="cs">parseSSE</span>(res)) {"{"}
  <span class="ck">if</span> (event.type === <span class="cs">'sources'</span
              >)  console.log(event.sources);
  <span class="ck">if</span> (event.type === <span class="cs">'chunk'</span
              >)    process.stdout.write(event.text);
  <span class="ck">if</span> (event.type === <span class="cs">'done'</span
              >)     <span class="ck">break</span>;
{"}"}</code
            ></pre>
        </div>

        <div class="table-scroll" style="margin-top: 20px">
          <table class="ref-table">
            <thead>
              <tr><th>SSE event type</th><th>Payload</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><code>sources</code></td>
                <td
                  >Array of retrieved chunks with file name, chunk index,
                  content, and RRF score. Sent before the first answer token.</td
                >
              </tr>
              <tr>
                <td><code>chunk</code></td>
                <td
                  >A token fragment from the LLM. Accumulate these to build the
                  full answer.</td
                >
              </tr>
              <tr>
                <td><code>done</code></td>
                <td>Stream complete.</td>
              </tr>
              <tr>
                <td><code>error</code></td>
                <td
                  >LLM or retrieval error. Includes a <code>message</code> field.</td
                >
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- RAG SEARCH -->
      <section id="rag-search" class="doc-section">
        <h2 class="section-title">/semantic-search — chunk retrieval</h2>
        <p class="section-desc">
          Returns ranked chunks without generating an answer. Useful for
          building your own UI, debugging retrieval quality, or feeding results
          into your own pipeline. Uses the same two-phase hybrid retrieval as <code
            >/ask</code
          >: BM25 keyword matching fused with pgvector cosine similarity via
          Reciprocal Rank Fusion, optionally followed by cross-encoder
          reranking.
        </p>

        <div class="code-block">
          <div class="code-toolbar">
            <span class="code-lang">shell</span>
            <button
              class="copy-btn"
              onclick={() =>
                copy(
                  `curl "http://localhost:3000/api/v2/files/semantic-search?q=payment+terms&collection_id=c_xyz&limit=5" \\
  -H "X-Api-Key: $API_KEY"`,
                  "rag-search-example",
                )}
            >
              {copiedId === "rag-search-example" ? "✓ copied" : "copy"}
            </button>
          </div>
          <pre><code
              >curl "http://localhost:3000/api/v2/files/semantic-search?q=payment+terms&collection_id=c_xyz&limit=5" \
  -H "X-Api-Key: $API_KEY"</code
            ></pre>
        </div>
      </section>

      <!-- METADATA FILTERS -->
      <section id="metadata-filters" class="doc-section">
        <h2 class="section-title">Metadata Filters</h2>
        <p class="section-desc">
          Every file can carry arbitrary key/value metadata — useful for tagging
          documents with vertical-specific fields like
          <code>matter_number</code>, <code>document_type</code>,
          <code>product</code>, or <code>version</code>. Set metadata with
          <code>PUT /files/:id/metadata</code>, then pass a <code>filters</code>
          object to <code>/ask</code> to scope retrieval.
        </p>

        <div class="code-block" style="margin-bottom: 16px">
          <div class="code-toolbar">
            <span class="code-lang">set metadata</span>
            <button
              class="copy-btn"
              onclick={() =>
                copy(
                  `curl -X PUT http://localhost:3000/api/v2/files/f_abc123/metadata \\
  -H "X-Api-Key: $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"matter_number": "M-2024-001", "document_type": "contract"}'`,
                  "meta-set",
                )}
            >
              {copiedId === "meta-set" ? "✓ copied" : "copy"}
            </button>
          </div>
          <pre><code
              >curl -X PUT http://localhost:3000/api/v2/files/f_abc123/metadata \
  -H "X-Api-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"{"}\"matter_number\": \"M-2024-001\", \"document_type\": \"contract\"{"}"}'</code
            ></pre>
        </div>

        <div class="code-block">
          <div class="code-toolbar">
            <span class="code-lang">filter in /ask</span>
            <button
              class="copy-btn"
              onclick={() =>
                copy(
                  `{
  "question": "What are the termination clauses?",
  "filters": {
    "matter_number": "M-2024-001",
    "document_type": ["contract", "amendment"]
  }
}`,
                  "meta-filter",
                )}
            >
              {copiedId === "meta-filter" ? "✓ copied" : "copy"}
            </button>
          </div>
          <pre><code
              >{`{
  "question": "What are the termination clauses?",
  "filters": {
    "matter_number": "M-2024-001",
    "document_type": ["contract", "amendment"]
  }
}`}</code
            ></pre>
        </div>

        <p class="section-desc" style="margin-top: 16px">
          Filters are <strong>AND across keys</strong> and
          <strong>OR across values</strong>. The example above matches files
          where <code>matter_number</code> is <code>M-2024-001</code>
          <em>and</em> <code>document_type</code> is either
          <code>contract</code>
          or <code>amendment</code>.
        </p>
      </section>

      <!-- RATE LIMITING -->
      <section id="rate-limiting" class="doc-section">
        <h2 class="section-title">Rate Limiting</h2>
        <p class="section-desc">
          The default limit is 100 requests per minute per API key, enforced in
          Redis (falls back to in-process memory if Redis is unavailable). Both
          limits are configurable in the server source — adjust to match your
          infrastructure capacity.
        </p>

        <div class="rate-card">
          <div class="rate-number">100</div>
          <div class="rate-label">requests / minute (default)</div>
        </div>

        <div class="table-scroll">
          <table class="ref-table">
            <thead>
              <tr><th>Header</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><code>X-RateLimit-Limit</code></td>
                <td>Max requests per window</td>
              </tr>
              <tr>
                <td><code>X-RateLimit-Remaining</code></td>
                <td>Requests remaining in current window</td>
              </tr>
              <tr>
                <td><code>X-RateLimit-Reset</code></td>
                <td>Unix timestamp when limit resets</td>
              </tr>
              <tr>
                <td><code>Retry-After</code></td>
                <td>Seconds to wait before retrying (on 429)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ERROR CODES -->
      <section id="errors" class="doc-section">
        <h2 class="section-title">Error Codes</h2>
        <p class="section-desc">
          All errors return a consistent JSON body. Check <code
            >error.message</code
          > for a human-readable description.
        </p>

        <div class="code-block" style="margin-bottom: 20px">
          <div class="code-toolbar">
            <span class="code-lang">json</span>
          </div>
          <pre><code
              >{`{
  "error": "API key does not have write scope"
}`}</code
            ></pre>
        </div>

        <div class="table-scroll">
          <table class="ref-table">
            <thead>
              <tr><th>Code</th><th>Label</th><th>Description</th></tr>
            </thead>
            <tbody>
              {#each errorCodes as err}
                <tr>
                  <td>
                    <span class="status-badge {getStatusBadgeClass(err.code)}"
                      >{err.code}</span
                    >
                  </td>
                  <td><strong>{err.label}</strong></td>
                  <td>{err.desc}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>

      <!-- HTTP REFERENCE -->
      <section id="http-reference" class="doc-section">
        <div class="section-eyebrow">reference</div>
        <h2 class="section-title">HTTP API Reference</h2>
        <p class="section-desc">
          All endpoints documented below. Authenticate file and search
          operations with your API key in the <code>X-Api-Key</code> header.
          Base URL defaults to <code>http://localhost:3000/api/v2</code> — replace
          with whatever host you deployed Kyro on.
        </p>
        <div class="code-block">
          <div class="code-toolbar">
            <span class="code-lang">http</span>
            <button
              class="copy-btn"
              onclick={() =>
                copy("X-Api-Key: kyro_live_your_key_here", "http-auth")}
            >
              {copiedId === "http-auth" ? "✓ copied" : "copy"}
            </button>
          </div>
          <pre><code>X-Api-Key: kyro_live_your_key_here</code></pre>
        </div>
      </section>

      <!-- ── ENDPOINT SECTIONS ── -->
      {#each allTags as tag}
        <section id={tag.id} class="doc-section tag-section">
          <div class="tag-header">
            <h2 class="section-title">{tag.label}</h2>
            <span class="endpoint-count">
              {tag.endpoints.length} endpoint{tag.endpoints.length !== 1
                ? "s"
                : ""}
            </span>
          </div>
          <p class="section-desc">
            {(openapiSpec as any).tags?.find(
              (t: { name: string; description?: string }) =>
                t.name === tag.label,
            )?.description ?? ""}
          </p>
        </section>

        {#each tag.endpoints as ep}
          {@const authType = getAuthType(ep.op)}
          {@const scope = getScopeRequired(ep.op)}
          {@const bodySchema = parseRequestBody(ep.op)}
          {@const pathParams =
            ep.op.parameters?.filter((p) => p.in === "path") ?? []}
          {@const queryParams =
            ep.op.parameters?.filter((p) => p.in === "query") ?? []}
          {@const responses = Object.entries(ep.op.responses || {})}
          {@const responseExample = formatResponseExample(
            ep.op["x-response-example"],
          )}
          {@const curlSnippet = generateCurl(ep)}
          {@const fetchSnippet = generateFetch(ep)}
          {@const tabKey = getTab(ep.id)}

          <section id={ep.id} class="endpoint-section">
            <div class="ep-header">
              <div class="ep-title-row">
                <span class="method-badge method-{ep.method.toLowerCase()}"
                  >{ep.method}</span
                >
                <code class="ep-path">{ep.path.replace("/api/v2", "")}</code>
                <span class="ep-summary">{ep.op.summary ?? ""}</span>
              </div>
              <div class="ep-badges">
                {#if authType === "bearer"}
                  <span class="auth-badge auth-bearer">Bearer JWT</span>
                {:else if authType === "apiKey"}
                  <span class="auth-badge auth-apikey">X-Api-Key</span>
                {:else}
                  <span class="auth-badge auth-none">No auth</span>
                {/if}
                {#if scope}
                  <span class="scope-tag scope-inline">scope: {scope}</span>
                {/if}
              </div>
            </div>

            <div class="ep-body">
              <div class="ep-left">
                {#if pathParams.length > 0}
                  <div class="ep-block">
                    <h4 class="block-title">Path Parameters</h4>
                    <div class="table-scroll">
                      <table class="param-table">
                        <thead>
                          <tr
                            ><th>Name</th><th>Type</th><th>Required</th><th
                              >Description</th
                            ></tr
                          >
                        </thead>
                        <tbody>
                          {#each pathParams as p}
                            <tr>
                              <td><code>{p.name}</code></td>
                              <td
                                ><span class="type-tag"
                                  >{p.schema?.format ??
                                    p.schema?.type ??
                                    "string"}</span
                                ></td
                              >
                              <td>{p.required ? "✓" : "—"}</td>
                              <td>{p.description ?? ""}</td>
                            </tr>
                          {/each}
                        </tbody>
                      </table>
                    </div>
                  </div>
                {/if}

                {#if queryParams.length > 0}
                  <div class="ep-block">
                    <h4 class="block-title">Query Parameters</h4>
                    <div class="table-scroll">
                      <table class="param-table">
                        <thead>
                          <tr
                            ><th>Name</th><th>Type</th><th>Required</th><th
                              >Description</th
                            ></tr
                          >
                        </thead>
                        <tbody>
                          {#each queryParams as p}
                            <tr>
                              <td><code>{p.name}</code></td>
                              <td
                                ><span class="type-tag"
                                  >{p.schema?.format ??
                                    p.schema?.type ??
                                    "string"}</span
                                ></td
                              >
                              <td>{p.required ? "✓" : "—"}</td>
                              <td>{p.description ?? ""}</td>
                            </tr>
                          {/each}
                        </tbody>
                      </table>
                    </div>
                  </div>
                {/if}

                {#if bodySchema}
                  <div class="ep-block">
                    <h4 class="block-title">
                      Request Body
                      <span class="content-type-tag"
                        >{bodySchema.contentType}</span
                      >
                    </h4>
                    <div class="table-scroll">
                      <table class="param-table">
                        <thead>
                          <tr
                            ><th>Field</th><th>Type</th><th>Required</th><th
                              >Description</th
                            ></tr
                          >
                        </thead>
                        <tbody>
                          {#each bodySchema.fields as field}
                            <tr>
                              <td>
                                <code>{field.name}</code>
                                {#if field.default !== undefined}
                                  <span class="default-tag"
                                    >default: {JSON.stringify(
                                      field.default,
                                    )}</span
                                  >
                                {/if}
                              </td>
                              <td>
                                <span class="type-tag">{field.type}</span>
                                {#if field.enum}
                                  <div class="enum-list">
                                    {#each field.enum as val}
                                      <span class="enum-val">{val}</span>
                                    {/each}
                                  </div>
                                {/if}
                              </td>
                              <td class={field.required ? "req-yes" : ""}
                                >{field.required ? "✓" : "—"}</td
                              >
                              <td>{field.description}</td>
                            </tr>
                          {/each}
                        </tbody>
                      </table>
                    </div>
                  </div>
                {/if}

                <div class="ep-block">
                  <h4 class="block-title">Response Codes</h4>
                  <div class="response-codes">
                    {#each responses as [code, resp]}
                      <div class="response-code-row">
                        <span class="status-badge {getStatusBadgeClass(code)}"
                          >{code}</span
                        >
                        <span class="response-desc"
                          >{getStatusLabel(code, resp.description)}</span
                        >
                      </div>
                    {/each}
                  </div>
                </div>
              </div>

              <div class="ep-right">
                <div class="code-card">
                  <div class="code-card-header">
                    <span class="code-card-label">Request</span>
                    <div class="tab-group">
                      <button
                        class="tab-btn"
                        class:active={tabKey === "curl"}
                        onclick={() => setTab(ep.id, "curl")}>curl</button
                      >
                      <button
                        class="tab-btn"
                        class:active={tabKey === "fetch"}
                        onclick={() => setTab(ep.id, "fetch")}>fetch</button
                      >
                    </div>
                    <button
                      class="copy-btn"
                      onclick={() =>
                        copy(
                          tabKey === "curl" ? curlSnippet : fetchSnippet,
                          `req-${ep.id}`,
                        )}
                    >
                      {copiedId === `req-${ep.id}` ? "✓ copied" : "copy"}
                    </button>
                  </div>
                  <div class="code-body">
                    {#if tabKey === "curl"}
                      <pre><code>{curlSnippet}</code></pre>
                    {:else}
                      <pre><code>{fetchSnippet}</code></pre>
                    {/if}
                  </div>
                </div>

                {#if responseExample}
                  <div class="code-card">
                    <div class="code-card-header">
                      <span class="code-card-label">Response</span>
                      <span class="status-badge status-2xx">200</span>
                      <button
                        class="copy-btn"
                        onclick={() => copy(responseExample, `res-${ep.id}`)}
                      >
                        {copiedId === `res-${ep.id}` ? "✓ copied" : "copy"}
                      </button>
                    </div>
                    <div class="code-body">
                      <pre><code>{responseExample}</code></pre>
                    </div>
                  </div>
                {/if}
              </div>
            </div>
          </section>
        {/each}
      {/each}
    </main>
  </div>
</div>

<style>
  *,
  *::before,
  *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :root {
    --bg: #080808;
    --bg2: #0f0f0f;
    --bg3: #151515;
    --bg4: #1c1c1c;
    --bg5: #242424;
    --border: rgba(255, 255, 255, 0.06);
    --border2: rgba(255, 255, 255, 0.1);
    --border3: rgba(255, 255, 255, 0.16);
    --text: #eeebe4;
    --text-dim: #b8b4ac;
    --text-muted: #7a7670;
    --text-ghost: #3d3b38;
    --green: #3dd68c;
    --green-dim: rgba(61, 214, 140, 0.1);
    --blue: #5b9cf6;
    --blue-dim: rgba(91, 156, 246, 0.1);
    --amber: #f5a623;
    --amber-dim: rgba(245, 166, 35, 0.1);
    --red: #f26b6b;
    --red-dim: rgba(242, 107, 107, 0.1);
    --radius: 6px;
    --radius-sm: 3px;
    --font-mono: "JetBrains Mono", "Fira Code", "SF Mono", monospace;

    --content-pad-lg: 56px;
    --content-pad-md: 32px;
    --content-pad-sm: 20px;
    --content-pad-xs: 16px;
  }

  .page {
    font-family: var(--font-mono);
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    font-size: 13px;
    line-height: 1.6;
  }

  .topbar {
    position: sticky;
    top: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 50px;
    padding: 0 24px;
    background: rgba(8, 8, 8, 0.95);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .topbar-nav a {
    font-size: 12px;
    color: var(--text-muted);
    text-decoration: none;
    transition: color 0.12s;
    display: flex; /* add */
    align-items: center; /* add */
    gap: 5px; /* add */
  }

  .topbar-left {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    text-decoration: none;
    flex-shrink: 0;
  }

  .topbar-divider {
    color: var(--text-ghost);
    font-size: 16px;
    flex-shrink: 0;
  }

  .topbar-label {
    font-size: 12px;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .hamburger {
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 4px;
    border-radius: var(--radius-sm);
    flex-shrink: 0;
    transition:
      color 0.1s,
      background 0.1s;
  }
  .hamburger:hover {
    color: var(--text);
    background: var(--bg3);
  }

  .topbar-nav {
    display: flex;
    align-items: center;
    gap: 20px;
    flex-shrink: 0;
  }

  .topbar-nav a {
    font-size: 12px;
    color: var(--text-muted);
    text-decoration: none;
    transition: color 0.12s;
  }
  .topbar-nav a:hover {
    color: var(--text);
  }

  .layout {
    display: flex;
    max-width: 1440px;
    margin: 0 auto;
    min-height: calc(100vh - 50px);
    position: relative;
  }

  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    z-index: 199;
  }

  .sidebar {
    width: 224px;
    flex-shrink: 0;
    position: sticky;
    top: 50px;
    height: calc(100vh - 50px);
    overflow-y: auto;
    border-right: 1px solid var(--border);
    background: var(--bg);
    scrollbar-width: none;
    transform: translateX(-100%);
    position: fixed;
    top: 50px;
    left: 0;
    height: calc(100vh - 50px);
    z-index: 200;
    transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .sidebar::-webkit-scrollbar {
    display: none;
  }

  .sidebar.open {
    transform: translateX(0);
  }

  .sidebar-inner {
    padding: 16px 0 40px;
  }

  .sidebar-close-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 8px;
  }

  .sidebar-heading {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .sidebar-close {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 12px;
    padding: 2px 4px;
    border-radius: var(--radius-sm);
    transition: color 0.1s;
  }
  .sidebar-close:hover {
    color: var(--text);
  }

  .sidebar-group {
    margin-bottom: 6px;
    padding: 0 10px;
  }

  .sidebar-group-label {
    display: block;
    font-size: 10px;
    font-weight: 700;
    color: var(--text-ghost);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    padding: 10px 6px 4px;
  }

  .sidebar-link {
    display: block;
    font-size: 12px;
    color: var(--text-muted);
    text-decoration: none;
    padding: 5px 8px;
    border-radius: var(--radius-sm);
    border-left: 2px solid transparent;
    transition: all 0.1s;
  }
  .sidebar-link:hover {
    color: var(--text-dim);
    background: var(--bg2);
  }
  .sidebar-link.active {
    color: var(--text);
    background: var(--bg3);
    border-left-color: var(--text-dim);
  }

  .sidebar-endpoint {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 11px;
    color: var(--text-muted);
    text-decoration: none;
    padding: 4px 8px;
    border-radius: var(--radius-sm);
    border-left: 2px solid transparent;
    transition: all 0.1s;
    overflow: hidden;
  }
  .sidebar-endpoint:hover {
    color: var(--text-dim);
    background: var(--bg2);
  }
  .sidebar-endpoint.active {
    color: var(--text);
    background: var(--bg3);
    border-left-color: var(--text-dim);
  }

  .sidebar-method {
    font-size: 9px;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 2px;
    text-transform: uppercase;
    flex-shrink: 0;
    letter-spacing: 0.03em;
  }

  .sidebar-path {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 11px;
  }

  .content {
    flex: 1;
    min-width: 0;
    padding-bottom: 80px;
  }

  .doc-section {
    padding: 48px var(--content-pad-lg);
    border-bottom: 1px solid var(--border);
    scroll-margin-top: 70px;
  }

  .section-eyebrow {
    font-size: 10px;
    font-weight: 700;
    color: var(--green);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 10px;
  }

  .section-hero {
    font-size: 32px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.025em;
    margin-bottom: 10px;
    line-height: 1.15;
  }

  .section-lead {
    font-size: 13px;
    color: var(--text-muted);
    max-width: 560px;
    line-height: 1.75;
    margin-bottom: 28px;
  }

  .section-title {
    font-size: 20px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.02em;
    margin-bottom: 8px;
    line-height: 1.2;
  }

  .section-desc {
    font-size: 12px;
    color: var(--text-muted);
    line-height: 1.75;
    max-width: 640px;
    margin-bottom: 24px;
  }

  .section-desc strong {
    color: var(--text-dim);
  }
  .section-desc code {
    font-family: var(--font-mono);
    font-size: 11px;
    background: var(--bg3);
    padding: 1px 5px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border2);
    color: var(--text-dim);
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 8px;
    margin-bottom: 20px;
  }

  .info-card {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    overflow-wrap: anywhere;
  }

  .info-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-ghost);
  }

  .info-value {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-dim);
    background: none;
    border: none;
    padding: 0;
    overflow-wrap: anywhere;
    word-break: break-all;
  }

  .spec-download {
    margin-top: 4px;
  }

  .spec-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--blue);
    text-decoration: none;
    padding: 6px 10px;
    border: 1px solid rgba(91, 156, 246, 0.2);
    border-radius: var(--radius-sm);
    background: var(--blue-dim);
    transition: border-color 0.12s;
  }
  .spec-link:hover {
    border-color: rgba(91, 156, 246, 0.4);
  }

  .rate-card {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 20px;
    padding: 20px 24px;
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    width: fit-content;
  }

  .rate-number {
    font-size: 44px;
    font-weight: 700;
    color: var(--green);
    letter-spacing: -0.04em;
    line-height: 1;
  }

  .rate-label {
    font-size: 13px;
    color: var(--text-muted);
  }

  .table-scroll {
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    border-radius: var(--radius-sm);
  }

  .ref-table,
  .param-table {
    width: 100%;
    min-width: 400px;
    border-collapse: collapse;
    font-size: 12px;
  }

  .ref-table th,
  .ref-table td,
  .param-table th,
  .param-table td {
    text-align: left;
    padding: 8px 12px;
    border: 1px solid var(--border);
    white-space: nowrap;
  }

  .ref-table td:last-child,
  .param-table td:last-child {
    white-space: normal;
    min-width: 120px;
  }

  .ref-table th,
  .param-table th {
    background: var(--bg2);
    color: var(--text-muted);
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .ref-table td,
  .param-table td {
    background: var(--bg);
    color: var(--text-dim);
    vertical-align: top;
  }

  .param-table code {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text);
    background: none;
  }

  .ref-table code {
    font-family: var(--font-mono);
    font-size: 11px;
    background: var(--bg3);
    padding: 1px 5px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border2);
    color: var(--text-dim);
  }

  .ref-table strong {
    color: var(--text-dim);
    font-weight: 500;
  }

  .steps {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .step {
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }

  .step-num {
    font-size: 10px;
    font-weight: 700;
    color: var(--green);
    background: var(--green-dim);
    border: 1px solid rgba(61, 214, 140, 0.2);
    width: 32px;
    height: 32px;
    border-radius: var(--radius);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .step-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .step-body h4 {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
  }

  .sdk-methods {
    display: flex;
    flex-direction: column;
    gap: 28px;
  }

  .sdk-method {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .sdk-method-header {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .sdk-method-name {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text);
    background: var(--bg3);
    border: 1px solid var(--border2);
    padding: 3px 10px;
    border-radius: var(--radius-sm);
    white-space: normal;
    word-break: break-all;
  }

  .tag-section {
    padding-bottom: 20px;
  }

  .tag-header {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 6px;
    flex-wrap: wrap;
  }

  .endpoint-count {
    font-size: 10px;
    color: var(--text-ghost);
    background: var(--bg3);
    border: 1px solid var(--border);
    padding: 2px 7px;
    border-radius: 99px;
  }

  .endpoint-section {
    border-bottom: 1px solid var(--border);
    scroll-margin-top: 70px;
  }

  .ep-header {
    padding: 20px var(--content-pad-lg) 16px;
    background: var(--bg2);
    border-bottom: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .ep-title-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .ep-path {
    font-family: var(--font-mono);
    font-size: 14px;
    color: var(--text);
    background: none;
    word-break: break-all;
  }

  .ep-summary {
    font-size: 12px;
    color: var(--text-muted);
  }

  .ep-badges {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .ep-body {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    align-items: start;
  }

  .ep-left {
    padding: 24px var(--content-pad-md) 32px var(--content-pad-lg);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 24px;
    min-width: 0;
  }

  .ep-right {
    padding: 24px var(--content-pad-lg) 32px var(--content-pad-md);
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;
    position: sticky;
    top: 50px;
    max-height: calc(100vh - 50px);
    overflow-y: auto;
    scrollbar-width: none;
  }
  .ep-right::-webkit-scrollbar {
    display: none;
  }

  .ep-block {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .block-title {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-ghost);
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .content-type-tag {
    font-size: 9px;
    font-weight: 600;
    background: var(--bg4);
    color: var(--text-muted);
    border: 1px solid var(--border2);
    padding: 1px 6px;
    border-radius: 3px;
    text-transform: none;
    letter-spacing: 0;
  }

  .type-tag {
    font-size: 10px;
    color: var(--blue);
    background: var(--blue-dim);
    border: 1px solid rgba(91, 156, 246, 0.15);
    padding: 1px 6px;
    border-radius: 3px;
    font-family: var(--font-mono);
    white-space: nowrap;
  }

  .enum-list {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    margin-top: 4px;
  }

  .enum-val {
    font-size: 9px;
    color: var(--text-ghost);
    background: var(--bg4);
    border: 1px solid var(--border);
    padding: 1px 5px;
    border-radius: 2px;
  }

  .default-tag {
    display: block;
    font-size: 9px;
    color: var(--text-ghost);
    margin-top: 2px;
  }

  .req-yes {
    color: var(--green);
  }

  .response-codes {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .response-code-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .response-desc {
    font-size: 12px;
    color: var(--text-muted);
  }

  .code-card {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }

  .code-card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: var(--bg3);
    border-bottom: 1px solid var(--border);
    flex-wrap: wrap;
  }

  .code-card-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-ghost);
    flex: 1;
    min-width: 40px;
  }

  .tab-group {
    display: flex;
    gap: 2px;
    background: var(--bg4);
    padding: 2px;
    border-radius: 4px;
  }

  .tab-btn {
    font-family: var(--font-mono);
    font-size: 10px;
    padding: 3px 9px;
    background: transparent;
    border: none;
    border-radius: 3px;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.1s;
  }
  .tab-btn:hover {
    color: var(--text-dim);
  }
  .tab-btn.active {
    background: var(--bg);
    color: var(--text);
  }

  .code-body {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
    scrollbar-color: var(--bg5) transparent;
  }

  .code-body pre {
    margin: 0;
    padding: 14px 16px;
    font-family: var(--font-mono);
    font-size: 11px;
    line-height: 1.7;
    color: var(--text-dim);
    white-space: pre;
    background: transparent;
    border: none;
    border-radius: 0;
  }

  .code-body code {
    background: none;
    border: none;
    padding: 0;
  }

  .code-block {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }

  .code-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 12px;
    background: var(--bg3);
    border-bottom: 1px solid var(--border);
    flex-wrap: wrap;
  }

  .code-lang {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-ghost);
    flex: 1;
  }

  .code-block pre {
    margin: 0;
    padding: 14px 16px;
    font-family: var(--font-mono);
    font-size: 11px;
    line-height: 1.7;
    color: var(--text-dim);
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    background: transparent;
    border: none;
  }

  .code-block code {
    background: none;
    border: none;
    padding: 0;
  }

  .copy-btn {
    font-family: var(--font-mono);
    font-size: 10px;
    padding: 3px 8px;
    background: var(--bg4);
    border: 1px solid var(--border2);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.1s;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .copy-btn:hover {
    color: var(--text);
    border-color: var(--border3);
  }

  .method-badge {
    display: inline-flex;
    align-items: center;
    padding: 3px 9px;
    border-radius: 3px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    flex-shrink: 0;
  }

  .method-get {
    background: var(--green-dim);
    color: var(--green);
  }
  .method-post {
    background: var(--blue-dim);
    color: var(--blue);
  }
  .method-delete {
    background: var(--red-dim);
    color: var(--red);
  }
  .method-put {
    background: var(--amber-dim);
    color: var(--amber);
  }
  .method-patch {
    background: var(--amber-dim);
    color: var(--amber);
  }

  .auth-badge {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 3px;
    border: 1px solid;
    white-space: nowrap;
  }

  .auth-bearer {
    background: var(--blue-dim);
    color: var(--blue);
    border-color: rgba(91, 156, 246, 0.2);
  }
  .auth-apikey {
    background: var(--green-dim);
    color: var(--green);
    border-color: rgba(61, 214, 140, 0.2);
  }
  .auth-none {
    background: var(--bg3);
    color: var(--text-ghost);
    border-color: var(--border);
  }

  .scope-tag {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 7px;
    border-radius: 3px;
    white-space: nowrap;
  }

  .scope-inline {
    background: var(--bg4);
    color: var(--text-muted);
    border: 1px solid var(--border2);
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 3px;
    min-width: 38px;
    justify-content: center;
    flex-shrink: 0;
  }

  .status-2xx {
    background: var(--green-dim);
    color: var(--green);
  }
  .status-4xx {
    background: var(--amber-dim);
    color: var(--amber);
  }
  .status-5xx {
    background: var(--red-dim);
    color: var(--red);
  }

  .ck {
    color: var(--green);
  }
  .cs {
    color: var(--amber);
  }
  .c-comment {
    color: var(--text-ghost);
    font-style: italic;
  }

  @media (min-width: 900px) {
    .sidebar {
      position: sticky;
      top: 50px;
      height: calc(100vh - 50px);
      transform: none !important;
      z-index: auto;
    }

    .sidebar-close-row {
      display: none;
    }
    .hamburger {
      display: none;
    }
  }

  @media (max-width: 1100px) {
    .ep-body {
      grid-template-columns: 1fr;
    }

    .ep-left {
      border-right: none;
      border-bottom: 1px solid var(--border);
      padding: 24px var(--content-pad-md);
    }

    .ep-right {
      position: static;
      max-height: none;
      padding: 24px var(--content-pad-md) 32px;
    }

    .ep-header {
      padding: 20px var(--content-pad-md) 16px;
    }

    .doc-section {
      padding: 40px var(--content-pad-md);
    }
  }

  @media (max-width: 640px) {
    .topbar {
      padding: 0 var(--content-pad-xs);
    }

    .topbar-label {
      display: none;
    }

    .doc-section {
      padding: 28px var(--content-pad-xs);
    }

    .ep-header {
      padding: 14px var(--content-pad-xs) 10px;
    }

    .ep-left,
    .ep-right {
      padding: var(--content-pad-xs);
    }

    .section-hero {
      font-size: 24px;
    }

    .info-grid {
      grid-template-columns: 1fr;
    }

    .rate-card {
      width: 100%;
    }

    .step {
      flex-direction: column;
      gap: 10px;
    }

    .sdk-method-header {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
