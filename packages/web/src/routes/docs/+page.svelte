<script lang="ts">
  import { onMount } from "svelte";
  import Logo from "$lib/components/Logo.svelte";
  import openapiSpec from "@kyro/shared/openapi-json";

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


  const TAG_ORDER = ["Authentication", "API Keys", "Files", "Organisation", "Usage", "Health"];

  const TAG_IDS: Record<string, string> = {
    Authentication: "auth",
    Organisation: "org",
    "API Keys": "keys",
    Files: "files",
    Usage: "usage",
    Health: "health",
  };

  const endpointsByTag: Record<string, Endpoint[]> = {};

  for (const [path, pathItem] of Object.entries((openapiSpec as any).paths || {})) {
    for (const [method, operation] of Object.entries(pathItem as Record<string, unknown>)) {
      if (["parameters", "summary", "description"].includes(method)) continue;
      const op = operation as Operation;
      const tag = op.tags?.[0] || "Other";
      const tagId = TAG_IDS[tag] || tag.toLowerCase();
      if (!endpointsByTag[tagId]) endpointsByTag[tagId] = [];
      const id = `${tagId}-${method}-${path.replace(/\//g, "-").replace(/[{}]/g, "")}`;
      endpointsByTag[tagId].push({ method: method.toUpperCase(), path, op, id });
    }
  }

  const allTags = TAG_ORDER.map((t) => ({
    label: t,
    id: TAG_IDS[t] || t.toLowerCase(),
    endpoints: endpointsByTag[TAG_IDS[t] || t.toLowerCase()] || [],
  })).filter((t) => t.endpoints.length > 0);


  const staticSections = [
    { id: "overview", label: "Overview" },
    { id: "authentication", label: "Authentication" },
    { id: "scopes", label: "Scopes" },
    { id: "rate-limiting", label: "Rate Limiting" },
    { id: "errors", label: "Error Codes" },
    { id: "quickstart", label: "Quickstart" },
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
      const fields = Object.entries(schema?.properties || {}).map(([name, prop]) => ({
        name,
        type: (prop as SchemaProperty).format === "binary" ? "File (binary)" : (prop as SchemaProperty).type || "string",
        required: required.includes(name),
        description: (prop as SchemaProperty).description || "",
        enum: (prop as SchemaProperty).enum,
        default: (prop as SchemaProperty).default,
      }));
      return { fields, isFormData: true, contentType: "multipart/form-data" };
    }

    if (content["application/json"]) {
      const schema = content["application/json"].schema;
      const required = schema?.required || [];
      const fields = Object.entries(schema?.properties || {}).map(([name, prop]) => ({
        name,
        type: formatType(prop as SchemaProperty),
        required: required.includes(name),
        description: (prop as SchemaProperty).description || "",
        enum: (prop as SchemaProperty).enum,
        default: (prop as SchemaProperty).default,
      }));
      return { fields, isFormData: false, contentType: "application/json" };
    }

    return null;
  }

  function formatType(prop: SchemaProperty): string {
    if (prop.type === "array" && prop.items) return `${formatType(prop.items)}[]`;
    if (prop.format) return `${prop.type} (${prop.format})`;
    return prop.type || "any";
  }

  function generateCurl(ep: Endpoint): string {
    const authType = getAuthType(ep.op);
    const scope = getScopeRequired(ep.op);
    const body = parseRequestBody(ep.op);
    const baseUrl = "https://api.kyro.io/api/v1";

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
        if (f.required) bodyObj[f.name] = f.default ?? (f.type.includes("string") ? `"${f.name}_value"` : f.type.includes("array") ? [] : "value");
      }
      lines.push(`  -d '${JSON.stringify(bodyObj, null, 2).replace(/\n/g, "\n  ")}'`);
    }

    const last = lines[lines.length - 1];
    if (last.endsWith(" \\")) lines[lines.length - 1] = last.slice(0, -2);
    return lines.join("\n");
  }

  function generateFetch(ep: Endpoint): string {
    const authType = getAuthType(ep.op);
    const body = parseRequestBody(ep.op);
    const baseUrl = "https://api.kyro.io/api/v1";

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
        bodyObj[f.name] = f.default ?? (f.type.includes("string") ? `${f.name}_value` : f.type.includes("array") ? [] : "value");
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
    if (raw.startsWith("Binary") || raw.includes("No Content")) return raw;
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
            break;
          }
        }
      },
      { rootMargin: "-80px 0px -55% 0px", threshold: 0 }
    );
    document.querySelectorAll(".doc-section, .endpoint-section").forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  });


  const errorCodes = [
    { code: "400", label: "Bad Request", desc: "Invalid input or missing required fields" },
    { code: "401", label: "Unauthorized", desc: "Missing or invalid API key / JWT token" },
    { code: "403", label: "Forbidden", desc: "Insufficient scope or role permissions" },
    { code: "404", label: "Not Found", desc: "Resource does not exist" },
    { code: "409", label: "Conflict", desc: "Resource already exists" },
    { code: "413", label: "Payload Too Large", desc: "File exceeds the 100MB size limit" },
    { code: "429", label: "Too Many Requests", desc: "Rate limit exceeded — check Retry-After header" },
    { code: "500", label: "Internal Server Error", desc: "Unexpected server-side error" },
  ];

  const scopes = [
    { name: "read", color: "green", desc: "List and download files, read usage statistics" },
    { name: "write", color: "blue", desc: "Upload and delete files, create API keys" },
    { name: "admin", color: "amber", desc: "Full access including organisation management" },
  ];
