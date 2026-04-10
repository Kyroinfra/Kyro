<script lang="ts">
  import Logo from "$lib/components/Logo.svelte";

  const sections = [
    { id: "authentication", label: "Authentication" },
    { id: "scopes", label: "Scopes" },
    { id: "rate-limiting", label: "Rate Limiting" },
    { id: "files", label: "Files" },
    { id: "keys", label: "API Keys" },
    { id: "usage", label: "Usage" },
    { id: "org", label: "Organisation" },
    { id: "auth", label: "Auth" },
    { id: "quickstart", label: "Quickstart" },
    { id: "errors", label: "Errors" },
  ];

  const scopes = [
    { name: "read", desc: "Read files, list files, get usage data" },
    { name: "write", desc: "Upload, delete files, create keys" },
    { name: "admin", desc: "Full access including org management" },
  ];

  const fileTypes = [
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf", "text/plain", "text/csv", "application/json",
    "application/zip", "application/x-zip-compressed", "application/octet-stream",
    "audio/mpeg", "audio/wav", "video/mp4", "video/webp"
  ];

  const errors = [
    { code: 400, msg: "Bad Request - Invalid input or missing fields" },
    { code: 401, msg: "Unauthorized - Missing or invalid API key / JWT token" },
    { code: 403, msg: "Forbidden - Insufficient scope or permissions" },
    { code: 404, msg: "Not Found - Resource does not exist" },
    { code: 409, msg: "Conflict - Resource already exists" },
    { code: 413, msg: "Payload Too Large - File exceeds 100MB limit" },
    { code: 415, msg: "Unsupported Media Type - Invalid file MIME type" },
    { code: 422, msg: "Unprocessable Entity - Validation failed" },
    { code: 429, msg: "Too Many Requests - Rate limit exceeded" },
    { code: 500, msg: "Internal Server Error - Unexpected server error" },
    { code: 503, msg: "Service Unavailable - Backend degraded" },
  ];

  const endpoints = {
    files: [
      {
        method: "POST",
        path: "/api/v1/files",
        desc: "Upload a new file",
        scope: "write",
        body: { file: "File (multipart/form-data)" },
        response: `{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "document.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 1024000,
  "createdAt": "2026-04-10T12:00:00Z"
}`,
        errors: [400, 413, 415, 403, 500]
      },
      {
        method: "GET",
        path: "/api/v1/files",
        desc: "List all files",
        scope: "read",
        params: [],
        response: `[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "document.pdf",
    "mimeType": "application/pdf",
    "sizeBytes": 1024000,
    "createdAt": "2026-04-10T12:00:00Z"
  }
]`,
        errors: [500]
      },
      {
        method: "GET",
        path: "/api/v1/files/:id",
        desc: "Download a file",
        scope: "read",
        params: [{ name: "id", type: "string", desc: "File ID" }],
        response: "Binary file data with appropriate Content-Type header",
        errors: [404, 500]
      },
      {
        method: "DELETE",
        path: "/api/v1/files/:id",
        desc: "Delete a file",
        scope: "write",
        params: [{ name: "id", type: "string", desc: "File ID" }],
        response: `{
  "message": "File deleted",
  "id": "550e8400-e29b-41d4-a716-446655440000"
}`,
        errors: [404, 500]
      }
    ],
    keys: [
      {
        method: "POST",
        path: "/api/v1/keys",
        desc: "Create a new API key (JWT required)",
        auth: "Bearer JWT",
        body: `{ "name": "Production Key", "scopes": ["read", "write"] }`,
        response: `{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Production Key",
  "key_prefix": "kyr_abc123",
  "scopes": ["read", "write"],
  "key": "kyr_abc123xyz...",
  "created_at": "2026-04-10T12:00:00Z"
}`,
        errors: [400, 401, 403, 500]
      },
      {
        method: "GET",
        path: "/api/v1/keys",
        desc: "List all API keys (JWT required)",
        auth: "Bearer JWT",
        response: `[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Production Key",
    "key_prefix": "kyr_abc123",
    "scopes": ["read", "write"],
    "last_used_at": "2026-04-10T12:00:00Z",
    "revoked_at": null,
    "created_at": "2026-04-10T12:00:00Z"
  }
]`,
        errors: [401, 500]
      },
      {
        method: "DELETE",
        path: "/api/v1/keys/:id",
        desc: "Revoke an API key (JWT required)",
        auth: "Bearer JWT",
        response: `{
  "message": "API key revoked",
  "id": "550e8400-e29b-41d4-a716-446655440000"
}`,
        errors: [401, 404, 500]
      }
    ],
    usage: [
      {
        method: "GET",
        path: "/api/v1/usage",
        desc: "Get overall usage statistics (JWT required)",
        auth: "Bearer JWT",
        response: `{
  "total_requests": 1250,
  "total_bytes_in": 52428800,
  "total_bytes_out": 104857600,
  "total_storage": 1073741824,
  "active_api_keys": 3
}`,
        errors: [401, 500]
      },
      {
        method: "GET",
        path: "/api/v1/usage/daily",
        desc: "Get daily usage breakdown (JWT required)",
        auth: "Bearer JWT",
        params: [
          { name: "start_date", type: "string", desc: "ISO date (optional)" },
          { name: "end_date", type: "string", desc: "ISO date (optional)" }
        ],
        response: `[
  {
    "date": "2026-04-10",
    "requests": 150,
    "bytes_in": 5242880,
    "bytes_out": 10485760
  }
]`,
        errors: [401, 500]
      }
    ],
    org: [
      {
        method: "GET",
        path: "/api/v1/org",
        desc: "Get current organisation (JWT required)",
        auth: "Bearer JWT",
        response: `{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Acme Inc",
  "slug": "acme-inc",
  "plan": "free",
  "createdAt": "2026-04-10T12:00:00Z"
}`,
        errors: [401, 404, 500]
      },
      {
        method: "GET",
        path: "/api/v1/org/members",
        desc: "List organisation members (JWT required)",
        auth: "Bearer JWT",
        response: `[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "admin@acme.com",
    "role": "owner",
    "createdAt": "2026-04-10T12:00:00Z"
  }
]`,
        errors: [401, 500]
      },
      {
        method: "POST",
        path: "/api/v1/org/members",
        desc: "Invite a new member (JWT required, owner only)",
        auth: "Bearer JWT",
        body: `{ "email": "user@acme.com", "password": "secure123", "role": "member" }`,
        response: `{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@acme.com",
  "role": "member"
}`,
        errors: [400, 401, 403, 500]
      },
      {
        method: "DELETE",
        path: "/api/v1/org/members/:id",
        desc: "Remove a member (JWT required, owner/admin)",
        auth: "Bearer JWT",
        response: "204 No Content",
        errors: [401, 403, 404, 500]
      }
    ],
    auth: [
      {
        method: "POST",
        path: "/api/v1/auth/register",
        desc: "Register a new organisation and user",
        body: `{ "orgName": "Acme Inc", "email": "admin@acme.com", "password": "secure123" }`,
        response: `{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "admin@acme.com",
    "role": "owner",
    "orgId": "550e8400-e29b-41d4-a716-446655440000"
  }
}`,
        errors: [400, 500]
      },
      {
        method: "POST",
        path: "/api/v1/auth/login",
        desc: "Login with email and password",
        body: `{ "email": "admin@acme.com", "password": "secure123" }`,
        response: `{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "admin@acme.com",
    "role": "owner",
    "orgId": "550e8400-e29b-41d4-a716-446655440000"
  }
}`,
        errors: [400, 401, 500]
      },
      {
        method: "GET",
        path: "/api/v1/auth/me",
        desc: "Get current authenticated user (JWT required)",
        auth: "Bearer JWT",
        response: `{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "admin@acme.com",
  "role": "owner",
  "orgId": "550e8400-e29b-41d4-a716-446655440000"
}`,
        errors: [401, 404, 500]
      }
    ],
    health: [
      {
        method: "GET",
        path: "/health",
        desc: "Check API health status",
        response: `{
  "status": "ok",
  "uptime": 3600,
  "test": "Kyro",
  "timestamp": "2026-04-10T12:00:00.000Z",
  "database": "connected",
  "redis": "connected"
}`,
        errors: [503]
      }
    ]
  };
