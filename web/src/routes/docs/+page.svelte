<script lang="ts">
  import { onMount } from "svelte";

  let sidebarOpen = $state(false);
  let activeSection = $state("authentication");

  onMount(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) activeSection = entry.target.id;
        });
      },
      { rootMargin: "-80px 0px -60% 0px" }
    );
    document.querySelectorAll(".doc-section").forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  });

  const sections = [
    { id: "openapi",       label: "OpenAPI Spec" },
    { id: "authentication",label: "Authentication" },
    { id: "scopes",        label: "Scopes" },
    { id: "rate-limiting", label: "Rate Limiting" },
    { id: "files",         label: "Files" },
    { id: "keys",          label: "API Keys" },
    { id: "usage",         label: "Usage" },
    { id: "org",           label: "Organisation" },
    { id: "auth",          label: "Auth" },
    { id: "quickstart",    label: "Quickstart" },
    { id: "errors",        label: "Errors" },
  ];

  const scopes = [
    { name: "read",  desc: "Read files, list files, get usage data" },
    { name: "write", desc: "Upload, delete files, create keys" },
    { name: "admin", desc: "Full access including org management" },
  ];

  const fileTypes = [
    "image/jpeg","image/png","image/gif","image/webp",
    "application/pdf","text/plain","text/csv","application/json",
    "application/zip","application/x-zip-compressed","application/octet-stream",
    "audio/mpeg","audio/wav","video/mp4","video/webp",
  ];

  const errors = [
    { code: 400, msg: "Bad Request — invalid input or missing fields" },
    { code: 401, msg: "Unauthorized — missing or invalid API key / JWT" },
    { code: 403, msg: "Forbidden — insufficient scope or permissions" },
    { code: 404, msg: "Not Found — resource does not exist" },
    { code: 409, msg: "Conflict — resource already exists" },
    { code: 413, msg: "Payload Too Large — file exceeds 100MB limit" },
    { code: 415, msg: "Unsupported Media Type — invalid MIME type" },
    { code: 422, msg: "Unprocessable Entity — validation failed" },
    { code: 429, msg: "Too Many Requests — rate limit exceeded" },
    { code: 500, msg: "Internal Server Error — unexpected server error" },
    { code: 503, msg: "Service Unavailable — backend degraded" },
  ];

  const endpoints = {
    files: [
      {
        method: "POST", path: "/api/v1/files", scope: "write",
        desc: "Upload a new file.",
        body: `file — File (multipart/form-data)`,
        response: `{\n  "id": "550e8400-e29b-41d4-a716-446655440000",\n  "name": "document.pdf",\n  "mimeType": "application/pdf",\n  "sizeBytes": 1024000,\n  "createdAt": "2026-04-10T12:00:00Z"\n}`,
      },
      {
        method: "GET", path: "/api/v1/files", scope: "read",
        desc: "List all files.",
        response: `[{\n  "id": "550e8400-e29b-41d4-a716-446655440000",\n  "name": "document.pdf",\n  "mimeType": "application/pdf",\n  "sizeBytes": 1024000,\n  "createdAt": "2026-04-10T12:00:00Z"\n}]`,
      },
      {
        method: "GET", path: "/api/v1/files/:id", scope: "read",
        desc: "Download a file by ID.",
        params: [{ name: "id", type: "string", desc: "File UUID" }],
        response: `Binary file data with appropriate Content-Type header.`,
        responsePlain: true,
      },
      {
        method: "DELETE", path: "/api/v1/files/:id", scope: "write",
        desc: "Delete a file permanently.",
        params: [{ name: "id", type: "string", desc: "File UUID" }],
        response: `{\n  "message": "File deleted",\n  "id": "550e8400-e29b-41d4-a716-446655440000"\n}`,
      },
    ],
    keys: [
      {
        method: "POST", path: "/api/v1/keys", auth: "Bearer JWT",
        desc: "Create a new API key.",
        body: `{ "name": "Production Key", "scopes": ["read", "write"] }`,
        response: `{\n  "id": "550e8400-e29b-41d4-a716-446655440000",\n  "name": "Production Key",\n  "key_prefix": "kyr_abc123",\n  "scopes": ["read", "write"],\n  "key": "kyr_abc123xyz...",\n  "created_at": "2026-04-10T12:00:00Z"\n}`,
      },
      {
        method: "GET", path: "/api/v1/keys", auth: "Bearer JWT",
        desc: "List all API keys for the authenticated user.",
        response: `[{\n  "id": "550e8400-e29b-41d4-a716-446655440000",\n  "name": "Production Key",\n  "key_prefix": "kyr_abc123",\n  "scopes": ["read", "write"],\n  "last_used_at": "2026-04-10T12:00:00Z",\n  "revoked_at": null,\n  "created_at": "2026-04-10T12:00:00Z"\n}]`,
      },
      {
        method: "DELETE", path: "/api/v1/keys/:id", auth: "Bearer JWT",
        desc: "Revoke an API key permanently.",
        response: `{\n  "message": "API key revoked",\n  "id": "550e8400-e29b-41d4-a716-446655440000"\n}`,
      },
    ],
    usage: [
      {
        method: "GET", path: "/api/v1/usage", auth: "Bearer JWT",
        desc: "Get overall usage statistics.",
        response: `{\n  "total_requests": 1250,\n  "total_bytes_in": 52428800,\n  "total_bytes_out": 104857600,\n  "total_storage": 1073741824,\n  "active_api_keys": 3\n}`,
      },
      {
        method: "GET", path: "/api/v1/usage/daily", auth: "Bearer JWT",
        desc: "Get daily usage breakdown.",
        params: [
          { name: "start_date", type: "string", desc: "ISO date (optional)" },
          { name: "end_date",   type: "string", desc: "ISO date (optional)" },
        ],
        response: `[{\n  "date": "2026-04-10",\n  "requests": 150,\n  "bytes_in": 5242880,\n  "bytes_out": 10485760\n}]`,
      },
    ],
    org: [
      {
        method: "GET", path: "/api/v1/org", auth: "Bearer JWT",
        desc: "Get the current organisation.",
        response: `{\n  "id": "550e8400-e29b-41d4-a716-446655440000",\n  "name": "Acme Inc",\n  "slug": "acme-inc",\n  "plan": "free",\n  "createdAt": "2026-04-10T12:00:00Z"\n}`,
      },
      {
        method: "GET", path: "/api/v1/org/members", auth: "Bearer JWT",
        desc: "List all organisation members.",
        response: `[{\n  "id": "550e8400-e29b-41d4-a716-446655440000",\n  "email": "admin@acme.com",\n  "role": "owner",\n  "createdAt": "2026-04-10T12:00:00Z"\n}]`,
      },
      {
        method: "POST", path: "/api/v1/org/members", auth: "Bearer JWT · owner only",
        desc: "Invite a new member to the organisation.",
        body: `{ "email": "user@acme.com", "password": "secure123", "role": "member" }`,
        response: `{ "id": "...", "email": "user@acme.com", "role": "member" }`,
      },
      {
        method: "DELETE", path: "/api/v1/org/members/:id", auth: "Bearer JWT · owner/admin",
        desc: "Remove a member from the organisation.",
        response: `204 No Content`,
        responsePlain: true,
      },
    ],
    auth: [
      {
        method: "POST", path: "/api/v1/auth/register",
        desc: "Register a new organisation and admin user.",
        body: `{ "orgName": "Acme Inc", "email": "admin@acme.com", "password": "secure123" }`,
        response: `{\n  "token": "eyJhbGciOiJIUzI1NiIs...",\n  "user": {\n    "id": "550e8400-e29b-41d4-a716-446655440000",\n    "email": "admin@acme.com",\n    "role": "owner",\n    "orgId": "550e8400-e29b-41d4-a716-446655440000"\n  }\n}`,
      },
      {
        method: "POST", path: "/api/v1/auth/login",
        desc: "Login with email and password to receive a JWT.",
        body: `{ "email": "admin@acme.com", "password": "secure123" }`,
        response: `{\n  "token": "eyJhbGciOiJIUzI1NiIs...",\n  "user": { "id": "...", "email": "...", "role": "owner", "orgId": "..." }\n}`,
      },
      {
        method: "GET", path: "/api/v1/auth/me", auth: "Bearer JWT",
        desc: "Get the current authenticated user.",
        response: `{\n  "id": "550e8400-e29b-41d4-a716-446655440000",\n  "email": "admin@acme.com",\n  "role": "owner",\n  "orgId": "550e8400-e29b-41d4-a716-446655440000"\n}`,
      },
    ],
  };
