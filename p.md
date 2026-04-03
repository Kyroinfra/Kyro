# 🚀 Kyro SaaS Backend — Complete Phase-by-Phase Roadmap

> **A living engineering roadmap for building Kyro from zero to production-grade distributed infrastructure.**
> Inspired by Stripe's API design and AWS's storage architecture.

---

## 📐 Architecture Evolution Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                   KYRO SYSTEM EVOLUTION                      │
└──────────────────────────────────────────────────────────────┘

  Phase 0
  ┌─────────────────────┐
  │   Single Server     │  ← Raw Node.js/Express, SQLite or
  │   Local Monolith    │    PostgreSQL, no containers
  └──────────┬──────────┘
             │
             ▼
  Phase 1
  ┌─────────────────────┐
  │  Modular Monolith   │  ← Auth + Orgs + API Keys
  │  (PostgreSQL live)  │    Structured modules, no Docker yet
  └──────────┬──────────┘
             │
             ▼
  Phase 2
  ┌─────────────────────┐
  │  Feature-Complete   │  ← File storage + Usage tracking
  │  Local Backend      │    Redis introduced locally
  └──────────┬──────────┘
             │
             ▼
  Phase 3
  ┌─────────────────────┐
  │  Dockerized System  │  ← Dockerfile + docker-compose
  │                     │    API + PostgreSQL + Redis in containers
  └──────────┬──────────┘
             │
             ▼
  Phase 4
  ┌─────────────────────┐
  │  NGINX Load-        │  ← NGINX reverse proxy
  │  Balanced System    │    Multiple API container instances
  │                     │    Internal Docker networking
  └──────────┬──────────┘
             │
             ▼
  Phase 5
  ┌─────────────────────┐
  │  Production-Grade   │  ← Billing, observability, horizontal
  │  Scalable System    │    scaling, queue workers, CDN-ready
  └─────────────────────┘

Request Flow (Phase 4+):
  Browser / API Client
       │
       ▼
  ┌─────────┐
  │  NGINX  │  ← Terminates TLS, rate limits at edge, load balances
  └────┬────┘
       │  (round-robin / least-conn)
  ┌────┴────────────────────────┐
  │                             │
  ▼                             ▼
┌──────────┐             ┌──────────┐
│ kyro-api │             │ kyro-api │  ← Multiple stateless API instances
│ :3000    │             │ :3001    │
└────┬─────┘             └────┬─────┘
     │                        │
     └───────────┬────────────┘
                 │
       ┌─────────┴─────────┐
       ▼                   ▼
  ┌─────────┐        ┌──────────┐
  │Postgres │        │  Redis   │
  │(primary)│        │  Cache   │
  └─────────┘        └──────────┘
```

---

## ⚙️ Phase 0 — Foundation & Skeleton

### Phase Goal
Establish a working HTTP server with a healthy endpoint, environment configuration, and a connected PostgreSQL database. This phase is about proving your dev environment works end-to-end before writing any real business logic.

### Features to Build
- Project folder structure (src/, routes/, middleware/, db/, config/)
- Express (or Fastify) HTTP server with `/health` endpoint
- Environment configuration via `.env` and `dotenv`
- PostgreSQL connection pool (using `pg` or `drizzle-orm` / `prisma`)
- Basic request logging (morgan or custom middleware)
- Error handling middleware (global 500 catcher)
- `.gitignore`, `README.md`, `package.json` with scripts (`dev`, `start`, `migrate`)

### System Components Introduced
- Node.js + Express/Fastify (HTTP layer)
- PostgreSQL (raw connection, no ORM yet, or introduce ORM here)
- `dotenv` for environment management
- `nodemon` for development hot-reload

### Architecture Level
**Monolith (simple local backend)**

### Data Model Evolution

```sql
-- No business tables yet
-- Validate DB connection with a raw query