</script>

<svelte:head>
  <title>Docs — Kyro</title>
</svelte:head>

<div class="docs-page">
  <header class="docs-header">
    <a href="/" class="logo">
      <Logo size={20} />
      <span>kyro</span>
    </a>
    <nav class="docs-nav">
      <a href="/docs" class="active">docs</a>
      <a href="/health">status</a>
      <a href="/login">sign in</a>
    </nav>
  </header>

  <div class="docs-layout">
    <aside class="docs-sidebar">
      <nav class="sidebar-nav">
        {#each sections as section}
          <a href="#{section.id}" class="sidebar-link">{section.label}</a>
        {/each}
      </nav>
    </aside>

    <main class="docs-content">
      <section id="authentication" class="doc-section">
        <h2 class="section-title">Authentication</h2>
        <p class="section-desc">
          Kyro supports two authentication methods depending on the endpoint:
        </p>

        <div class="auth-methods">
          <div class="auth-card">
            <h3><span class="chip chip-get">API Key</span> For API requests</h3>
            <p>Pass your API key in the <code>X-Api-Key</code> header:</p>
            <pre><code><span class="c-kw">X-Api-Key</span>: <span class="c-str">kyr_abc123xyz...</span></code></pre>
            <p class="hint">Use for files, keys listing, and usage endpoints.</p>
          </div>

          <div class="auth-card">
            <h3><span class="chip chip-post">JWT</span> For user actions</h3>
            <p>Pass your JWT token in the <code>Authorization</code> header:</p>
            <pre><code><span class="c-kw">Authorization</span>: <span class="c-str">Bearer eyJhbGciOiJIUzI1NiIs...</span></code></pre>
            <p class="hint">Use for creating keys, org management, and usage data.</p>
          </div>
        </div>
      </section>

      <section id="scopes" class="doc-section">
        <h2 class="section-title">Scopes</h2>
        <p class="section-desc">
          API keys are scoped to control access. Request the minimum scope needed.
        </p>

        <div class="scopes-grid">
          {#each scopes as scope}
            <div class="scope-card">
              <div class="scope-header">
                <code class="scope-name">{scope.name}</code>
              </div>
              <p class="scope-desc">{scope.desc}</p>
            </div>
          {/each}
        </div>

        <div class="scope-example">
          <h4>Example: Key with minimum necessary scope</h4>
          <pre><code>{`{
  "name": "Read-only Key",
  "scopes": ["read"]  // Only for listing/downloading files
}`}</code></pre>
        </div>
      </section>

      <section id="rate-limiting" class="doc-section">
        <h2 class="section-title">Rate Limiting</h2>
        <p class="section-desc">
          All API requests are rate-limited to protect your infrastructure.
        </p>

        <div class="rate-info">
          <div class="rate-stat">
            <span class="rate-value">100</span>
            <span class="rate-label">requests / minute</span>
          </div>
        </div>

        <h4>Response headers</h4>
        <table class="data-table">
          <thead>
            <tr><th>Header</th><th>Description</th></tr>
          </thead>
          <tbody>
            <tr><td><code>X-RateLimit-Limit</code></td><td>Maximum requests per window</td></tr>
            <tr><td><code>X-RateLimit-Remaining</code></td><td>Requests remaining in window</td></tr>
            <tr><td><code>X-RateLimit-Reset</code></td><td>Unix timestamp when limit resets</td></tr>
          </tbody>
        </table>

        <h4>429 Response</h4>
        <pre><code>{`{
  "error": "Too many requests",
  "retryAfter": 45.5
}`}</code></pre>
      </section>

      <section id="files" class="doc-section">
        <h2 class="section-title">Files</h2>
        <p class="section-desc">
          Upload, list, download, and delete files. Files are served via CDN.
        </p>

        <div class="endpoint-group">
          <h3 class="group-title">Allowed MIME Types</h3>
          <div class="file-types">
            {#each fileTypes as type}
              <span class="type-chip">{type}</span>
            {/each}
          </div>
        </div>

        <div class="endpoint-group">
          <h3 class="group-title">Limits</h3>
          <ul class="limits-list">
            <li>Maximum file size: <strong>100MB</strong></li>
            <li>Storage quota: varies by plan (default 1GB)</li>
            <li>Upload format: <code>multipart/form-data</code> with <code>file</code> field</li>
          </ul>
        </div>

        <h3 class="group-title">Endpoints</h3>
        {#each endpoints.files as ep}
          <div class="endpoint">
            <div class="endpoint-header">
              <span class="method method-{ep.method.toLowerCase()}">{ep.method}</span>
              <span class="path">{ep.path}</span>
              {#if ep.scope}
                <span class="scope-badge">requires: {ep.scope}</span>
              {/if}
            </div>
            <p class="endpoint-desc">{ep.desc}</p>
            {#if ep.body}
              <div class="endpoint-detail">
                <span class="detail-label">Body:</span>
                <pre><code>{ep.body}</code></pre>
              </div>
            {/if}
            {#if ep.params && ep.params.length}
              <div class="endpoint-detail">
                <span class="detail-label">Params:</span>
                <ul class="params-list">
                  {#each ep.params as p}
                    <li><code>{p.name}</code> ({p.type}) — {p.desc}</li>
                  {/each}
                </ul>
              </div>
            {/if}
            <div class="endpoint-detail">
              <span class="detail-label">Response:</span>
              <pre><code>{ep.response}</code></pre>
            </div>
          </div>
        {/each}
      </section>

      <section id="keys" class="doc-section">
        <h2 class="section-title">API Keys</h2>
        <p class="section-desc">
          Create, list, and revoke API keys for programmatic access.
        </p>

        {#each endpoints.keys as ep}
          <div class="endpoint">
            <div class="endpoint-header">
              <span class="method method-{ep.method.toLowerCase()}">{ep.method}</span>
              <span class="path">{ep.path}</span>
              {#if ep.auth}
                <span class="scope-badge auth-badge">{ep.auth}</span>
              {/if}
            </div>
            <p class="endpoint-desc">{ep.desc}</p>
            {#if ep.body}
              <div class="endpoint-detail">
                <span class="detail-label">Body:</span>
                <pre><code>{ep.body}</code></pre>
              </div>
            {/if}
            <div class="endpoint-detail">
              <span class="detail-label">Response:</span>
              <pre><code>{ep.response}</code></pre>
            </div>
          </div>
        {/each}
      </section>

      <section id="usage" class="doc-section">
        <h2 class="section-title">Usage</h2>
        <p class="section-desc">
          Track API usage, bandwidth, and storage consumption.
        </p>

        {#each endpoints.usage as ep}
          <div class="endpoint">
            <div class="endpoint-header">
              <span class="method method-{ep.method.toLowerCase()}">{ep.method}</span>
              <span class="path">{ep.path}</span>
              <span class="scope-badge auth-badge">Bearer JWT</span>
            </div>
            <p class="endpoint-desc">{ep.desc}</p>
            {#if ep.params && ep.params.length}
              <div class="endpoint-detail">
                <span class="detail-label">Query:</span>
                <ul class="params-list">
                  {#each ep.params as p}
                    <li><code>{p.name}</code> ({p.type}) — {p.desc}</li>
                  {/each}
                </ul>
              </div>
            {/if}
            <div class="endpoint-detail">
              <span class="detail-label">Response:</span>
              <pre><code>{ep.response}</code></pre>
            </div>
          </div>
        {/each}
      </section>

      <section id="org" class="doc-section">
        <h2 class="section-title">Organisation</h2>
        <p class="section-desc">
          Manage your organisation, view members, invite new users.
        </p>

        {#each endpoints.org as ep}
          <div class="endpoint">
            <div class="endpoint-header">
              <span class="method method-{ep.method.toLowerCase()}">{ep.method}</span>
              <span class="path">{ep.path}</span>
              <span class="scope-badge auth-badge">Bearer JWT</span>
            </div>
            <p class="endpoint-desc">{ep.desc}</p>
            {#if ep.body}
              <div class="endpoint-detail">
                <span class="detail-label">Body:</span>
                <pre><code>{ep.body}</code></pre>
              </div>
            {/if}
            <div class="endpoint-detail">
              <span class="detail-label">Response:</span>
              <pre><code>{ep.response}</code></pre>
            </div>
          </div>
        {/each}
      </section>

      <section id="auth" class="doc-section">
        <h2 class="section-title">Auth</h2>
        <p class="section-desc">
          Register new organisations and authenticate users.
        </p>

        {#each endpoints.auth as ep}
          <div class="endpoint">
            <div class="endpoint-header">
              <span class="method method-{ep.method.toLowerCase()}">{ep.method}</span>
              <span class="path">{ep.path}</span>
            </div>
            <p class="endpoint-desc">{ep.desc}</p>
            {#if ep.body}
              <div class="endpoint-detail">
                <span class="detail-label">Body:</span>
                <pre><code>{ep.body}</code></pre>
              </div>
            {/if}
            <div class="endpoint-detail">
              <span class="detail-label">Response:</span>
              <pre><code>{ep.response}</code></pre>
            </div>
          </div>
        {/each}
      </section>

      <section id="quickstart" class="doc-section">
        <h2 class="section-title">Quickstart</h2>
        <p class="section-desc">
          Complete example: create a key, upload a file, and get its URL.
        </p>

        <div class="quickstart-steps">
          <div class="step">
            <div class="step-num">01</div>
            <div class="step-content">
              <h4>Create an API key (via dashboard or POST)</h4>
              <pre><code><span class="c-comment">// After logging in via dashboard, create a key:</span>
<span class="c-kw">const</span> res <span class="c-dim">=</span> <span class="c-kw">await</span> <span class="c-fn">fetch</span><span class="c-brace">(</span><span class="c-str">'/api/v1/keys'</span><span class="c-brace">,</span> <span class="c-brace">&#123;</span>
  method<span class="c-dim">:</span> <span class="c-str">'POST'</span><span class="c-dim">,</span>
  headers<span class="c-dim">:</span> <span class="c-brace">&#123;</span>
    <span class="c-str">'Content-Type'</span><span class="c-dim">:</span> <span class="c-str">'application/json'</span><span class="c-dim">,</span>
    <span class="c-str">'Authorization'</span><span class="c-dim">:</span> <span class="c-str">`Bearer </span><span class="c-prop">$&#123;jwt&#125;`</span>
  <span class="c-brace">&#125;,</span>
  body<span class="c-dim">:</span> JSON<span class="c-brace">.&#123;</span>name<span class="c-dim">:</span> <span class="c-str">'my-key'</span><span class="c-dim">,</span> scopes<span class="c-dim">:</span> [<span class="c-str">'read'</span><span class="c-dim">,</span> <span class="c-str">'write'</span>] <span class="c-brace">&#125;</span>
<span class="c-brace">&#125;)</span><span class="c-dim">;</span>

<span class="c-kw">const</span> data <span class="c-dim">=</span> <span class="c-kw">await</span> res<span class="c-dim">.</span><span class="c-fn">json</span><span class="c-brace">()</span><span class="c-dim">;</span>
<span class="c-kw">const</span> apiKey <span class="c-dim">=</span> data<span class="c-dim">.</span><span class="c-prop">key</span><span class="c-dim">;</span> <span class="c-comment">// "kyr_abc123..."</span></code></pre>
            </div>
          </div>

          <div class="step">
            <div class="step-num">02</div>
            <div class="step-content">
              <h4>Upload a file</h4>
              <pre><code><span class="c-kw">const</span> formData <span class="c-dim">=</span> <span class="c-kw">new</span> <span class="c-fn">FormData</span><span class="c-brace">()</span><span class="c-dim">;</span>
formData<span class="c-dim">.</span><span class="c-fn">append</span><span class="c-brace">(</span><span class="c-str">'file'</span><span class="c-dim">,</span> fileInput<span class="c-dim">.</span><span class="c-prop">files</span><span class="c-brace">[</span>0<span class="c-brace">])</span><span class="c-dim">;</span>

<span class="c-kw">const</span> res <span class="c-dim">=</span> <span class="c-kw">await</span> <span class="c-fn">fetch</span><span class="c-brace">(</span><span class="c-str">'/api/v1/files'</span><span class="c-brace">,</span> <span class="c-brace">&#123;</span>
  method<span class="c-dim">:</span> <span class="c-str">'POST'</span><span class="c-dim">,</span>
  headers<span class="c-dim">:</span> <span class="c-brace">&#123;</span>
    <span class="c-str">'X-Api-Key'</span><span class="c-dim">:</span> apiKey
  <span class="c-brace">&#125;,</span>
  body<span class="c-dim">:</span> formData
<span class="c-brace">&#125;)</span><span class="c-dim">;</span>

<span class="c-kw">const</span> file <span class="c-dim">=</span> <span class="c-kw">await</span> res<span class="c-dim">.</span><span class="c-fn">json</span><span class="c-brace">()</span><span class="c-dim">;</span>
<span class="c-comment">// &#123; id: "550e...", name: "doc.pdf", ... &#125;</span></code></pre>
            </div>
          </div>

          <div class="step">
            <div class="step-num">03</div>
            <div class="step-content">
              <h4>Download or get public URL</h4>
              <pre><code><span class="c-comment">// Download directly:</span>
<span class="c-kw">const</span> res <span class="c-dim">=</span> <span class="c-kw">await</span> <span class="c-fn">fetch</span><span class="c-brace">(</span><span class="c-str">`/api/v1/files/</span><span class="c-prop">$&#123;file.id&#125;`</span><span class="c-brace">,</span> <span class="c-brace">&#123;</span>
  headers<span class="c-dim">:</span> <span class="c-brace">&#123;</span> <span class="c-str">'X-Api-Key'</span><span class="c-dim">:</span> apiKey <span class="c-brace">&#125;</span>
<span class="c-brace">&#125;)</span><span class="c-dim">;</span>

<span class="c-comment">// Or construct public CDN URL:</span>
<span class="c-kw">const</span> url <span class="c-dim">=</span> <span class="c-str">`https://cdn.kyro.dev/</span><span class="c-prop">$&#123;orgSlug&#125;</span><span class="c-str">/</span><span class="c-prop">$&#123;file.name&#125;`</span><span class="c-dim">;</span></code></pre>
            </div>
          </div>
        </div>

        <div class="curl-example">
          <h4>cURL equivalent</h4>
          <pre><code><span class="c-comment"># Upload file</span>
<span class="c-kw">curl</span> -X POST https://api.kyro.io/api/v1/files \
  -H <span class="c-str">"X-Api-Key: kyr_abc123..."</span> \
  -F <span class="c-str">"file=@document.pdf"</span></code></pre>
        </div>
      </section>

      <section id="errors" class="doc-section">
        <h2 class="section-title">Errors</h2>
        <p class="section-desc">
          Standard HTTP error codes returned by the API.
        </p>

        <table class="errors-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            {#each errors as err}
              <tr>
                <td><span class="error-code" class:error-4xx={err.code >= 400 && err.code < 500} class:error-5xx={err.code >= 500}>{err.code}</span></td>
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
  .docs-page {
    min-height: 100vh;
    background: var(--color-bg);
  }

  .docs-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-8);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg);
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-family: var(--font-mono);
    font-size: var(--font-size-base);
    font-weight: 700;
    color: var(--color-text);
    text-decoration: none;
  }

  .docs-nav {
    display: flex;
    align-items: center;
    gap: var(--space-6);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
  }

  .docs-nav a {
    color: var(--color-text-muted);
    text-decoration: none;
    transition: color 0.1s;
  }

  .docs-nav a:hover,
  .docs-nav a.active {
    color: var(--color-text);
  }

  .docs-layout {
    display: flex;
    max-width: 1400px;
    margin: 0 auto;
  }

  .docs-sidebar {
    width: 220px;
    flex-shrink: 0;
    padding: var(--space-6) var(--space-4);
    border-right: 1px solid var(--color-border);
    position: sticky;
    top: 60px;
    height: calc(100vh - 60px);
    overflow-y: auto;
  }

  .sidebar-nav {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .sidebar-link {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    text-decoration: none;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    transition: all 0.15s;
  }

  .sidebar-link:hover {
    color: var(--color-text);
    background: var(--color-bg-2);
  }

  .docs-content {
    flex: 1;
    padding: var(--space-8) var(--space-10);
    min-width: 0;
  }

  .doc-section {
    margin-bottom: var(--space-12);
    scroll-margin-top: 80px;
  }

  .section-title {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xl);
    font-weight: 700;
    color: var(--color-text);
    letter-spacing: -0.02em;
    margin: 0 0 var(--space-3) 0;
    padding-bottom: var(--space-3);
    border-bottom: 1px solid var(--color-border);
  }

  .section-desc {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    margin: 0 0 var(--space-6) 0;
    line-height: 1.6;
  }

  .auth-methods {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--space-4);
  }

  .auth-card {
    background: var(--color-bg-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-5);
  }

  .auth-card h3 {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text);
    margin: 0 0 var(--space-3) 0;
  }

  .auth-card p {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    margin: 0 0 var(--space-2) 0;
  }

  .auth-card .hint {
    color: var(--color-text-ghost);
    font-size: var(--font-size-2xs);
    margin-top: var(--space-3);
  }

  .chip {
    display: inline-flex;
    align-items: center;
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .chip-get {
    background: var(--color-success-dim);
    color: var(--color-success);
  }

  .chip-post {
    background: rgba(59, 130, 246, 0.15);
    color: #3b82f6;
  }

  .scopes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-3);
    margin-bottom: var(--space-6);
  }

  .scope-card {
    background: var(--color-bg-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
  }

  .scope-header {
    margin-bottom: var(--space-2);
  }

  .scope-name {
    background: var(--color-bg-3);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    color: var(--color-success);
  }

  .scope-desc {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    margin: 0;
    line-height: 1.5;
  }

  .scope-example {
    background: var(--color-bg-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
  }

  .scope-example h4 {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text);
    margin: 0 0 var(--space-3) 0;
  }

  .scope-example pre {
    margin: 0;
  }

  .rate-info {
    display: flex;
    gap: var(--space-6);
    margin-bottom: var(--space-6);
  }

  .rate-stat {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
  }

  .rate-value {
    font-family: var(--font-mono);
    font-size: var(--font-size-3xl);
    font-weight: 700;
    color: var(--color-success);
  }

  .rate-label {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: var(--space-6);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
  }

  .data-table th,
  .data-table td {
    text-align: left;
    padding: var(--space-3);
    border: 1px solid var(--color-border);
  }

  .data-table th {
    background: var(--color-bg-2);
    color: var(--color-text);
    font-weight: 600;
  }

  .data-table td {
    background: var(--color-bg);
    color: var(--color-text-muted);
  }

  .data-table code {
    background: var(--color-bg-2);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    color: var(--color-text);
  }

  .endpoint-group {
    margin-bottom: var(--space-6);
  }

  .group-title {
    font-family: var(--font-mono);
    font-size: var(--font-size-base);
    font-weight: 600;
    color: var(--color-text);
    margin: 0 0 var(--space-3) 0;
  }

  .file-types {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .type-chip {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    background: var(--color-bg-2);
    color: var(--color-text-muted);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);
  }

  .limits-list {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    margin: 0;
    padding-left: var(--space-5);
    line-height: 1.8;
  }

  .endpoint {
    background: var(--color-bg-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-4);
    overflow: hidden;
  }

  .endpoint-header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
    flex-wrap: wrap;
  }

  .method {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    font-weight: 700;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    text-transform: uppercase;
  }

  .method-get {
    background: var(--color-success-dim);
    color: var(--color-success);
  }

  .method-post {
    background: rgba(59, 130, 246, 0.15);
    color: #3b82f6;
  }

  .method-delete {
    background: var(--color-danger-dim);
    color: var(--color-danger);
  }

  .path {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--color-text);
  }

  .scope-badge {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    background: var(--color-bg-3);
    color: var(--color-text-muted);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    margin-left: auto;
  }

  .auth-badge {
    margin-left: 0;
  }

  .endpoint-desc {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    margin: 0;
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--color-border);
  }

  .endpoint-detail {
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--color-border);
  }

  .endpoint-detail:last-child {
    border-bottom: none;
  }

  .detail-label {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    color: var(--color-text-ghost);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    display: block;
    margin-bottom: var(--space-2);
  }

  .params-list {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    margin: 0;
    padding-left: var(--space-4);
    line-height: 1.8;
  }

  .endpoint pre {
    margin: 0;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-3);
    overflow-x: auto;
  }

  .quickstart-steps {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    margin-bottom: var(--space-6);
  }

  .step {
    display: flex;
    gap: var(--space-4);
  }

  .step-num {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    font-weight: 700;
    color: var(--color-success);
    background: var(--color-bg-2);
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .step-content {
    flex: 1;
    min-width: 0;
  }

  .step-content h4 {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text);
    margin: 0 0 var(--space-3) 0;
  }

  .step-content pre {
    margin: 0;
    background: var(--color-bg-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
    overflow-x: auto;
  }

  .curl-example {
    background: var(--color-bg-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
  }

  .curl-example h4 {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text);
    margin: 0 0 var(--space-3) 0;
  }

  .curl-example pre {
    margin: 0;
  }

  .errors-table {
    width: 100%;
    border-collapse: collapse;
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
  }

  .errors-table th,
  .errors-table td {
    text-align: left;
    padding: var(--space-3);
    border: 1px solid var(--color-border);
  }

  .errors-table th {
    background: var(--color-bg-2);
    color: var(--color-text);
    font-weight: 600;
  }

  .errors-table td {
    background: var(--color-bg);
    color: var(--color-text-muted);
  }

  .error-code {
    font-family: var(--font-mono);
    font-weight: 700;
    padding: 2px 8px;
    border-radius: var(--radius-sm);
  }

  .error-4xx {
    background: var(--color-warning-dim);
    color: var(--color-warning);
  }

  .error-5xx {
    background: var(--color-danger-dim);
    color: var(--color-danger);
  }

  pre {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    line-height: 1.6;
    color: var(--color-text-dim);
    white-space: pre-wrap;
    word-break: break-all;
  }

  code {
    font-family: var(--font-mono);
  }

  .c-kw    { color: var(--color-success); }
  .c-fn    { color: var(--color-text); }
  .c-str   { color: #d4a854; }
  .c-prop  { color: var(--color-text-dim); }
  .c-dim   { color: var(--color-text-ghost); }
  .c-brace { color: var(--color-text-muted); }
  .c-comment { color: var(--color-text-ghost); font-style: italic; }

  @media (max-width: 900px) {
    .docs-sidebar {
      display: none;
    }

    .docs-content {
      padding: var(--space-6) var(--space-5);
    }

    .docs-header {
      padding: var(--space-3) var(--space-5);
    }

    .auth-methods {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 640px) {
    .docs-content {
      padding: var(--space-4);
    }

    .section-title {
      font-size: var(--font-size-xl);
    }

    .endpoint-header {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-2);
    }

    .scope-badge {
      margin-left: 0;
    }
  }
</style>