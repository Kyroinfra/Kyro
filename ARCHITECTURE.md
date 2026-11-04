# Kyro Architecture

Kyro is a self-hosted document storage and RAG API: upload files, extract text, embed chunks, and ask questions across your documents — entirely on your own infrastructure. The backend is a **single Express service** backed by **PostgreSQL + pgvector**, with **Ollama** as the only external ML dependency. There is no queue, no Redis, and no separate worker tier: ingest, retrieval, and webhook delivery all run in-process by design (the no-Redis decision is recorded in [`packages/api/DECISIONS.md`](packages/api/DECISIONS.md) and traces to RFC #49).

## System at a glance

```
                 ┌──────────────────────────────┐
                 │           nginx              │  prod profile, port 80
                 │  (reverse proxy + TLS term)  │
                 └───────┬──────────────┬───────┘
                         │              │
                 ┌───────▼───────┐  ┌───▼────────────┐
                 │     web       │  │      api       │  ── /health (origin root)
                 │  SvelteKit    │  │ Express 5      │  ── /api/v1/*  (REST)
                 │  dashboard +  │  │ ×N replicas    │
                 │  API proxy    │  └───┬───────┬────┘
                 └───────────────┘      │       │
                                        │       │ OLLAMA_URL (external in prod)
                              ┌─────────▼──┐  ┌─▼──────┐
                              │ postgres   │  │ ollama │  embeddings + chat
                              │ + pgvector │  └────────┘
                              └────────────┘
```

| Service    | Role                                                                        |
|------------|-----------------------------------------------------------------------------|
| `api`      | REST API — migrations at startup, ingest pipeline, retrieval, webhook delivery, all inline |
| `web`      | SvelteKit dashboard; same-origin proxy to the api                            |
| `postgres` | PostgreSQL with pgvector — the only stateful store                           |
| `nginx`    | Reverse proxy (prod profile only)                                            |

Dev-only services (`compose.override.yml`): `pgadmin` (GUI at :5050) and a containerized `ollama` that reuses the host's model store. In prod, Ollama stays external via `OLLAMA_URL` — a dedicated GPU server for it is recommended.

## Boot sequence

`packages/api/src/index.ts` does three things, in order:

1. **`runMigrationsUnderLock()`** — Drizzle migrations (18 of them, `drizzle/0000–0017`) run at api startup under a Postgres advisory lock (key `702345197832`). Concurrent starts — replica scale-ups, a racing restart — queue instead of colliding. There is no separate one-shot migrate service anymore.
2. **`recoverInterruptedPipelines()`** — files caught mid-run by a crash or restart are marked `failed` so nothing looks "in progress" forever. This must run after migrations (its queries read fresh schema).
3. **`app.listen()`** — the server comes up only after both steps complete.

## HTTP surface

- `GET /health` — mounted at the origin root (`app.ts`), not under `/api/v1`. Returns `200 ok` or `503 degraded` (degraded = database unreachable), plus uptime.
- `/api/v1/*` — the REST surface. The canonical, hand-written contract is [`packages/api/openapi.yaml`](packages/api/openapi.yaml); the docs site renders it and CI validates it. Route modules live in `src/routes/`: `auth`, `org`, `keys`, `usage`, `webhooks`, `files`, `collections`, `search`, `ask`.

### Auth model (#29)

One gate (`src/middleware/auth.ts`) for every org-scoped route. It accepts either:

- `X-API-Key: <key>` — a scoped API key created via `/api/v1/keys`, or
- `Authorization: Bearer <jwt>` — a session token from `/api/v1/auth/*`.

Precedence: an explicit `X-API-Key` wins — it is the narrower credential, so it must not be shadowed by a valid session token.

### Cross-cutting middleware

On the keyed surface (`/files`, `/search`, `/ask`) the chain is `authMiddleware → rateLimitMiddleware → usageLoggerMiddleware`:

- **Rate limiting** — in-memory sliding window, 100 requests per key per minute (the same budget the old Redis-backed limiter used). Per process *by design*: replicas do not share a budget — a documented trade-off of the no-Redis architecture. The hits map prunes itself opportunistically past 10,000 keys.
- **Usage logging** — a `usage_logs` row is written on the response's `finish` event (ADR-003 in `DECISIONS.md`). There is no `usage_daily` rollup table; it was dropped.

## Ingest pipeline (#33)

One pipeline, one status. A file's whole ingest position lives in `files.status` — there is no jobs table:

```
pending ──▶ processing ──▶ ready
                 │  ▲         skipped   (RAG disabled / no extractable text)
                 │  └─ embed stage takes over after extraction
                 └────────▶ failed     (reason in files.error)
```

- **Upload** of an extractable MIME type sets `status = 'pending'` and fires the pipeline (fire-and-forget).
- A **semaphore of 2** caps concurrent pipelines per process, so parallel uploads never multiply extraction's RAM/CPU cost.
- **Extract** (`lib/extractors/`) — `pdf`, `txt`, `docx` via `unpdf` / `mammoth`.
- **Chunk** (`rag/chunk.ts`) — paragraph packing up to `CHUNK_MAX_CHARS` (1200); a single paragraph larger than the ceiling is hard-split; every chunk after the first is preceded by the last `CHUNK_OVERLAP_CHARS` of the previous chunk's primary text (overlap never accumulates across chunks).
- **Embed** (`rag/ingest.ts`) — chunks are embedded via Ollama in batches of `EMBED_BATCH_SIZE` (32) per `/api/embed` request, then persisted to `file_chunks`.
- **Terminal events** — `file.ready` / `file.failed` (#40). Extract failures are emitted by the pipeline itself; embed failures by `rag/ingest.ts`.
- **No automatic retries** — they were BullMQ's attempts/backoff, and Redis is gone since #49. Re-run a failed file with `POST /files/:id/reprocess`.

## Retrieval (#35)

`hybridSearch()` in `rag/retrieve.ts` fuses two independent arms:

- **Dense arm** — cosine distance via pgvector (`<=>`), HNSW-indexed since #34, floored by `VECTOR_DISTANCE_THRESHOLD` (default 0.5).
- **Full-text arm** — `ts_rank` over the generated `tsvector` column, queried with `websearch_to_tsquery('english')`. It is *not* BM25 — `ts_rank` is a simpler relevance function, and the docs say so on purpose.

Both arms fetch up to `CANDIDATE_LIMIT` (100) rows **with an explicit `ORDER BY` before `LIMIT`**, so the kept candidate set is deterministic. Scores are fused with **Reciprocal Rank Fusion (RRF, k=60)**; ties break on `file_id` / `chunk_index`, so output order is fully deterministic.

**Cross-encoder reranking is opt-in** (`RERANK_ENABLED`, default off — it makes up to `RERANK_INPUT_LIMIT` (50) Ollama calls per query). When off, the RRF order is the final answer.

`rag/retrieve.ts` is the only module allowed a raw pg handle (#26): the pgvector operators and the tsquery plumbing need raw SQL that the ORM does not express.

## Scope resolution (#37)

`resolveScope()` in `rag/scope.ts` is **the one scope resolver** for both `/search` and `/ask`. It intersects every provided constraint — collection membership ∩ explicit client file ids ∩ metadata filters — and returns a uniform result, so the two routes answer identical scope failures with identical status codes:

| Status | Meaning |
|--------|---------|
| `404`  | collection not found · no owned files for the client fileIds |
| `422`  | collection empty · no files match the metadata filters · the intersection of all provided constraints is empty |

`{ fileIds: undefined }` means *org-wide*: the retrieval layer itself enforces org isolation, `files.status = 'ready'`, and embedded-chunk availability, so callers never need pre-count queries. (The reason this module exists: `/ask` used to resolve filters and then unconditionally overwrite them with the `collectionId`/`fileIds` branches — combined filters were silently ignored. One resolver, one intersect, one error table; the routes cannot drift again.)

## `/ask` — question answering

The route (`routes/ask.ts`) stays thin: zod parse → scope checks → SSE plumbing. Everything LLM-shaped lives in `rag/ask.ts`:

- **Request contract** — `question` (1–2000 chars), `fileIds` (≤20) **XOR** `collectionId`, `topK` (1–20, default 8), optional `model`, `stream` (default true), and `history` (≤10 prior user/assistant turns, replayed verbatim — read-only context for follow-ups; it never affects retrieval).
- **Flow** — hybrid retrieval over the resolved scope → `buildChatMessages()` (document-context prompt + system rules + history) → streamed answer from Ollama (`CHAT_MODEL`, default `llama3.2`).
- **SSE wire** — `data: {"type":"sources", …}` first, then streamed answer chunks, then `data: {"type":"done"}`.
- **Non-streaming fallback** (`stream: false`) — a single JSON body `{ answer, sources }`.
- Requires `OLLAMA_URL`; the endpoint answers `400` without it.

## Webhooks (#40)

Terminal file events only — the old 9-event list is cut to the two states a self-hosted RAG consumer needs:

- `file.ready` — the file is queryable (chunks persisted, status `ready`)
- `file.failed` — the file will never become queryable in this pass (extraction or embedding failed), including files skipped for having no extractable text

Per-file progress (started/completed + collection rollups) is deliberately not webhook-worthy — consumers poll `GET /files/:id` for intermediate state.

Delivery (`webhooks/dispatch.ts` + `lib/webhookDelivery.ts`): one `webhook_deliveries` row per enabled, subscribed target, transitioned `pending → delivered | failed`. Delivery runs through a **semaphore of 5**, with a **10s timeout**, up to **5 attempts** on exponential backoff (**10s → 20s → 40s → 80s**). Every request is signed with `X-Kyro-Signature: sha256=<HMAC-SHA256(secret, body)>`. Delivery is fire-and-forget: failures are recorded in the database, never thrown into the request path.

## Data model

Ten tables (`db/schema.ts`):

`organisations` · `users` · `api_keys` · `files` · `file_chunks` · `usage_logs` · `webhooks` · `webhook_deliveries` · `collections` · `collection_files`

Embeddings live in `file_chunks` as pgvector columns; the full-text arm reads a generated `tsvector` column on the same table. Schema changes ship as Drizzle migrations (`drizzle/0000–0017`), applied at startup under the advisory lock described above.

## Configuration

All configuration is environment-driven and zod-validated at boot (`src/config/index.ts`):

| Variable | Default | Purpose |
|----------|---------|---------|
| `NODE_ENV` | `development` | — |
| `PORT` | `3000` | api listen port |
| `DATABASE_URL` | — (required) | Postgres connection string |
| `JWT_SECRET` | — (required) | session token signing |
| `UPLOAD_DIR` | (see `.env.example`) | upload staging directory |
| `OLLAMA_URL` | (see `.env.example`) | Ollama base URL — required for `/ask` |
| `EMBEDDING_MODEL` | `nomic-embed-text` | embedding model |
| `EMBEDDING_DIM` | `768` | embedding vector width |
| `CHAT_MODEL` | `llama3.2` | `/ask` chat model |
| `RERANK_MODEL` | (see `.env.example`) | cross-encoder model |
| `RERANK_ENABLED` | `false` | opt-in reranking |
| `ALLOW_SIGNUP` | (see `.env.example`) | open account creation |
| `VECTOR_DISTANCE_THRESHOLD` | `0.5` | dense-arm cosine floor |
| `STORAGE_LIMIT` | (see `.env.example`) | per-org storage quota |

## Repository layout

```
packages/api      Express service — the entire backend (routes, middleware, rag, webhooks, db)
packages/shared   types shared between api and web
packages/web      SvelteKit dashboard
docs/             docs site (SvelteKit) — renders openapi.yaml as the API reference
scripts/          compose helpers + operator runbook (USEAGE.md)
as/               brand assets
```

## Related documents

- [`packages/api/openapi.yaml`](packages/api/openapi.yaml) — the canonical API contract (single source of truth; the docs site renders it)
- [`packages/api/DECISIONS.md`](packages/api/DECISIONS.md) — the ADR log (do not duplicate decisions here; add them there)
- [`scripts/USEAGE.md`](scripts/USEAGE.md) — operator runbook for the usage/admin scripts
- <https://kyro.nyxox.dev/docs> — rendered API reference