-- Optional: a migrations table if you set up a migration runner
CREATE TABLE IF NOT EXISTS _migrations (
  id        SERIAL PRIMARY KEY,
  name      VARCHAR(255) NOT NULL,
  run_at    TIMESTAMP DEFAULT NOW()
);
```

### API Surface

| Method | Endpoint  | Description                          |
|--------|-----------|--------------------------------------|
| GET    | /health   | Returns `{ status: "ok", uptime }` |

### Infrastructure Additions
- None yet. Everything runs locally with `node src/index.js` or `npm run dev`
- PostgreSQL runs locally (installed directly or via local Docker for convenience)

### Completion Checklist
- [ ] `npm run dev` starts the server without errors
- [ ] `GET /health` returns 200 with JSON
- [ ] PostgreSQL connection succeeds on startup (logs confirm)
- [ ] `.env.example` documents all required variables
- [ ] Project has a clear folder structure committed to git
- [ ] Global error middleware catches unhandled errors without crashing

### Common Mistakes
- Skipping `.env.example` — teammates (or future-you) won't know what variables are needed
- Putting database connection logic directly in route files — use a dedicated `db/` module
- Not validating environment variables on startup — fail fast with clear errors
- Skipping migrations infrastructure — you'll regret it by Phase 1

---

## ⚙️ Phase 1 — Multi-Tenant Auth & Organisation System

### Phase Goal
Build the identity layer of Kyro. Users register and log in. Every user belongs to an organisation. This is the foundation everything else sits on — get it right.

### Features to Build
- Organisation (tenant) creation
- User registration with email + hashed password
- User login returning a signed JWT
- Auth middleware (JWT verification on protected routes)
- Users belong to one organisation via foreign key
- Role system on users: `owner`, `admin`, `member`
- Org-scoped data isolation (every query filters by `org_id`)
- Input validation (using `zod` or `joi`)
- Password hashing with `bcrypt`

### System Components Introduced
- JWT authentication (`jsonwebtoken`)
- `bcrypt` for password hashing
- `zod` / `joi` for request validation
- Auth middleware layer
- Org-scoped query pattern established

### Architecture Level
**Modular Monolith**

### Data Model Evolution

```sql
CREATE TABLE organisations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(100) UNIQUE NOT NULL,
  plan        VARCHAR(50) DEFAULT 'free',
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  role            VARCHAR(50) DEFAULT 'member',  -- owner | admin | member
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_org_id ON users(org_id);
CREATE INDEX idx_users_email  ON users(email);
```

### API Surface

| Method | Endpoint              | Auth Required | Description                    |
|--------|-----------------------|---------------|--------------------------------|
| POST   | /api/v1/auth/register | No            | Create org + owner user        |
| POST   | /api/v1/auth/login    | No            | Login, returns JWT             |
| GET    | /api/v1/auth/me       | Yes           | Get current user profile       |
| GET    | /api/v1/org           | Yes           | Get current org details        |
| POST   | /api/v1/org/members   | Yes (owner)   | Invite a user to the org       |

### Infrastructure Additions
- Still local. No Docker yet.
- Run PostgreSQL locally or with a quick `docker run postgres` one-liner (not a compose file yet)

### Completion Checklist
- [ ] Registration creates both org and owner user atomically (use a DB transaction)
- [ ] Login returns a JWT with `userId`, `orgId`, `role` embedded in claims
- [ ] Auth middleware rejects expired/invalid tokens with 401
- [ ] All protected routes require a valid JWT
- [ ] Every DB query for org resources filters by `org_id` from the token
- [ ] Passwords are never stored in plaintext — `bcrypt` rounds >= 10
- [ ] Role-based access works: members cannot invite other members

### Common Mistakes
- Putting `org_id` in the request body instead of trusting the JWT — users can spoof it
- Not using a DB transaction for registration (org created but user insert fails = orphaned org)
- Storing JWT secret in code rather than `.env`
- Forgetting to index `org_id` on every tenant-scoped table — performance degrades silently
- Using `id` as an integer instead of UUID — leaks resource count to attackers

---

## ⚙️ Phase 2 — API Keys, File Storage & Usage Tracking

### Phase Goal
Build Kyro's core product surface: API key management (the Stripe-style developer interface) and file storage operations (the AWS S3-style service), plus the usage tracking system that makes billing possible.

### Features to Build

**API Key System**
- Generate API keys (e.g., `kyro_live_abc123...`)
- Hash and store keys (never store raw key — same pattern as Stripe)
- Validate incoming API key on requests (middleware)
- Key scopes/permissions: `read`, `write`, `admin`
- Key revocation (soft delete)
- List all keys for an org

**File Storage**
- Upload file (multipart form-data) → store on local disk (Phase 2) or S3 (Phase 5)
- Download file by ID
- Delete file (soft delete + remove from disk)
- File metadata storage (name, size, mime type, path, org_id, uploader)
- Storage quota enforcement per organisation

**Usage Tracking**
- Log every API request: endpoint, method, status code, response time, bytes transferred
- Log every file operation: upload, download, delete with sizes
- Aggregate usage per org (daily/monthly rollups)
- Redis introduced here for: rate limiting + caching usage aggregates

### System Components Introduced
- `multer` for file uploads
- Local filesystem or S3-compatible storage (MinIO for local)
- Redis (rate limiting via `ioredis` + `rate-limiter-flexible`)
- `crypto` for API key generation and hashing
- Usage tracking middleware

### Architecture Level
**Modular Monolith**

### Data Model Evolution

```sql
CREATE TABLE api_keys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id),
  name          VARCHAR(255) NOT NULL,
  key_hash      TEXT UNIQUE NOT NULL,   -- SHA-256 hash of raw key
  key_prefix    VARCHAR(20) NOT NULL,   -- e.g. "kyro_live_abc1" for display
  scopes        TEXT[] DEFAULT '{"read"}',
  last_used_at  TIMESTAMP,
  revoked_at    TIMESTAMP,              -- NULL = active
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE files (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  uploaded_by   UUID NOT NULL REFERENCES users(id),
  name          VARCHAR(500) NOT NULL,
  storage_key   TEXT NOT NULL,          -- path on disk or S3 key
  mime_type     VARCHAR(255),
  size_bytes    BIGINT NOT NULL,
  deleted_at    TIMESTAMP,              -- NULL = active (soft delete)
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE usage_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organisations(id),
  api_key_id      UUID REFERENCES api_keys(id),
  endpoint        VARCHAR(500),
  method          VARCHAR(10),
  status_code     INT,
  response_ms     INT,
  bytes_in        BIGINT DEFAULT 0,
  bytes_out       BIGINT DEFAULT 0,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- Aggregate rollup table (populated by a cron/background job)
CREATE TABLE usage_daily (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organisations(id),
  date            DATE NOT NULL,
  total_requests  BIGINT DEFAULT 0,
  total_bytes_in  BIGINT DEFAULT 0,
  total_bytes_out BIGINT DEFAULT 0,
  storage_bytes   BIGINT DEFAULT 0,
  UNIQUE(org_id, date)
);

CREATE INDEX idx_files_org_id        ON files(org_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_usage_logs_org_id   ON usage_logs(org_id);
CREATE INDEX idx_usage_logs_created  ON usage_logs(created_at);
CREATE INDEX idx_api_keys_hash       ON api_keys(key_hash);
```

### API Surface

| Method | Endpoint                       | Auth          | Description                       |
|--------|--------------------------------|---------------|-----------------------------------|
| POST   | /api/v1/keys                   | JWT           | Create new API key                |
| GET    | /api/v1/keys                   | JWT           | List all org's API keys           |
| DELETE | /api/v1/keys/:id               | JWT           | Revoke an API key                 |
| POST   | /api/v1/files                  | API Key       | Upload a file                     |
| GET    | /api/v1/files                  | API Key       | List files for org                |
| GET    | /api/v1/files/:id              | API Key       | Download a file                   |
| DELETE | /api/v1/files/:id              | API Key       | Delete a file                     |
| GET    | /api/v1/usage                  | JWT           | Get usage summary for org         |
| GET    | /api/v1/usage/daily            | JWT           | Daily usage breakdown             |

### API Key Generation Pattern

```javascript
// How to generate and store API keys (never store raw key)
import crypto from 'crypto';

function generateApiKey() {
  const raw = `kyro_live_${crypto.randomBytes(32).toString('hex')}`;
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const prefix = raw.substring(0, 16); // for display e.g. "kyro_live_a3f9..."
  return { raw, hash, prefix };
  // Return raw key ONCE to the user, store only hash + prefix
}

// Validation middleware
async function validateApiKey(req, res, next) {
  const raw = req.headers['x-api-key'];
  if (!raw) return res.status(401).json({ error: 'API key required' });
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const key = await db.query(
    'SELECT * FROM api_keys WHERE key_hash = $1 AND revoked_at IS NULL', [hash]
  );
  if (!key.rows.length) return res.status(401).json({ error: 'Invalid API key' });
  req.orgId = key.rows[0].org_id;
  req.apiKeyId = key.rows[0].id;
  next();
}
```

### Infrastructure Additions
- Redis running locally (`redis-server` or `docker run redis`)
- Local file storage in a `./uploads/` directory (scoped by org_id)
- No Docker Compose yet — services still started individually

### Completion Checklist
- [ ] API key is shown to user exactly once on creation; only hash stored in DB
- [ ] API key middleware resolves `org_id` without needing JWT
- [ ] File uploads stored to `uploads/{orgId}/{fileId}` on disk
- [ ] Files are scoped to org — one org can never access another's files
- [ ] Rate limiting via Redis: e.g., 100 req/min per API key
- [ ] Every API request writes a usage log (async, non-blocking)
- [ ] Storage quota check before accepting upload
- [ ] File download streams (don't load entire file into memory)
- [ ] Soft delete: deleted files stay in DB with `deleted_at` set

### Common Mistakes
- Storing raw API keys in the database — hash them like passwords
- Blocking the event loop with file I/O — always use streams or async fs methods
- Writing usage logs synchronously in the request path — queue them or use `setImmediate`
- Not enforcing org_id on file queries — critical security isolation failure
- Loading entire file into memory for downloads — use `fs.createReadStream().pipe(res)`

---

## ⚙️ Phase 3 — Dockerization

### Phase Goal
Package the entire Kyro system into Docker containers so it runs identically in any environment. This eliminates "works on my machine" issues and is the prerequisite for everything that comes next. You do NOT add NGINX here yet.

### Features to Build
- `Dockerfile` for the Kyro API service
- `docker-compose.yml` with: API + PostgreSQL + Redis
- Docker volumes for persistent data (PostgreSQL data, file uploads)
- Docker networking (internal network for service-to-service communication)
- Environment variable injection through Docker
- Health checks in docker-compose for dependency readiness
- Database migration run on container startup

### System Components Introduced
- Docker + Docker Compose
- Multi-service Docker networking
- Docker named volumes (persistent storage)
- Container health checks

### Architecture Level
**Containerized System**

### Dockerfile

```dockerfile
# Dockerfile
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies first (cache this layer)
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY src/ ./src/

# Non-root user for security
RUN addgroup -S kyro && adduser -S kyro -G kyro
USER kyro

EXPOSE 3000
CMD ["node", "src/index.js"]
```

### docker-compose.yml

```yaml
version: '3.9'

services:
  api:
    build: .
    container_name: kyro-api
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://kyro:secret@postgres:5432/kyro
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - uploads:/app/uploads
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - kyro-net

  postgres:
    image: postgres:16-alpine
    container_name: kyro-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: kyro
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: kyro
    volumes:
      - pg-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U kyro"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - kyro-net

  redis:
    image: redis:7-alpine
    container_name: kyro-redis
    restart: unless-stopped
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
    networks:
      - kyro-net

volumes:
  pg-data:
  redis-data:
  uploads:

networks:
  kyro-net:
    driver: bridge
```

### Internal Docker Networking

```
┌─────────────────────────────────────────┐
│         kyro-net (bridge network)        │
│                                         │
│  ┌──────────┐    ┌──────────────────┐  │
│  │ kyro-api │───▶│   kyro-postgres  │  │
│  │  :3000   │    │      :5432       │  │
│  └──────────┘    └──────────────────┘  │
│       │                                 │
│       │          ┌──────────────────┐  │
│       └─────────▶│   kyro-redis     │  │
│                  │      :6379       │  │
│                  └──────────────────┘  │
│                                         │
│  Services talk by container name (DNS)  │
│  Only kyro-api port 3000 exposed       │
└─────────────────────────────────────────┘
```

### API Surface
No new endpoints in this phase. Focus is purely infrastructure.

### Infrastructure Additions
- `Dockerfile` at project root
- `docker-compose.yml` at project root
- `.dockerignore` (exclude `node_modules`, `.env`, `uploads/`, `.git`)
- `scripts/migrate.sh` — run migrations before API starts (or in entrypoint)

### Completion Checklist
- [ ] `docker compose up --build` starts all three services cleanly
- [ ] API is reachable at `http://localhost:3000/health`
- [ ] API connects to PostgreSQL via container hostname (`postgres`)
- [ ] API connects to Redis via container hostname (`redis`)
- [ ] `docker compose down && docker compose up` preserves database data (volumes)
- [ ] File uploads persist across container restarts (uploads volume)
- [ ] No secrets hardcoded in Dockerfile or docker-compose.yml — use `.env`
- [ ] `.dockerignore` prevents `node_modules` from being copied into image
- [ ] Container restarts automatically if API crashes (`restart: unless-stopped`)

### Common Mistakes
- Using `localhost` inside containers to connect to other services — use container names
- Not using `depends_on` with health checks — API starts before DB is ready and crashes
- Missing `.dockerignore` — `node_modules` gets copied, image balloons to gigabytes
- Running as root inside the container — use a non-root user
- Forgetting to mount a volume for uploads — files are lost on container restart
- Committing `.env` to git — add it to `.gitignore` immediately

---

## ⚙️ Phase 4 — NGINX Reverse Proxy & Load Balancing

### Phase Goal
Introduce NGINX as the entry point to the system. NGINX handles SSL termination, reverse proxies to the API, and load balances across multiple API container instances. This is the phase where Kyro begins to look like a real production backend.

### Features to Build
- NGINX configuration as a reverse proxy to the API
- Multiple API container instances (horizontal scaling demo)
- Round-robin load balancing across instances
- NGINX rate limiting at the edge
- Request buffering and timeout configuration
- Static error pages via NGINX
- (Optional) SSL termination with self-signed cert for local testing

### System Components Introduced
- NGINX (reverse proxy + load balancer)
- Multiple API instances (Docker Compose `scale` / `replicas`)
- Upstream block in NGINX config

### Architecture Level
**Distributed System**

### NGINX Configuration

```nginx
# nginx/nginx.conf

upstream kyro_api {
    least_conn;  # Route to instance with fewest active connections
    server kyro-api-1:3000;
    server kyro-api-2:3000;
    server kyro-api-3:3000;
}

# Rate limiting zone (100 req/sec per IP, burst of 200)
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;

server {
    listen 80;
    server_name _;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-Forwarded-For $proxy_add_x_forwarded_for;

    # Rate limiting
    limit_req zone=api_limit burst=200 nodelay;

    # Max upload size
    client_max_body_size 100M;

    location /health {
        access_log off;
        proxy_pass http://kyro_api;
    }

    location /api/ {
        proxy_pass         http://kyro_api;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Connection        "";  # Enable keepalives to upstream

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout    60s;
        proxy_read_timeout    60s;
    }
}
```

### Updated docker-compose.yml (Phase 4)

```yaml
version: '3.9'

services:
  nginx:
    image: nginx:alpine
    container_name: kyro-nginx
    restart: unless-stopped
    ports:
      - "80:80"       # HTTP
      # - "443:443"   # HTTPS (Phase 5)
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - api
    networks:
      - kyro-net

  api:
    build: .
    deploy:
      replicas: 3   # Three API instances
    environment:
      - DATABASE_URL=postgresql://kyro:secret@postgres:5432/kyro
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - uploads:/app/uploads
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - kyro-net
    # NOTE: No ports exposed here — NGINX is the only entry point

  postgres:
    image: postgres:16-alpine
    # ... (same as Phase 3)

  redis:
    image: redis:7-alpine
    # ... (same as Phase 3)

volumes:
  pg-data:
  redis-data:
  uploads:

networks:
  kyro-net:
    driver: bridge
```

### Full Request Flow (Phase 4)

```
Client (Browser / curl / SDK)
           │
           │ HTTP :80
           ▼
  ┌────────────────┐
  │     NGINX      │
  │  Rate limiting │
  │  SSL (future)  │
  │  Load balancer │
  └───────┬────────┘
          │ upstream: kyro_api (least_conn)
    ┌─────┼──────┐
    ▼     ▼      ▼
┌──────┐┌──────┐┌──────┐
│ API  ││ API  ││ API  │   3 stateless instances
│  :1  ││  :2  ││  :3  │   share same DB + Redis
└──┬───┘└──┬───┘└──┬───┘
   └────────┼───────┘
            │
    ┌───────┴────────┐
    │                │
    ▼                ▼
┌──────────┐   ┌──────────┐
│ Postgres │   │  Redis   │
│ (shared) │   │ (shared) │
└──────────┘   └──────────┘
```

### Critical Insight: Why API Must Be Stateless

For load balancing to work, API instances cannot store session state in memory. All state must live in:
- **PostgreSQL** — persistent data
- **Redis** — session cache, rate limit counters, usage cache

If you store anything in a JavaScript variable or in-process cache, requests routed to different instances will give inconsistent results.

### API Surface
No new endpoints. The same API is now served through NGINX with load balancing.

### Infrastructure Additions
- `nginx/` directory with `nginx.conf`
- NGINX service added to `docker-compose.yml`
- API service `replicas: 3` (or use `--scale api=3`)
- No direct port exposure on API containers (all traffic through NGINX on port 80)

### Completion Checklist
- [ ] `docker compose up --build` starts NGINX + 3 API instances + Postgres + Redis
- [ ] `curl http://localhost/health` returns 200 (through NGINX, not API directly)
- [ ] Load balancing confirmed: check Docker logs show requests hitting different API containers
- [ ] API containers are NOT accessible directly (no port mapping on API service)
- [ ] NGINX returns 503 if all API instances are down (not a raw connection error)
- [ ] File uploads still work through NGINX (check `client_max_body_size`)
- [ ] `X-Forwarded-For` header passes real client IP to API instances
- [ ] Rate limiting at NGINX level returns 429 when exceeded

### Common Mistakes
- Exposing API ports directly alongside NGINX — NGINX is bypassed entirely
- Session state stored in API process memory — breaks when requests hit different instances
- Forgetting `proxy_set_header Connection ""` — disables HTTP keepalives to upstream
- Not configuring `client_max_body_size` in NGINX — large file uploads get 413 errors
- Using `ip_hash` sticky sessions instead of fixing statelessness — masks the real problem
- Hardcoded `server` entries in upstream block — use Docker's internal DNS resolution

---

## ⚙️ Phase 5 — Production-Grade Scalable System

### Phase Goal
Harden Kyro for real production traffic. Add billing/subscription management, comprehensive observability, background job processing, object storage (S3/MinIO), and a deployment pipeline. This is the phase that takes the system from "it works" to "it's ready for paying customers."

### Features to Build

**Billing & Subscriptions**
- Integration with Stripe (or internal usage-based billing)
- Subscription plans: Free, Pro, Enterprise
- Stripe webhooks for payment events
- Billing portal endpoint (redirect to Stripe hosted page)
- Invoice history

**Object Storage**
- Replace local disk storage with S3-compatible storage (AWS S3 or MinIO)
- Pre-signed URLs for direct client uploads (bypass API server)
- CDN-ready file delivery URLs
- Per-org storage bucket or prefix

**Background Job System**
- Queue-based worker for: usage aggregation, email sending, large file processing
- Bull or BullMQ (backed by Redis) for job queues
- Separate worker container in Docker Compose

**Observability**
- Structured logging (JSON) with correlation IDs per request
- Prometheus metrics endpoint (`/metrics`)
- Grafana dashboard (via Docker Compose)
- Error tracking (Sentry)
- Request tracing (OpenTelemetry)

**Security Hardening**
- HTTPS via Let's Encrypt (Certbot) or Cloudflare proxy
- Helmet.js security headers
- CORS policy configuration
- Database connection pooling (PgBouncer)
- Secrets management (Docker secrets or AWS Secrets Manager)

**Developer Experience**
- OpenAPI/Swagger documentation auto-generated from routes
- SDK generation from OpenAPI spec (JavaScript, Python)
- Webhook system (Kyro sends events to customer endpoints)
- Sandbox/test mode (separate API key prefix: `kyro_test_`)

### System Components Introduced
- AWS S3 or MinIO (object storage)
- BullMQ + Redis (job queues)
- PgBouncer (connection pooling)
- Prometheus + Grafana (metrics)
- Stripe SDK (billing)
- Sentry (error tracking)
- Certbot / Let's Encrypt (TLS)

### Architecture Level
**Production Scalable System**

### Data Model Evolution

```sql
CREATE TABLE subscriptions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organisations(id),
  stripe_customer_id  TEXT UNIQUE,
  stripe_sub_id       TEXT UNIQUE,
  plan                VARCHAR(50) DEFAULT 'free',  -- free | pro | enterprise
  status              VARCHAR(50) DEFAULT 'active', -- active | cancelled | past_due
  current_period_end  TIMESTAMP,
  created_at          TIMESTAMP DEFAULT NOW()
);

CREATE TABLE invoices (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organisations(id),
  stripe_invoice_id   TEXT UNIQUE,
  amount_cents        INT NOT NULL,
  currency            VARCHAR(3) DEFAULT 'usd',
  status              VARCHAR(50),
  period_start        TIMESTAMP,
  period_end          TIMESTAMP,
  created_at          TIMESTAMP DEFAULT NOW()
);

CREATE TABLE webhooks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organisations(id),
  url           TEXT NOT NULL,
  secret        TEXT NOT NULL,  -- HMAC signing secret
  events        TEXT[],         -- e.g. {"file.uploaded","file.deleted"}
  active        BOOLEAN DEFAULT true,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE webhook_deliveries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id    UUID NOT NULL REFERENCES webhooks(id),
  event_type    VARCHAR(100),
  payload       JSONB,
  status_code   INT,
  response_body TEXT,
  delivered_at  TIMESTAMP DEFAULT NOW()
);
```

### API Surface

| Method | Endpoint                         | Description                          |
|--------|----------------------------------|--------------------------------------|
| GET    | /api/v1/billing/plan             | Get current subscription             |
| POST   | /api/v1/billing/portal           | Redirect to Stripe billing portal    |
| POST   | /api/v1/billing/webhook          | Stripe webhook receiver              |
| GET    | /api/v1/invoices                 | List invoices                        |
| POST   | /api/v1/webhooks                 | Register a webhook endpoint          |
| GET    | /api/v1/webhooks                 | List webhooks                        |
| DELETE | /api/v1/webhooks/:id             | Remove webhook                       |
| GET    | /metrics                         | Prometheus metrics (internal only)   |
| GET    | /api/v1/docs                     | Swagger UI                           |

### Infrastructure Additions
- HTTPS on NGINX (Certbot or Cloudflare proxy)
- PgBouncer container (connection pooler in front of Postgres)
- Worker container running BullMQ consumers
- Prometheus container scraping `/metrics`
- Grafana container reading from Prometheus
- MinIO container (or real AWS S3 bucket)

### Completion Checklist
- [ ] HTTPS works with valid certificate (no browser warnings)
- [ ] Stripe webhooks verified with HMAC signature
- [ ] File uploads go directly to S3/MinIO, not through API server
- [ ] Background jobs process without blocking request handling
- [ ] Prometheus scrapes metrics every 15 seconds
- [ ] Grafana dashboard shows: RPS, p95 latency, error rate, storage usage
- [ ] Sentry captures all uncaught exceptions with org context
- [ ] PgBouncer handles connection pooling — Postgres max_connections not exceeded under load
- [ ] Sandbox mode (`kyro_test_` keys) isolated from production data
- [ ] OpenAPI spec is accurate and matches real API behaviour

### Common Mistakes
- Processing Stripe webhooks without verifying the signature — spoofable
- Direct database connections in high-traffic without PgBouncer — Postgres runs out of connections
- Missing idempotency on webhook delivery — network retries cause duplicate events
- Not separating test/sandbox keys from production — test data pollutes production metrics
- Exposing `/metrics` to the public internet — scrape endpoint contains sensitive operational data

---

## 🧭 Current Phase Detector

Answer these questions to determine your exact phase and what to build next:

### Diagnostic Questions

**1. Do you have a working HTTP server with a `/health` endpoint?**
- No → **You are in Phase 0. Start there.**
- Yes → Continue to question 2

**2. Can users register, log in, and does every resource belong to an organisation?**
- No → **You are completing Phase 0. Build the auth system next (Phase 1).**
- Yes → Continue to question 3

**3. Do you have API key generation, file upload/download, and Redis rate limiting?**
- No → **You are in Phase 1. Build Phase 2 features next.**
- Yes → Continue to question 4

**4. Does your entire system run with a single `docker compose up` command?**
- No → **You are in Phase 2. Dockerize your system (Phase 3) next.**
- Yes → Continue to question 5

**5. Does NGINX sit in front of multiple API instances, and is port 80 the only entry point?**
- No → **You are in Phase 3. Add NGINX + load balancing (Phase 4) next.**
- Yes → Continue to question 6

**6. Do you have billing, S3 storage, background jobs, and observability (metrics/logging)?**
- No → **You are in Phase 4. Start Phase 5 hardening.**
- Yes → **You are in Phase 5. Focus on performance testing, SLAs, and scaling.**

---

### Phase Determination Summary

| If you have...                                      | You're in... | Build next...                  |
|-----------------------------------------------------|--------------|--------------------------------|
| Nothing yet                                         | Phase 0 start | HTTP server + DB connection    |
| `/health` endpoint + DB connection                  | Phase 0 done  | Auth + Orgs (Phase 1)          |
| Auth + JWT + Orgs                                   | Phase 1       | API keys + files + Redis       |
| API keys + file storage + Redis                     | Phase 2       | Dockerize (Phase 3)            |
| Docker Compose with all services                    | Phase 3       | NGINX + replicas (Phase 4)     |
| NGINX load balancing 3 API instances                | Phase 4       | Billing + S3 + observability   |
| Everything above + billing + metrics                | Phase 5       | Load test, scale, harden       |

---

### What's Missing Before Moving Forward?

Before advancing a phase, verify these hard requirements:

**Phase 0 → Phase 1:** PostgreSQL connected, `/health` returns 200, folder structure established, migrations infrastructure in place.

**Phase 1 → Phase 2:** JWT auth works, `org_id` isolation verified on all queries, roles enforced, no raw passwords in DB.

**Phase 2 → Phase 3:** All API features work locally, Redis rate limiting active, file streams (not buffered), usage logs writing.

**Phase 3 → Phase 4:** `docker compose up` works cleanly, data persists across restarts, no `localhost` references inside containers.

**Phase 4 → Phase 5:** API is stateless (verified by removing one instance without errors), NGINX proxying confirmed, load distribution visible in logs.

---

## 📋 Quick Reference — Technology Decisions

| Concern              | Chosen Technology              | Introduced In |
|----------------------|--------------------------------|---------------|
| HTTP Framework       | Express or Fastify             | Phase 0       |
| Database             | PostgreSQL                     | Phase 0       |
| Auth                 | JWT (jsonwebtoken)             | Phase 1       |
| Password hashing     | bcrypt                         | Phase 1       |
| Validation           | Zod or Joi                     | Phase 1       |
| File uploads         | Multer                         | Phase 2       |
| Caching              | Redis (ioredis)                | Phase 2       |
| Rate limiting        | rate-limiter-flexible          | Phase 2       |
| Containerization     | Docker + Docker Compose        | Phase 3       |
| Reverse proxy        | NGINX                          | Phase 4       |
| Load balancing       | NGINX upstream block           | Phase 4       |
| Object storage       | MinIO / AWS S3                 | Phase 5       |
| Background jobs      | BullMQ                         | Phase 5       |
| Billing              | Stripe                         | Phase 5       |
| Metrics              | Prometheus + Grafana           | Phase 5       |
| Error tracking       | Sentry                         | Phase 5       |
| Connection pooling   | PgBouncer                      | Phase 5       |

---

*Kyro Roadmap v1.0 — Built for solo backend developers learning production systems design.*
*Each phase is buildable. Each phase is a checkpoint. Build what's in front of you.*
