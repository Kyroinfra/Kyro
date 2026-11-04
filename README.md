<p align="center">
  <img src="as/logo.svg" alt="Kyro Logo" width="160" />
</p>

<h1 align="center">Kyro</h1>

<p align="center">
  Self-hosted document storage and RAG API. Upload files, extract text, embed chunks, and ask questions across your documents — all running on your own infrastructure.
</p>

<p align="center">
  Built for teams that can't send their data to third-party AI providers.
</p>

<p align="center">
  <a href="https://kyro.nyxox.dev/">Docs</a> ·
  <a href="https://github.com/Kyroinfra/kyro-sdk-typescript">TypeScript SDK</a> ·
  <a href="https://kyro.nyxox.dev/docs#sdk">SDK Docs</a>
</p>

![Kyro Dashboard](as/dashboard.png)

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [Ollama](https://ollama.com) running with your chosen models — can be on the same server or a separate GPU machine

## Setup

**1. Clone and configure**

```bash
git clone https://github.com/Kyroinfra/Kyro
cd Kyro
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
POSTGRES_USER=kyro
POSTGRES_PASSWORD=changeme
POSTGRES_DB=kyro
JWT_SECRET=changeme

PGADMIN_EMAIL=admin@example.com
PGADMIN_PASSWORD=changeme

# Point this at your Ollama instance
OLLAMA_URL=http://host.docker.internal:11434

# Models — these must already be pulled in Ollama
EMBEDDING_MODEL=nomic-embed-text
CHAT_MODEL=llama3.2
```

**2. Pull your Ollama models**

```bash
ollama pull nomic-embed-text
ollama pull llama3.2
```

**3. Start**

```bash
./scripts/prod.sh
```

Or manually:

```bash
docker compose \
  -f compose.yml \
  --profile prod \
  --scale api=3 \
  up -d
```

The API serves `/api/v1/*` at `http://localhost/api/v1`, with `/health` at the origin root. Migrations run at api startup under a Postgres advisory lock — concurrent starts (replica scale-ups, a racing restart) queue instead of colliding.

> The explicit `-f compose.yml` matters: it bypasses `compose.override.yml`
> (the dev-only file Docker auto-loads alongside `compose.yml` — hot-reload
> builds, source bind mounts, published ports, ollama, pgadmin).

## Architecture

| Service | Description |
|---|---|
| `api` | REST API — runs migrations at startup (advisory lock) and the pipeline + webhook delivery inline |
| `web` | SvelteKit dashboard and same-origin API proxy |
| `postgres` | PostgreSQL with pgvector |
| `nginx` | Reverse proxy (prod profile) |

Dev-only services (`compose.override.yml`): `pgadmin` (GUI at :5050) and a containerized `ollama` that reuses the host's model store. In prod, Ollama stays external via `OLLAMA_URL` — a dedicated GPU server for it is recommended.

## Using the API

Everything below talks to `http://localhost/api/v1`. Both credentials work on every org-scoped route — `X-API-Key: <key>` or `Authorization: Bearer <jwt>` (an explicit `X-API-Key` wins when both are sent). Rate limit: 100 requests per key per minute.

**1. Create the first account** — the first registration creates your organisation and its owner; afterwards signup stays locked unless `ALLOW_SIGNUP=true`:

```bash
curl -X POST http://localhost/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"orgName":"Acme","email":"admin@acme.dev","password":"supersecret"}'
# → 201 {"token":"…"}
```

**2. Mint an API key** (owner/admin only; the plaintext `key` is returned exactly once):

```bash
curl -X POST http://localhost/api/v1/keys \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"ingest","scopes":["read","write"]}'
# → 201 {"key":"kyro_live_…","key_prefix":"kyro_live_…",…}
```

**3. Upload a file** — PDF, DOCX, DOC and TXT are extracted and embedded; CSV and JSON are stored without extraction (`skipped`); anything else is rejected with 415:

```bash
curl -X POST http://localhost/api/v1/files \
  -H "X-API-Key: $KYRO_KEY" \
  -F file=@report.pdf
```

**4. Search** — hybrid keyword + embedding retrieval, ranked with Reciprocal Rank Fusion:

```bash
curl "http://localhost/api/v1/search?q=payment+terms&limit=5" \
  -H "X-API-Key: $KYRO_KEY"
```

**5. Ask** — retrieval-grounded answers streamed over Server-Sent Events (`sources` → `chunk`* → `done`), or one JSON body with `"stream": false`:

```bash
curl -N -X POST http://localhost/api/v1/ask \
  -H "X-API-Key: $KYRO_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"question":"What are the payment terms?","collectionId":"<uuid>"}'
```

### Where to go next

- [ARCHITECTURE.md](ARCHITECTURE.md) — how the system works: boot sequence, ingest pipeline, hybrid retrieval, scope resolution, webhooks, data model, configuration
- [`packages/api/openapi.yaml`](packages/api/openapi.yaml) — the canonical API contract: every endpoint, schema and error shape
- [`scripts/USEAGE.md`](scripts/USEAGE.md) — operator runbook for the usage/admin scripts
- [Docs site](https://kyro.nyxox.dev/docs) — rendered API reference and SDK docs


