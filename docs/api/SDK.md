## The hard truth first

The SDK is only as good as the API underneath it. Before writing a single line of SDK code, your API needs to be **stable and intentional**. That means:

- **Consistent error shapes** — every error response must have the same structure (`{ error: { code, message, details } }`). If some endpoints return `{ error: "string" }` and others return `{ message: "..." }`, the SDK can't handle them uniformly and the developer experience breaks immediately.
- **Versioned endpoints** — you already have `/api/v1/` which is great. Don't break this. Ever.
- **Predictable pagination** — list endpoints (`/files`, `/keys`) need a consistent cursor or page-based pattern across the board, not ad-hoc per route.

Audit your API for consistency before building the SDK. Any rough edge in the API becomes a sharp edge in the SDK.

---

## How to actually structure the SDK

The pattern that works (Stripe uses this, it's the right approach):

```
@kyro/sdk/
├── src/
│   ├── client.ts          ← KyroClient class, holds config + http
│   ├── http.ts            ← base fetch wrapper, auth headers, error handling
│   ├── error.ts           ← KyroError class
│   ├── resources/
│   │   ├── files.ts       ← client.files.*
│   │   ├── keys.ts        ← client.keys.*
│   │   └── usage.ts       ← client.usage.*
│   └── types/
│       └── index.ts       ← all exported types
```

The `KyroClient` is just a container that instantiates resources and passes them a shared HTTP layer:

```typescript
export class KyroClient {
  files: FilesResource;
  keys: KeysResource;
  usage: UsageResource;

  constructor(config: { apiKey: string; baseUrl?: string }) {
    const http = new KyroHttp(config);
    this.files = new FilesResource(http);
    this.keys = new KeysResource(http);
    this.usage = new UsageResource(http);
  }
}
```

The HTTP layer handles everything cross-cutting — auth header injection, error parsing, retries — so individual resources stay clean.

---

## The SDK experience that matters most

Three things determine whether developers love or hate your SDK:

**1. TypeScript types that actually help.** Return types should be exact — not `any`, not `object`. When a developer does `const file = await client.files.upload(...)` they should get full autocomplete on `file.url`, `file.sizeBytes`, `file.mimeType`. Generate these from your actual DB schema or OpenAPI spec, don't handwrite them separately and let them drift.

**2. Errors you can act on.** Don't just throw a generic `Error`. Have a `KyroError` class with a machine-readable `code`:

```typescript
throw new KyroError({
  code: "storage_quota_exceeded",
  message: "Your organisation has reached its storage limit.",
  statusCode: 402,
});
```

A developer can then write `if (err.code === "storage_quota_exceeded")` and handle it properly. String-matching on `err.message` is fragile and awful.

**3. File uploads that don't make people cry.** `client.files.upload()` should accept a `Buffer`, a `ReadableStream`, and ideally a `File` object (for browser use). Multipart encoding should be invisible — the developer shouldn't need to know it exists.

---

## The `kyro_test_` prefix is non-negotiable

From your roadmap you already know about sandbox keys. Implement this before shipping the SDK. Developers will run your SDK in tests and CI, and they need a way to do that without touching production data or getting billed. The SDK should warn loudly (but not throw) if a production key is used in a Node environment where `NODE_ENV=test`.

---

## Realistic phasing for the SDK itself

Given you're at Phase 4, here's what I'd actually build in order:

**Right now:** A thin internal client — just a typed fetch wrapper you use in your own frontend/dashboard. No npm publish. This forces you to feel the rough edges before external developers do.

**After Phase 5 (S3, stable storage):** Publish `@kyro/sdk` to npm with `files` and `keys` resources. These are your core value prop — get them perfect.

**Later:** `usage` resource, webhook verification helpers, a browser-safe build (no Node-only APIs).

---

## One thing most people skip that kills developer adoption

**A local test mode.** Something like:

```typescript
const client = new KyroClient({
  apiKey: "kyro_test_...",
});
```

...that hits a real sandbox environment with real responses but zero side effects. Without this, developers can't integrate your SDK in their own test suites confidently. This is table stakes for a platform people will actually build on.

---

## Bottom line

You're in a great position — Phases 1–4 done means your core infrastructure is solid. The SDK is absolutely the right next move after Phase 5 stabilises your storage layer, because the file upload experience is your killer feature and that needs S3 under it before it's worth wrapping in a nice SDK API.

The one thing I'd start *right now*, before Phase 5 even, is auditing your error responses and making them consistent. That work costs you nothing and it makes every subsequent phase — and the SDK itself — substantially cleaner.