</script>

<svelte:head>
  <title>Docs — Kyro</title>
</svelte:head>

<div class="page">
  <!-- HEADER -->
  <header class="header">
    <a href="/" class="logo">
      <div class="logo-mark">
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M2 2L6 10L10 2" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      kyro
    </a>
    <nav class="header-nav">
      <button class="hamburger" onclick={() => (sidebarOpen = true)} aria-label="Open menu">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
      <a href="/health">status</a>
      <a href="/login">sign in</a>
    </nav>
  </header>

  <div class="layout">
    <!-- OVERLAY -->
    {#if sidebarOpen}
      <div class="overlay" onclick={() => (sidebarOpen = false)}></div>
    {/if}

    <!-- SIDEBAR -->
    <aside class="sidebar" class:open={sidebarOpen}>
      <div class="sidebar-header">
        <span>docs</span>
        <button class="sidebar-close" onclick={() => (sidebarOpen = false)}>✕</button>
      </div>
      <span class="sidebar-group-label">reference</span>
      <nav class="sidebar-nav">
        {#each sections as s}
          <a
            href="#{s.id}"
            class="sidebar-link"
            class:active={activeSection === s.id}
            onclick={() => (sidebarOpen = false)}
          >{s.label}</a>
        {/each}
      </nav>
    </aside>

    <!-- MAIN -->
    <main class="content">

      <!-- OPENAPI -->
      <section id="openapi" class="doc-section">
        <h2 class="section-title">OpenAPI 3.1 Specification</h2>
        <p class="section-desc">The complete API specification as an OpenAPI 3.1 document — the single source of truth for the Kyro API.</p>

        <div class="card-grid">
          <div class="card">
            <h3><span class="chip chip-green">OpenAPI YAML</span></h3>
            <p>Full API spec with all endpoints, schemas, and examples.</p>
            <a href="/openapi.yaml" target="_blank" class="spec-link">
              View OpenAPI spec
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </a>
          </div>
          <div class="card">
            <h3><span class="chip chip-blue">Generated SDKs</span></h3>
            <p>Auto-generate TypeScript, Python, Go, and more from this spec.</p>
            <div class="tag-row">
              {#each ["TypeScript","Python","Go","Java","Rust"] as lang}
                <span class="tag">{lang}</span>
              {/each}
            </div>
          </div>
        </div>

        <h4 class="field-label">Specification details</h4>
        <table class="data-table">
          <tbody>
            <tr><td class="td-key">Version</td><td><code>3.1.0</code></td></tr>
            <tr><td class="td-key">Format</td><td><code>YAML</code></td></tr>
            <tr><td class="td-key">Base URL</td><td><code>/api/v1</code></td></tr>
            <tr><td class="td-key">Auth methods</td><td><code>Bearer JWT</code> &nbsp;<code>X-API-Key</code></td></tr>
          </tbody>
        </table>
      </section>

      <!-- AUTHENTICATION -->
      <section id="authentication" class="doc-section">
        <h2 class="section-title">Authentication</h2>
        <p class="section-desc">Kyro supports two authentication methods depending on the endpoint.</p>

        <div class="auth-grid">
          <div class="auth-card">
            <h3><span class="chip chip-green">API Key</span> For API requests</h3>
            <p>Pass your API key in the <code>X-Api-Key</code> header:</p>
            <pre><code><span class="ck">X-Api-Key</span>: <span class="cs">kyr_abc123xyz...</span></code></pre>
            <p class="hint">Use for files, key listing, and usage endpoints.</p>
          </div>
          <div class="auth-card">
            <h3><span class="chip chip-blue">JWT</span> For user actions</h3>
            <p>Pass your JWT in the <code>Authorization</code> header:</p>
            <pre><code><span class="ck">Authorization</span>: <span class="cs">Bearer eyJhbGci...</span></code></pre>
            <p class="hint">Use for creating keys, org management, and usage data.</p>
          </div>
        </div>
      </section>

      <!-- SCOPES -->
      <section id="scopes" class="doc-section">
        <h2 class="section-title">Scopes</h2>
        <p class="section-desc">API keys are scoped to control access. Request the minimum scope needed.</p>

        <div class="scopes-grid">
          {#each scopes as scope}
            <div class="scope-card">
              <span class="scope-name">{scope.name}</span>
              <p class="scope-desc">{scope.desc}</p>
            </div>
          {/each}
        </div>

        <h4 class="field-label">Example — minimum necessary scope</h4>
        <pre><code>{`{
  "name": "Read-only Key",
  "scopes": ["read"]
}`}</code></pre>
      </section>

      <!-- RATE LIMITING -->
      <section id="rate-limiting" class="doc-section">
        <h2 class="section-title">Rate Limiting</h2>
        <p class="section-desc">All API requests are rate-limited to protect your infrastructure.</p>

        <div class="rate-hero">
          <span class="rate-num">100</span>
          <span class="rate-unit">requests / minute</span>
        </div>

        <h4 class="field-label">Response headers</h4>
        <table class="data-table">
          <thead><tr><th>Header</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td><code>X-RateLimit-Limit</code></td><td>Maximum requests per window</td></tr>
            <tr><td><code>X-RateLimit-Remaining</code></td><td>Requests remaining in window</td></tr>
            <tr><td><code>X-RateLimit-Reset</code></td><td>Unix timestamp when limit resets</td></tr>
          </tbody>
        </table>

        <h4 class="field-label">429 response body</h4>
        <pre><code>{`{\n  "error": "Too many requests",\n  "retryAfter": 45.5\n}`}</code></pre>
      </section>

      <!-- FILES -->
      <section id="files" class="doc-section">
        <h2 class="section-title">Files</h2>
        <p class="section-desc">Upload, list, download, and delete files. Files are served via CDN.</p>

        <h4 class="field-label">Allowed MIME types</h4>
        <div class="file-types">
          {#each fileTypes as t}<span class="type-chip">{t}</span>{/each}
        </div>

        <h4 class="field-label">Limits</h4>
        <ul class="limits-list">
          <li>Maximum file size: <strong>100MB</strong></li>
          <li>Storage quota: varies by plan (default 1GB)</li>
          <li>Upload format: <code>multipart/form-data</code> with <code>file</code> field</li>
        </ul>

        <h4 class="field-label" style="margin-top:28px">Endpoints</h4>
        {#each endpoints.files as ep}
          <div class="endpoint">
            <div class="ep-head">
              <span class="method method-{ep.method.toLowerCase()}">{ep.method}</span>
              <span class="ep-path">{ep.path}</span>
              {#if ep.scope}<span class="scope-badge">requires: {ep.scope}</span>{/if}
            </div>
            <div class="ep-body">
              <div class="ep-row"><p class="ep-desc">{ep.desc}</p></div>
              {#if ep.body}
                <div class="ep-row">
                  <span class="ep-label">Body</span>
                  <p class="ep-plain">{ep.body}</p>
                </div>
              {/if}
              {#if ep.params}
                <div class="ep-row">
                  <span class="ep-label">Path params</span>
                  <ul class="params-list">
                    {#each ep.params as p}<li><code>{p.name}</code> ({p.type}) — {p.desc}</li>{/each}
                  </ul>
                </div>
              {/if}
              <div class="ep-row">
                <span class="ep-label">Response</span>
                {#if ep.responsePlain}
                  <p class="ep-plain"><code>{ep.response}</code></p>
                {:else}
                  <pre><code>{ep.response}</code></pre>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </section>

      <!-- API KEYS -->
      <section id="keys" class="doc-section">
        <h2 class="section-title">API Keys</h2>
        <p class="section-desc">Create, list, and revoke API keys for programmatic access. All key management requires a JWT token.</p>

        {#each endpoints.keys as ep}
          <div class="endpoint">
            <div class="ep-head">
              <span class="method method-{ep.method.toLowerCase()}">{ep.method}</span>
              <span class="ep-path">{ep.path}</span>
              {#if ep.auth}<span class="scope-badge auth-badge">{ep.auth}</span>{/if}
            </div>
            <div class="ep-body">
              <div class="ep-row"><p class="ep-desc">{ep.desc}</p></div>
              {#if ep.body}
                <div class="ep-row">
                  <span class="ep-label">Body</span>
                  <pre><code>{ep.body}</code></pre>
                </div>
              {/if}
              <div class="ep-row">
                <span class="ep-label">Response</span>
                <pre><code>{ep.response}</code></pre>
              </div>
            </div>
          </div>
        {/each}
      </section>

      <!-- USAGE -->
      <section id="usage" class="doc-section">
        <h2 class="section-title">Usage</h2>
        <p class="section-desc">Track API usage, bandwidth, and storage consumption.</p>

        {#each endpoints.usage as ep}
          <div class="endpoint">
            <div class="ep-head">
              <span class="method method-{ep.method.toLowerCase()}">{ep.method}</span>
              <span class="ep-path">{ep.path}</span>
              <span class="scope-badge auth-badge">{ep.auth}</span>
            </div>
            <div class="ep-body">
              <div class="ep-row"><p class="ep-desc">{ep.desc}</p></div>
              {#if ep.params}
                <div class="ep-row">
                  <span class="ep-label">Query params</span>
                  <ul class="params-list">
                    {#each ep.params as p}<li><code>{p.name}</code> ({p.type}) — {p.desc}</li>{/each}
                  </ul>
                </div>
              {/if}
              <div class="ep-row">
                <span class="ep-label">Response</span>
                <pre><code>{ep.response}</code></pre>
              </div>
            </div>
          </div>
        {/each}
      </section>

      <!-- ORGANISATION -->
      <section id="org" class="doc-section">
        <h2 class="section-title">Organisation</h2>
        <p class="section-desc">Manage your organisation, view members, and invite new users.</p>

        {#each endpoints.org as ep}
          <div class="endpoint">
            <div class="ep-head">
              <span class="method method-{ep.method.toLowerCase()}">{ep.method}</span>
              <span class="ep-path">{ep.path}</span>
              {#if ep.auth}<span class="scope-badge auth-badge">{ep.auth}</span>{/if}
            </div>
            <div class="ep-body">
              <div class="ep-row"><p class="ep-desc">{ep.desc}</p></div>
              {#if ep.body}
                <div class="ep-row">
                  <span class="ep-label">Body</span>
                  <pre><code>{ep.body}</code></pre>
                </div>
              {/if}
              <div class="ep-row">
                <span class="ep-label">Response</span>
                {#if ep.responsePlain}
                  <p class="ep-plain"><code>{ep.response}</code></p>
                {:else}
                  <pre><code>{ep.response}</code></pre>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </section>

      <!-- AUTH -->
      <section id="auth" class="doc-section">
        <h2 class="section-title">Auth</h2>
        <p class="section-desc">Register new organisations and authenticate users.</p>

        {#each endpoints.auth as ep}
          <div class="endpoint">
            <div class="ep-head">
              <span class="method method-{ep.method.toLowerCase()}">{ep.method}</span>
              <span class="ep-path">{ep.path}</span>
              {#if ep.auth}<span class="scope-badge auth-badge">{ep.auth}</span>{/if}
            </div>
            <div class="ep-body">
              <div class="ep-row"><p class="ep-desc">{ep.desc}</p></div>
              {#if ep.body}
                <div class="ep-row">
                  <span class="ep-label">Body</span>
                  <pre><code>{ep.body}</code></pre>
                </div>
              {/if}
              <div class="ep-row">
                <span class="ep-label">Response</span>
                <pre><code>{ep.response}</code></pre>
              </div>
            </div>
          </div>
        {/each}
      </section>

      <!-- QUICKSTART -->
      <section id="quickstart" class="doc-section">
        <h2 class="section-title">Quickstart</h2>
        <p class="section-desc">Complete example: create a key, upload a file, and get its URL.</p>

        <div class="steps">
          <div class="step">
            <div class="step-num">01</div>
            <div class="step-body">
              <h4>Create an API key</h4>
              <pre><code><span class="cc">// Login via dashboard first, then:</span>
<span class="ck">const</span> res = <span class="ck">await</span> fetch(<span class="cs">'/api/v1/keys'</span>, &#123;
  method: <span class="cs">'POST'</span>,
  headers: &#123;
    <span class="cs">'Content-Type'</span>: <span class="cs">'application/json'</span>,
    <span class="cs">'Authorization'</span>: <span class="cs">`Bearer $&#123;jwt&#125;`</span>
  &#125;,
  body: JSON.stringify(&#123; name: <span class="cs">'my-key'</span>, scopes: [<span class="cs">'read'</span>, <span class="cs">'write'</span>] &#125;)
&#125;);
<span class="ck">const</span> &#123; key: apiKey &#125; = <span class="ck">await</span> res.json(); <span class="cc">// "kyr_abc123..."</span></code></pre>
            </div>
          </div>

          <div class="step">
            <div class="step-num">02</div>
            <div class="step-body">
              <h4>Upload a file</h4>
              <pre><code><span class="ck">const</span> form = <span class="ck">new</span> FormData();
form.append(<span class="cs">'file'</span>, fileInput.files[0]);

<span class="ck">const</span> res = <span class="ck">await</span> fetch(<span class="cs">'/api/v1/files'</span>, &#123;
  method: <span class="cs">'POST'</span>,
  headers: &#123; <span class="cs">'X-Api-Key'</span>: apiKey &#125;,
  body: form
&#125;);
<span class="ck">const</span> file = <span class="ck">await</span> res.json();
<span class="cc">// &#123; id: "550e...", name: "doc.pdf", ... &#125;</span></code></pre>
            </div>
          </div>

          <div class="step">
            <div class="step-num">03</div>
            <div class="step-body">
              <h4>Download or get CDN URL</h4>
              <pre><code><span class="cc">// Download directly:</span>
<span class="ck">const</span> res = <span class="ck">await</span> fetch(<span class="cs">`/api/v1/files/$&#123;file.id&#125;`</span>, &#123;
  headers: &#123; <span class="cs">'X-Api-Key'</span>: apiKey &#125;
&#125;);

<span class="cc">// Or construct public CDN URL:</span>
<span class="ck">const</span> url = <span class="cs">`https://cdn.kyro.dev/$&#123;orgSlug&#125;/$&#123;file.name&#125;`</span>;</code></pre>
            </div>
          </div>
        </div>

        <h4 class="field-label">cURL equivalent</h4>
        <pre><code><span class="cc"># Upload a file</span>
curl -X POST https://api.kyro.io/api/v1/files \
  -H <span class="cs">"X-Api-Key: kyr_abc123..."</span> \
  -F <span class="cs">"file=@document.pdf"</span></code></pre>
      </section>

      <!-- ERRORS -->
      <section id="errors" class="doc-section">
        <h2 class="section-title">Errors</h2>
        <p class="section-desc">Standard HTTP error codes returned by the API.</p>

        <table class="errors-table">
          <thead><tr><th>Code</th><th>Description</th></tr></thead>
          <tbody>
            {#each errors as err}
              <tr>
                <td>
                  <span class="err-code" class:err-4xx={err.code < 500} class:err-5xx={err.code >= 500}>
                    {err.code}
                  </span>
                </td>
                <td>{err.msg}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </section>

    </main>
  </div>
</div>

<style>
  /* ─── TOKENS ─── */
  :root {
    --bg:           #0a0a0a;
    --bg2:          #111111;
    --bg3:          #181818;
    --bg4:          #222222;
    --border:       rgba(255,255,255,0.07);
    --border2:      rgba(255,255,255,0.13);
    --text:         #f0ede8;
    --text-dim:     #c8c4bc;
    --text-muted:   #8a8680;
    --text-ghost:   #4a4845;
    --green:        #4ade80;
    --green-dim:    rgba(74,222,128,0.10);
    --blue:         #60a5fa;
    --blue-dim:     rgba(96,165,250,0.10);
    --red:          #f87171;
    --red-dim:      rgba(248,113,113,0.10);
    --amber:        #fbbf24;
    --amber-dim:    rgba(251,191,36,0.10);
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .page {
    font-family: 'IBM Plex Mono', 'Fira Code', 'Cascadia Code', ui-monospace, monospace;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    font-size: 13px;
    line-height: 1.6;
  }

  /* ─── HEADER ─── */
  .header {
    position: sticky;
    top: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 32px;
    height: 52px;
    background: rgba(10,10,10,0.94);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    font-weight: 600;
    color: var(--text);
    text-decoration: none;
    letter-spacing: -0.02em;
  }

  .logo-mark {
    width: 22px;
    height: 22px;
    background: var(--text);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--bg);
  }

  .header-nav {
    display: flex;
    align-items: center;
    gap: 24px;
  }

  .header-nav a {
    font-size: 12px;
    color: var(--text-muted);
    text-decoration: none;
    transition: color .15s;
  }
  .header-nav a:hover { color: var(--text); }

  .hamburger {
    display: none;
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 4px;
  }

  /* ─── LAYOUT ─── */
  .layout {
    display: flex;
    max-width: 1300px;
    margin: 0 auto;
  }

  /* ─── OVERLAY ─── */
  .overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.65);
    z-index: 199;
  }

  /* ─── SIDEBAR ─── */
  .sidebar {
    width: 210px;
    flex-shrink: 0;
    position: sticky;
    top: 52px;
    height: calc(100vh - 52px);
    overflow-y: auto;
    border-right: 1px solid var(--border);
    padding: 20px 0;
    background: var(--bg);
  }

  .sidebar::-webkit-scrollbar { width: 0; }

  .sidebar-header {
    display: none;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 8px;
  }

  .sidebar-header span {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
  }

  .sidebar-close {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 13px;
    padding: 2px;
  }

  .sidebar-group-label {
    display: block;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: var(--text-ghost);
    padding: 0 16px;
    margin-bottom: 8px;
  }

  .sidebar-nav {
    display: flex;
    flex-direction: column;
  }

  .sidebar-link {
    display: block;
    font-size: 12px;
    color: var(--text-muted);
    text-decoration: none;
    padding: 6px 16px;
    border-left: 2px solid transparent;
    transition: all .12s;
  }
  .sidebar-link:hover { color: var(--text-dim); background: var(--bg2); }
  .sidebar-link.active {
    color: var(--text);
    border-left-color: var(--text);
    background: var(--bg2);
  }

  /* ─── CONTENT ─── */
  .content {
    flex: 1;
    padding: 48px 56px;
    min-width: 0;
    max-width: 860px;
  }

  .doc-section {
    margin-bottom: 72px;
    scroll-margin-top: 72px;
  }

  .section-title {
    font-size: 22px;
    font-weight: 600;
    color: var(--text);
    letter-spacing: -0.03em;
    margin-bottom: 8px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border);
  }

  .section-desc {
    font-size: 13px;
    color: var(--text-muted);
    margin-bottom: 28px;
    line-height: 1.7;
  }

  .field-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: var(--text-ghost);
    margin: 20px 0 10px;
  }

  /* ─── CARDS ─── */
  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 12px;
    margin-bottom: 24px;
  }

  .card {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 20px;
  }

  .card h3 {
    font-size: 12px;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .card p {
    font-size: 12px;
    color: var(--text-muted);
    margin-bottom: 14px;
    line-height: 1.6;
  }

  .spec-link {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    color: var(--blue);
    text-decoration: none;
    transition: color .12s;
  }
  .spec-link:hover { color: var(--text); }

  .tag-row { display: flex; flex-wrap: wrap; gap: 6px; }

  .tag {
    font-size: 11px;
    background: var(--bg4);
    color: var(--text-muted);
    border: 1px solid var(--border);
    padding: 2px 8px;
    border-radius: 3px;
  }

  /* ─── CHIPS ─── */
  .chip {
    display: inline-flex;
    align-items: center;
    padding: 2px 7px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: .05em;
    text-transform: uppercase;
  }
  .chip-green { background: var(--green-dim); color: var(--green); }
  .chip-blue  { background: var(--blue-dim);  color: var(--blue); }

  /* ─── CODE ─── */
  pre, code { font-family: inherit; }

  pre {
    background: var(--bg3);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 14px 16px;
    overflow-x: auto;
    font-size: 12px;
    line-height: 1.65;
    color: var(--text-dim);
    margin: 0;
  }

  code {
    font-size: 12px;
    background: var(--bg3);
    padding: 2px 6px;
    border-radius: 3px;
    color: var(--text-dim);
    border: 1px solid var(--border);
  }

  pre code {
    background: none;
    padding: 0;
    border: none;
    font-size: inherit;
    color: inherit;
  }

  /* syntax */
  .ck { color: var(--green); }
  .cs { color: #d4a854; }
  .cc { color: var(--text-ghost); font-style: italic; }

  /* ─── TABLES ─── */
  .data-table, .errors-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    margin-bottom: 20px;
  }

  .data-table th, .data-table td,
  .errors-table th, .errors-table td {
    text-align: left;
    padding: 10px 14px;
    border: 1px solid var(--border);
  }

  .data-table th, .errors-table th {
    background: var(--bg2);
    color: var(--text-dim);
    font-weight: 600;
    font-size: 11px;
    letter-spacing: .04em;
    text-transform: uppercase;
  }

  .data-table td, .errors-table td {
    background: var(--bg);
    color: var(--text-muted);
  }

  .td-key { color: var(--text-muted); width: 140px; }

  /* ─── AUTH GRID ─── */
  .auth-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 12px;
  }

  .auth-card {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 20px;
  }

  .auth-card h3 {
    font-size: 12px;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .auth-card p {
    font-size: 12px;
    color: var(--text-muted);
    margin-bottom: 8px;
  }

  .auth-card pre { margin-bottom: 0; }

  .hint {
    font-size: 11px;
    color: var(--text-ghost);
    margin-top: 10px;
  }

  /* ─── SCOPES ─── */
  .scopes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 10px;
    margin-bottom: 20px;
  }

  .scope-card {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 16px;
  }

  .scope-name {
    display: inline-block;
    font-size: 11px;
    font-weight: 600;
    color: var(--green);
    background: var(--green-dim);
    padding: 2px 8px;
    border-radius: 3px;
    margin-bottom: 8px;
  }

  .scope-desc {
    font-size: 12px;
    color: var(--text-muted);
    line-height: 1.5;
  }

  /* ─── RATE LIMIT ─── */
  .rate-hero {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 24px;
  }

  .rate-num {
    font-size: 40px;
    font-weight: 600;
    color: var(--green);
    letter-spacing: -0.04em;
    line-height: 1;
  }

  .rate-unit {
    font-size: 14px;
    color: var(--text-muted);
  }

  /* ─── FILE TYPES ─── */
  .file-types {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 20px;
  }

  .type-chip {
    font-size: 11px;
    background: var(--bg3);
    color: var(--text-muted);
    padding: 3px 8px;
    border-radius: 3px;
    border: 1px solid var(--border);
  }

  /* ─── LIMITS ─── */
  .limits-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .limits-list li {
    font-size: 12px;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .limits-list li::before {
    content: '';
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: var(--text-ghost);
    flex-shrink: 0;
  }

  .limits-list strong { color: var(--text-dim); }

  /* ─── ENDPOINTS ─── */
  .endpoint {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 8px;
    margin-bottom: 10px;
    overflow: hidden;
  }

  .ep-head {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px 16px;
    background: var(--bg3);
    border-bottom: 1px solid var(--border);
    flex-wrap: wrap;
  }

  .method {
    font-size: 10px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 3px;
    letter-spacing: .05em;
    text-transform: uppercase;
    flex-shrink: 0;
  }

  .method-get    { background: var(--green-dim); color: var(--green); }
  .method-post   { background: var(--blue-dim);  color: var(--blue); }
  .method-delete { background: var(--red-dim);   color: var(--red); }

  .ep-path {
    font-size: 13px;
    color: var(--text);
    flex: 1;
  }

  .scope-badge {
    font-size: 10px;
    color: var(--text-ghost);
    background: var(--bg4);
    border: 1px solid var(--border);
    padding: 2px 8px;
    border-radius: 3px;
    margin-left: auto;
    white-space: nowrap;
  }

  .auth-badge {
    color: var(--amber);
    background: var(--amber-dim);
    border-color: rgba(251,191,36,0.15);
    margin-left: 0;
  }

  .ep-body {}

  .ep-row {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .ep-row:last-child { border-bottom: none; }

  .ep-desc { font-size: 12px; color: var(--text-muted); }

  .ep-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: var(--text-ghost);
  }

  .ep-plain { font-size: 12px; color: var(--text-muted); }

  .params-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .params-list li { font-size: 12px; color: var(--text-muted); }
  .params-list code { color: var(--text-dim); }

  /* ─── QUICKSTART ─── */
  .steps {
    display: flex;
    flex-direction: column;
    gap: 24px;
    margin-bottom: 28px;
  }

  .step { display: flex; gap: 16px; }

  .step-num {
    font-size: 11px;
    font-weight: 700;
    color: var(--green);
    background: var(--green-dim);
    border: 1px solid rgba(74,222,128,0.18);
    width: 34px;
    height: 34px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .step-body { flex: 1; min-width: 0; }
  .step-body h4 {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 10px;
  }

  /* ─── ERROR CODES ─── */
  .err-code {
    font-weight: 700;
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 3px;
  }
  .err-4xx { background: var(--amber-dim); color: var(--amber); }
  .err-5xx { background: var(--red-dim);   color: var(--red); }

  /* ─── RESPONSIVE ─── */
  @media (max-width: 900px) {
    .hamburger { display: flex; }

    .sidebar {
      position: fixed;
      top: 0;
      left: 0;
      height: 100vh;
      z-index: 200;
      transform: translateX(-100%);
      transition: transform .2s ease;
    }

    .sidebar.open { transform: translateX(0); }
    .sidebar-header { display: flex; }

    .content { padding: 28px 20px; }
    .header  { padding: 0 16px; }
    .auth-grid { grid-template-columns: 1fr; }
  }

  @media (max-width: 640px) {
    .content { padding: 20px 16px; }
    .section-title { font-size: 18px; }
    .ep-head { flex-direction: column; align-items: flex-start; }
    .scope-badge { margin-left: 0; }
    .card-grid { grid-template-columns: 1fr; }
  }
</style>