</script>

<svelte:head>
  <title>API Reference — Kyro</title>
</svelte:head>

<div class="page">

  <!-- ── Top bar ── -->
  <header class="topbar">
    <div class="topbar-left">
      <button class="hamburger" onclick={() => (sidebarOpen = true)} aria-label="Open menu">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
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
      <a href="/health">status</a>
      <a href="/login" class="btn-signin">sign in</a>
    </nav>
  </header>

  <div class="layout">

    <!-- ── Overlay ── -->
    {#if sidebarOpen}
      <div class="overlay" onclick={() => (sidebarOpen = false)}></div>
    {/if}

    <!-- ── Sidebar ── -->
    <aside class="sidebar" class:open={sidebarOpen}>
      <div class="sidebar-inner">
        <div class="sidebar-close-row">
          <span class="sidebar-heading">docs</span>
          <button class="sidebar-close" onclick={() => (sidebarOpen = false)}>✕</button>
        </div>

        <div class="sidebar-group">
          <span class="sidebar-group-label">General</span>
          {#each staticSections as s}
            <a
              href="#{s.id}"
              class="sidebar-link"
              class:active={activeSection === s.id}
              onclick={() => (sidebarOpen = false)}
            >{s.label}</a>
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
                <span class="sidebar-method method-{ep.method.toLowerCase()}">{ep.method}</span>
                <span class="sidebar-path">{ep.path.replace("/api/v1", "")}</span>
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
        <div class="section-eyebrow">v{(openapiSpec as any).info.version}</div>
        <h1 class="section-hero">{(openapiSpec as any).info.title}</h1>
        <p class="section-lead">{(openapiSpec as any).info.description}</p>

        <div class="info-grid">
          <div class="info-card">
            <span class="info-label">Base URL</span>
            <code class="info-value">{(openapiSpec as any).servers?.[1]?.url ?? "https://api.kyro.io/api/v1"}</code>
          </div>
          <div class="info-card">
            <span class="info-label">Dev URL</span>
            <code class="info-value">{(openapiSpec as any).servers?.[0]?.url ?? "http://localhost:3000/api/v1"}</code>
          </div>
          <div class="info-card">
            <span class="info-label">Spec format</span>
            <code class="info-value">OpenAPI {(openapiSpec as any).openapi}</code>
          </div>
          <div class="info-card">
            <span class="info-label">Auth methods</span>
            <code class="info-value">Bearer JWT · X-Api-Key</code>
          </div>
        </div>

        <div class="spec-download">
          <a href="/openapi.yaml" target="_blank" class="spec-link">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download OpenAPI YAML
          </a>
        </div>
      </section>

      <!-- AUTHENTICATION -->
      <section id="authentication" class="doc-section">
        <h2 class="section-title">Authentication</h2>
        <p class="section-desc">Two authentication methods are supported. Use <strong>Bearer JWT</strong> for user-level actions (managing keys, org settings) and <strong>X-Api-Key</strong> for programmatic API access (file operations).</p>

        <div class="auth-cards">
          <div class="auth-card">
            <div class="auth-card-header">
              <span class="badge badge-green">Bearer JWT</span>
              <span class="auth-card-title">User actions</span>
            </div>
            <p class="auth-card-desc">Obtained from <code>/auth/login</code> or <code>/auth/register</code>. Valid for 7 days.</p>
            <div class="code-block">
              <div class="code-toolbar">
                <span class="code-lang">http</span>
                <button class="copy-btn" onclick={() => copy("Authorization: Bearer eyJhbGci...", "auth-bearer")}>
                  {copiedId === "auth-bearer" ? "✓ copied" : "copy"}
                </button>
              </div>
              <pre><code><span class="ck">Authorization</span>: <span class="cs">Bearer eyJhbGci...</span></code></pre>
            </div>
          </div>

          <div class="auth-card">
            <div class="auth-card-header">
              <span class="badge badge-blue">X-Api-Key</span>
              <span class="auth-card-title">API access</span>
            </div>
            <p class="auth-card-desc">Created via the dashboard or <code>/keys</code> endpoint. Scoped to specific operations.</p>
            <div class="code-block">
              <div class="code-toolbar">
                <span class="code-lang">http</span>
                <button class="copy-btn" onclick={() => copy("X-Api-Key: kyr_abc123xyz...", "auth-apikey")}>
                  {copiedId === "auth-apikey" ? "✓ copied" : "copy"}
                </button>
              </div>
              <pre><code><span class="ck">X-Api-Key</span>: <span class="cs">kyr_abc123xyz...</span></code></pre>
            </div>
          </div>
        </div>
      </section>

      <!-- SCOPES -->
      <section id="scopes" class="doc-section">
        <h2 class="section-title">Scopes</h2>
        <p class="section-desc">API keys are scoped. Request only the permissions your integration needs.</p>

        <table class="ref-table">
          <thead>
            <tr>
              <th>Scope</th>
              <th>Permissions</th>
            </tr>
          </thead>
          <tbody>
            {#each scopes as scope}
              <tr>
                <td><span class="scope-tag scope-{scope.color}">{scope.name}</span></td>
                <td>{scope.desc}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </section>

      <!-- RATE LIMITING -->
      <section id="rate-limiting" class="doc-section">
        <h2 class="section-title">Rate Limiting</h2>
        <p class="section-desc">All endpoints are rate-limited per API key. Exceeding the limit returns <code>429 Too Many Requests</code>.</p>

        <div class="rate-card">
          <div class="rate-number">100</div>
          <div class="rate-label">requests / minute</div>
        </div>

        <table class="ref-table">
          <thead>
            <tr><th>Header</th><th>Description</th></tr>
          </thead>
          <tbody>
            <tr><td><code>X-RateLimit-Limit</code></td><td>Max requests per window</td></tr>
            <tr><td><code>X-RateLimit-Remaining</code></td><td>Requests remaining in current window</td></tr>
            <tr><td><code>X-RateLimit-Reset</code></td><td>Unix timestamp when limit resets</td></tr>
            <tr><td><code>Retry-After</code></td><td>Seconds to wait before retrying (on 429)</td></tr>
          </tbody>
        </table>
      </section>

      <!-- ERROR CODES -->
      <section id="errors" class="doc-section">
        <h2 class="section-title">Error Codes</h2>
        <p class="section-desc">All errors return a consistent JSON body. Check <code>error.code</code> for machine-readable classification.</p>

        <div class="code-block" style="margin-bottom: 20px">
          <div class="code-toolbar"><span class="code-lang">json</span></div>
          <pre><code>{`{
  "error": {
    "message": "API key does not have write scope",
    "code": "forbidden",
    "details": []
  }
}`}</code></pre>
        </div>

        <table class="ref-table">
          <thead>
            <tr><th>Code</th><th>Label</th><th>Description</th></tr>
          </thead>
          <tbody>
            {#each errorCodes as err}
              <tr>
                <td><span class="status-badge {getStatusBadgeClass(err.code)}">{err.code}</span></td>
                <td><strong>{err.label}</strong></td>
                <td>{err.desc}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </section>

      <!-- QUICKSTART -->
      <section id="quickstart" class="doc-section">
        <h2 class="section-title">Quickstart</h2>
        <p class="section-desc">Register, create a key, and upload a file in under 2 minutes.</p>

        <div class="steps">
          <div class="step">
            <div class="step-num">01</div>
            <div class="step-body">
              <h4>Register and get a JWT</h4>
              <div class="code-block">
                <div class="code-toolbar">
                  <span class="code-lang">curl</span>
                  <button class="copy-btn" onclick={() => copy(`curl -X POST https://api.kyro.io/api/v1/auth/register \\\n  -H "Content-Type: application/json" \\\n  -d '{"orgName":"my-org","email":"you@domain.com","password":"secure123"}'`, "qs-1")}>
                    {copiedId === "qs-1" ? "✓" : "copy"}
                  </button>
                </div>
                <pre><code>curl -X POST https://api.kyro.io/api/v1/auth/register \
  -H <span class="cs">"Content-Type: application/json"</span> \
  -d <span class="cs">'&#123;"orgName":"my-org","email":"you@domain.com","password":"secure123"&#125;'</span></code></pre>
              </div>
            </div>
          </div>

          <div class="step">
            <div class="step-num">02</div>
            <div class="step-body">
              <h4>Create an API key with write scope</h4>
              <div class="code-block">
                <div class="code-toolbar">
                  <span class="code-lang">curl</span>
                  <button class="copy-btn" onclick={() => copy(`curl -X POST https://api.kyro.io/api/v1/keys \\\n  -H "Authorization: Bearer $JWT" \\\n  -H "Content-Type: application/json" \\\n  -d '{"name":"prod","scopes":["read","write"]}'`, "qs-2")}>
                    {copiedId === "qs-2" ? "✓" : "copy"}
                  </button>
                </div>
                <pre><code>curl -X POST https://api.kyro.io/api/v1/keys \
  -H <span class="cs">"Authorization: Bearer $JWT"</span> \
  -H <span class="cs">"Content-Type: application/json"</span> \
  -d <span class="cs">'&#123;"name":"prod","scopes":["read","write"]&#125;'</span></code></pre>
              </div>
            </div>
          </div>

          <div class="step">
            <div class="step-num">03</div>
            <div class="step-body">
              <h4>Upload a file</h4>
              <div class="code-block">
                <div class="code-toolbar">
                  <span class="code-lang">curl</span>
                  <button class="copy-btn" onclick={() => copy(`curl -X POST https://api.kyro.io/api/v1/files \\\n  -H "X-Api-Key: $API_KEY" \\\n  -F "file=@./document.pdf"`, "qs-3")}>
                    {copiedId === "qs-3" ? "✓" : "copy"}
                  </button>
                </div>
                <pre><code>curl -X POST https://api.kyro.io/api/v1/files \
  -H <span class="cs">"X-Api-Key: $API_KEY"</span> \
  -F <span class="cs">"file=@./document.pdf"</span></code></pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ── ENDPOINT SECTIONS ── -->
      {#each allTags as tag}
        <section id={tag.id} class="doc-section tag-section">
          <div class="tag-header">
            <h2 class="section-title">{tag.label}</h2>
            <span class="endpoint-count">{tag.endpoints.length} endpoint{tag.endpoints.length !== 1 ? "s" : ""}</span>
          </div>
          <p class="section-desc">
            {(openapiSpec as any).tags?.find((t: { name: string; description?: string }) => t.name === tag.label)?.description ?? ""}
          </p>
        </section>

        {#each tag.endpoints as ep}
          {@const authType = getAuthType(ep.op)}
          {@const scope = getScopeRequired(ep.op)}
          {@const bodySchema = parseRequestBody(ep.op)}
          {@const pathParams = ep.op.parameters?.filter(p => p.in === "path") ?? []}
          {@const queryParams = ep.op.parameters?.filter(p => p.in === "query") ?? []}
          {@const responses = Object.entries(ep.op.responses || {})}
          {@const responseExample = formatResponseExample(ep.op["x-response-example"])}
          {@const curlSnippet = generateCurl(ep)}
          {@const fetchSnippet = generateFetch(ep)}
          {@const tabKey = getTab(ep.id)}

          <section id={ep.id} class="endpoint-section">
            <!-- Endpoint header -->
            <div class="ep-header">
              <div class="ep-title-row">
                <span class="method-badge method-{ep.method.toLowerCase()}">{ep.method}</span>
                <code class="ep-path">{ep.path.replace("/api/v1", "")}</code>
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

              <!-- Left column: schema info -->
              <div class="ep-left">

                <!-- Path parameters -->
                {#if pathParams.length > 0}
                  <div class="ep-block">
                    <h4 class="block-title">Path Parameters</h4>
                    <table class="param-table">
                      <thead><tr><th>Name</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
                      <tbody>
                        {#each pathParams as p}
                          <tr>
                            <td><code>{p.name}</code></td>
                            <td><span class="type-tag">{p.schema?.format ?? p.schema?.type ?? "string"}</span></td>
                            <td>{p.required ? "✓" : "—"}</td>
                            <td>{p.description ?? ""}</td>
                          </tr>
                        {/each}
                      </tbody>
                    </table>
                  </div>
                {/if}

                <!-- Query parameters -->
                {#if queryParams.length > 0}
                  <div class="ep-block">
                    <h4 class="block-title">Query Parameters</h4>
                    <table class="param-table">
                      <thead><tr><th>Name</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
                      <tbody>
                        {#each queryParams as p}
                          <tr>
                            <td><code>{p.name}</code></td>
                            <td><span class="type-tag">{p.schema?.format ?? p.schema?.type ?? "string"}</span></td>
                            <td>{p.required ? "✓" : "—"}</td>
                            <td>{p.description ?? ""}</td>
                          </tr>
                        {/each}
                      </tbody>
                    </table>
                  </div>
                {/if}

                <!-- Request body -->
                {#if bodySchema}
                  <div class="ep-block">
                    <h4 class="block-title">
                      Request Body
                      <span class="content-type-tag">{bodySchema.contentType}</span>
                    </h4>
                    <table class="param-table">
                      <thead><tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
                      <tbody>
                        {#each bodySchema.fields as field}
                          <tr>
                            <td>
                              <code>{field.name}</code>
                              {#if field.default !== undefined}
                                <span class="default-tag">default: {JSON.stringify(field.default)}</span>
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
                            <td class={field.required ? "req-yes" : ""}>{field.required ? "✓" : "—"}</td>
                            <td>{field.description}</td>
                          </tr>
                        {/each}
                      </tbody>
                    </table>
                  </div>
                {/if}

                <!-- Response codes -->
                <div class="ep-block">
                  <h4 class="block-title">Response Codes</h4>
                  <div class="response-codes">
                    {#each responses as [code, resp]}
                      <div class="response-code-row">
                        <span class="status-badge {getStatusBadgeClass(code)}">{code}</span>
                        <span class="response-desc">{getStatusLabel(code, resp.description)}</span>
                      </div>
                    {/each}
                  </div>
                </div>

              </div>

              <!-- Right column: code examples -->
              <div class="ep-right">

                <!-- Request example tabs -->
                <div class="code-card">
                  <div class="code-card-header">
                    <span class="code-card-label">Request</span>
                    <div class="tab-group">
                      <button
                        class="tab-btn"
                        class:active={tabKey === "curl"}
                        onclick={() => setTab(ep.id, "curl")}
                      >curl</button>
                      <button
                        class="tab-btn"
                        class:active={tabKey === "fetch"}
                        onclick={() => setTab(ep.id, "fetch")}
                      >fetch</button>
                    </div>
                    <button
                      class="copy-btn"
                      onclick={() => copy(tabKey === "curl" ? curlSnippet : fetchSnippet, `req-${ep.id}`)}
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

                <!-- Response example -->
                {#if responseExample}
                  <div class="code-card">
                    <div class="code-card-header">
                      <span class="code-card-label">Response</span>
                      <span class="status-badge status-2xx">200</span>
                      <button class="copy-btn" onclick={() => copy(responseExample, `res-${ep.id}`)}>
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
  /* ── Reset & tokens ── */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:         #080808;
    --bg2:        #0f0f0f;
    --bg3:        #151515;
    --bg4:        #1c1c1c;
    --bg5:        #242424;
    --border:     rgba(255,255,255,0.06);
    --border2:    rgba(255,255,255,0.1);
    --border3:    rgba(255,255,255,0.16);
    --text:       #eeebe4;
    --text-dim:   #b8b4ac;
    --text-muted: #7a7670;
    --text-ghost: #3d3b38;
    --green:      #3dd68c;
    --green-dim:  rgba(61,214,140,0.1);
    --blue:       #5b9cf6;
    --blue-dim:   rgba(91,156,246,0.1);
    --amber:      #f5a623;
    --amber-dim:  rgba(245,166,35,0.1);
    --red:        #f26b6b;
    --red-dim:    rgba(242,107,107,0.1);
    --radius:     6px;
    --radius-sm:  3px;
    --font-mono:  'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;
  }

  .page {
    font-family: var(--font-mono);
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    font-size: 13px;
    line-height: 1.6;
  }

  /* ── Topbar ── */
  .topbar {
    position: sticky;
    top: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 50px;
    padding: 0 24px;
    background: rgba(8,8,8,0.92);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
  }

  .topbar-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    text-decoration: none;
  }

  .topbar-divider { color: var(--text-ghost); font-size: 16px; }

  .topbar-label {
    font-size: 12px;
    color: var(--text-muted);
  }

  .hamburger {
    display: none;
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 4px;
    border-radius: var(--radius-sm);
  }
  .hamburger:hover { color: var(--text); background: var(--bg3); }

  .topbar-nav {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .topbar-nav a {
    font-size: 12px;
    color: var(--text-muted);
    text-decoration: none;
    transition: color .12s;
  }
  .topbar-nav a:hover { color: var(--text); }

  .btn-signin {
    height: 28px;
    padding: 0 12px;
    background: var(--bg3) !important;
    border: 1px solid var(--border2) !important;
    border-radius: var(--radius-sm);
    color: var(--text-dim) !important;
    display: flex;
    align-items: center;
  }
  .btn-signin:hover { border-color: var(--border3) !important; color: var(--text) !important; }

  /* ── Layout ── */
  .layout {
    display: flex;
    max-width: 1440px;
    margin: 0 auto;
  }

  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    z-index: 199;
  }

  /* ── Sidebar ── */
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
  }
  .sidebar::-webkit-scrollbar { display: none; }

  .sidebar-inner {
    padding: 16px 0 40px;
  }

  .sidebar-close-row {
    display: none;
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
    letter-spacing: .06em;
  }

  .sidebar-close {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 12px;
    padding: 2px 4px;
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
    letter-spacing: .1em;
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
    transition: all .1s;
  }
  .sidebar-link:hover { color: var(--text-dim); background: var(--bg2); }
  .sidebar-link.active { color: var(--text); background: var(--bg3); border-left-color: var(--text-dim); }

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
    transition: all .1s;
    overflow: hidden;
  }
  .sidebar-endpoint:hover { color: var(--text-dim); background: var(--bg2); }
  .sidebar-endpoint.active { color: var(--text); background: var(--bg3); border-left-color: var(--text-dim); }

  .sidebar-method {
    font-size: 9px;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 2px;
    text-transform: uppercase;
    flex-shrink: 0;
    letter-spacing: .03em;
  }

  .sidebar-path {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 11px;
  }

  /* ── Content ── */
  .content {
    flex: 1;
    min-width: 0;
    padding: 0 0 80px;
  }

  /* ── Doc section ── */
  .doc-section {
    padding: 48px 56px;
    border-bottom: 1px solid var(--border);
    scroll-margin-top: 70px;
  }

  .section-eyebrow {
    font-size: 10px;
    font-weight: 700;
    color: var(--green);
    text-transform: uppercase;
    letter-spacing: .1em;
    margin-bottom: 10px;
  }

  .section-hero {
    font-size: 32px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -.025em;
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
    letter-spacing: -.02em;
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

  .section-desc strong { color: var(--text-dim); }
  .section-desc code {
    font-family: var(--font-mono);
    font-size: 11px;
    background: var(--bg3);
    padding: 1px 5px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border2);
    color: var(--text-dim);
  }

  /* ── Info grid (overview) ── */
  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
  }

  .info-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .06em;
    color: var(--text-ghost);
  }

  .info-value {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-dim);
    background: none;
    border: none;
    padding: 0;
  }

  .spec-download { margin-top: 4px; }

  .spec-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--blue);
    text-decoration: none;
    padding: 6px 10px;
    border: 1px solid rgba(91,156,246,0.2);
    border-radius: var(--radius-sm);
    background: var(--blue-dim);
    transition: all .12s;
  }
  .spec-link:hover { border-color: rgba(91,156,246,0.4); }

  /* ── Auth cards ── */
  .auth-cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .auth-card {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .auth-card-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .auth-card-title {
    font-size: 11px;
    color: var(--text-muted);
  }

  .auth-card-desc {
    font-size: 12px;
    color: var(--text-muted);
    line-height: 1.65;
  }

  .auth-card-desc code {
    font-family: var(--font-mono);
    font-size: 11px;
    background: var(--bg3);
    padding: 1px 5px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border2);
    color: var(--text-dim);
  }

  /* ── Rate card ── */
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
    letter-spacing: -.04em;
    line-height: 1;
  }

  .rate-label {
    font-size: 13px;
    color: var(--text-muted);
  }

  /* ── Tables ── */
  .ref-table, .param-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }

  .ref-table th, .ref-table td,
  .param-table th, .param-table td {
    text-align: left;
    padding: 8px 12px;
    border: 1px solid var(--border);
  }

  .ref-table th, .param-table th {
    background: var(--bg2);
    color: var(--text-muted);
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .06em;
  }

  .ref-table td, .param-table td {
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

  .ref-table strong { color: var(--text-dim); font-weight: 500; }

  /* ── Quickstart steps ── */
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
    border: 1px solid rgba(61,214,140,0.2);
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

  /* ── Tag section header ── */
  .tag-section {
    padding-bottom: 20px;
  }

  .tag-header {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 6px;
  }

  .endpoint-count {
    font-size: 10px;
    color: var(--text-ghost);
    background: var(--bg3);
    border: 1px solid var(--border);
    padding: 2px 7px;
    border-radius: 99px;
  }

  /* ── Endpoint section ── */
  .endpoint-section {
    border-bottom: 1px solid var(--border);
    scroll-margin-top: 70px;
  }

  .ep-header {
    padding: 20px 56px 16px;
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
    padding: 24px 32px 32px 56px;
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .ep-right {
    padding: 24px 56px 32px 32px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    position: sticky;
    top: 50px;
    max-height: calc(100vh - 50px);
    overflow-y: auto;
    scrollbar-width: none;
  }
  .ep-right::-webkit-scrollbar { display: none; }

  /* ── Endpoint blocks ── */
  .ep-block {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .block-title {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .08em;
    color: var(--text-ghost);
    display: flex;
    align-items: center;
    gap: 8px;
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
    border: 1px solid rgba(91,156,246,0.15);
    padding: 1px 6px;
    border-radius: 3px;
    font-family: var(--font-mono);
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

  .req-yes { color: var(--green); }

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

  /* ── Code cards ── */
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
  }

  .code-card-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .06em;
    color: var(--text-ghost);
    flex: 1;
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
    transition: all .1s;
  }
  .tab-btn:hover { color: var(--text-dim); }
  .tab-btn.active { background: var(--bg); color: var(--text); }

  .code-body {
    overflow-x: auto;
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

  .code-body code { background: none; border: none; padding: 0; }

  /* ── Standalone code block ── */
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
  }

  .code-lang {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .06em;
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
    background: transparent;
    border: none;
  }

  .code-block code { background: none; border: none; padding: 0; }

  /* ── Copy button ── */
  .copy-btn {
    font-family: var(--font-mono);
    font-size: 10px;
    padding: 3px 8px;
    background: var(--bg4);
    border: 1px solid var(--border2);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    cursor: pointer;
    transition: all .1s;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .copy-btn:hover { color: var(--text); border-color: var(--border3); }

  /* ── Badges ── */
  .badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .04em;
  }

  .badge-green { background: var(--green-dim); color: var(--green); }
  .badge-blue  { background: var(--blue-dim);  color: var(--blue); }
  .badge-amber { background: var(--amber-dim); color: var(--amber); }

  .method-badge {
    display: inline-flex;
    align-items: center;
    padding: 3px 9px;
    border-radius: 3px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .04em;
    flex-shrink: 0;
  }

  /* sidebar method mini badges */
  .method-get    { background: var(--green-dim); color: var(--green); }
  .method-post   { background: var(--blue-dim);  color: var(--blue); }
  .method-delete { background: var(--red-dim);   color: var(--red); }
  .method-put    { background: var(--amber-dim); color: var(--amber); }
  .method-patch  { background: var(--amber-dim); color: var(--amber); }

  .auth-badge {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 3px;
    border: 1px solid;
  }

  .auth-bearer {
    background: var(--blue-dim);
    color: var(--blue);
    border-color: rgba(91,156,246,0.2);
  }

  .auth-apikey {
    background: var(--green-dim);
    color: var(--green);
    border-color: rgba(61,214,140,0.2);
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
  }

  .scope-green { background: var(--green-dim); color: var(--green); }
  .scope-blue  { background: var(--blue-dim);  color: var(--blue); }
  .scope-amber { background: var(--amber-dim); color: var(--amber); }

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

  .status-2xx { background: var(--green-dim); color: var(--green); }
  .status-4xx { background: var(--amber-dim); color: var(--amber); }
  .status-5xx { background: var(--red-dim);   color: var(--red); }

  /* Syntax */
  .ck { color: var(--green); }
  .cs { color: var(--amber); }

  /* ── Responsive ── */
  @media (max-width: 1100px) {
    .ep-body {
      grid-template-columns: 1fr;
    }
    .ep-left {
      border-right: none;
      border-bottom: 1px solid var(--border);
      padding: 24px 32px;
    }
    .ep-right {
      position: static;
      max-height: none;
      padding: 24px 32px 32px;
    }
    .ep-header {
      padding: 20px 32px 16px;
    }
    .doc-section {
      padding: 40px 32px;
    }
  }

  @media (max-width: 900px) {
    .sidebar {
      position: fixed;
      top: 0;
      left: 0;
      height: 100vh;
      z-index: 200;
      transform: translateX(-100%);
      transition: transform .2s ease;
      width: 240px;
    }
    .sidebar.open { transform: translateX(0); }
    .sidebar-close-row { display: flex; }
    .hamburger { display: flex; }
    .auth-cards { grid-template-columns: 1fr; }
    .ep-left, .ep-right { padding: 20px 24px; }
    .ep-header { padding: 16px 24px 12px; }
    .doc-section { padding: 32px 24px; }
  }

  @media (max-width: 640px) {
    .topbar { padding: 0 16px; }
    .doc-section { padding: 24px 16px; }
    .ep-header { padding: 14px 16px 10px; }
    .ep-left, .ep-right { padding: 16px; }
    .ep-title-row { flex-wrap: wrap; }
    .info-grid { grid-template-columns: 1fr 1fr; }
    .section-hero { font-size: 24px; }
    .topbar-label { display: none; }
  }
</style>
