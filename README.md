# Kyro — Language-Agnostic API Platform

Kyro is a SaaS backend platform providing file storage, API key management, and usage tracking via a clean REST API. It enables developers to integrate file storage into their applications without building infrastructure.

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Authentication](#authentication)
- [Features](#features)
- [Development Setup](#development-setup)
- [API Documentation](#api-documentation)

---

## Architecture

Kyro uses a **pnpm monorepo** with three packages:

```
kyro/
├── packages/
│   ├── api/          # Express REST API (backend)
│   ├── web/          # SvelteKit dashboard (frontend)
│   └── shared/       # OpenAPI specifications
├── compose.yaml      # Docker services (PostgreSQL, Redis)
└── nginx/          # Reverse proxy configuration
```

### packages/api

The core REST API built with Express.js. Handles all business logic:
- User authentication (register, login, JWT)
- Organisation management
- API key lifecycle (create, list, revoke, disable)
- File operations (upload, download, list, delete)
- Usage tracking and analytics

### packages/web

SvelteKit 5 application providing the web dashboard:
- User registration/login UI
- Organisation settings
- API key management UI
- File browser
- Usage analytics charts

### packages/shared

Shared OpenAPI 3.1 specification (`openapi-generated.yaml`). Single source of truth for API contracts.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| API Framework | Express.js |
| Language | TypeScript |
| Database | PostgreSQL (Drizzle ORM) |
| Cache/Sessions | Redis (ioredis) |
| Validation | Zod |
| Authentication | JWT (jsonwebtoken) + bcryptjs |
| File Storage | Local filesystem (S3-ready abstraction) |
| Rate Limiting | rate-limiter-flexible |
| Frontend | SvelteKit 5, Svelte 5 |
| Build Tool | Vite |
| Testing | Jest |

---

## Project Structure

### API Package (`packages/api/src/`)

```
api/src/
├── index.ts                 # Express app entry point
├── config/
│   └── index.ts             # Environment configuration
├── db/
│   ├── index.ts            # Database connection (Drizzle)
│   ├── schema.ts           # Table definitions
│   ├── migrate.ts         # Migration runner
│   └── redis.ts           # Redis client
├── routes/
│   ├── auth.ts            # /api/v1/auth (register, login, me)
│   ├── org.ts            # /api/v1/org (settings)
│   ├── keys.ts           # /api/v1/keys (API key CRUD)
│   ├── files.ts          # /api/v1/files (file operations)
│   ├── usage.ts         # /api/v1/usage (analytics)
│   └── health.ts        # /health (health check)
├── middleware/
│   ├── auth.ts           # JWT authentication
│   ├── apiKeyAuth.ts    # API key + scope validation
│   ├── rateLimit.ts     # Rate limiting
│   ├── upload.ts       # Multer file upload handling
│   ├── usageLogger.ts # Request usage logging
│   ├── requestLogger.ts# HTTP request logging
│   └── errorHandler.ts # Error handling
├── lib/
│   ├── auth.ts         # JWT sign/verify
│   ├── password.ts    # bcrypt utilities
│   ├── storage.ts    # File storage abstraction
│   ├── apiKey.ts    # API key generation
│   └── openapi.ts   # OpenAPI spec generation
├── validations/
│   └── auth.ts      # Zod schemas for auth endpoints
└── scripts/
    └── generate-openapi.ts  # OpenAPI spec generator
```

### Web Package (`packages/web/src/`)

```
web/src/
├── routes/
│   ├── (auth)/           # Authentication routes (login, register)
│   ├── (app)/            # Protected dashboard routes
│   │   └── dashboard/   # Dashboard pages (files, keys, usage, settings)
│   ├── api/              # API server routes (file downloads)
│   └── docs/             # API documentation
├── lib/
│   ├── api/              # Backend API clients
│   ├── components/       # UI components (Button, Input, Modal, etc.)
│   ├── stores/           # Svelte stores (auth, toast)
│   ├── types/           # TypeScript types
│   └── utils/           # Formatting utilities
├── app.css              # Global styles
└── app.html             # HTML template
```

---

## Database Schema

### Tables

**organisations**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | varchar(255) | Organisation name |
| slug | varchar(100) | Unique URL slug |
| plan | varchar(50) | Subscription plan (default: 'free') |
| storage_limit | bigint | Storage quota in bytes (default: 1GB) |
| created_at | timestamp | Creation timestamp |

**users**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| org_id | uuid | Foreign key to organisations |
| email | varchar(255) | Unique email address |
| password_hash | text | bcrypt hash |
| role | varchar(50) | Role: 'owner', 'admin', 'member' |
| created_at | timestamp | Creation timestamp |

**api_keys**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| org_id | uuid | Foreign key to organisations |
| user_id | uuid | Foreign key to users |
| name | varchar(255) | Key name for identification |
| key_hash | text | Hash of the API key |
| key_prefix | varchar(20) | First 20 chars for identification |
| scopes | text[] | Array of scope names |
| last_used_at | timestamp | Last usage timestamp |
| revoked_at | timestamp | Revocation timestamp |
| created_at | timestamp | Creation timestamp |

**files**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| org_id | uuid | Foreign key to organisations |
| uploaded_by | uuid | Foreign key to users |
| name | varchar(500) | File name |
| storage_key | text | Internal storage key |
| mime_type | varchar(255) | MIME type |
| size_bytes | bigint | File size in bytes |
| deleted_at | timestamp | Soft delete timestamp |
| created_at | timestamp | Creation timestamp |

**usage_logs**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| org_id | uuid | Foreign key to organisations |
| api_key_id | uuid | Foreign key to api_keys |
| endpoint | varchar(500) | API endpoint called |
| method | varchar(10) | HTTP method |
| status_code | integer | Response status code |
| response_ms | integer | Response time in ms |
| bytes_in | bigint | Bytes received |
| bytes_out | bigint | Bytes sent |
| created_at | timestamp | Request timestamp |

**usage_daily**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| org_id | uuid | Foreign key to organisations |
| date | date | Date (unique with org_id) |
| total_requests | bigint | Total API requests |
| total_bytes_in | bigint | Total bytes uploaded |
| total_bytes_out | bigint | Total bytes downloaded |
| storage_bytes | bigint | Total storage used |

---

## API Endpoints

### Base URL

```
/api/v1/
```

All API endpoints are prefixed with `/api/v1/` and are versioned. Once released, endpoints under `/api/v1/` are immutable.

### Authentication Endpoints (`/api/v1/auth`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|-------|
| POST | /auth/register | Register new user + organisation | None |
| POST | /auth/login | Login with email/password | None |
| GET | /auth/me | Get current user | JWT |

### Organisation Endpoints (`/api/v1/org`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|-------|
| GET | /org | Get organisation settings | JWT |
| PATCH | /org | Update organisation | JWT |

### API Key Endpoints (`/api/v1/keys`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|-------|
| GET | /keys | List API keys | JWT |
| POST | /keys | Create API key | JWT |
| GET | /keys/:id | Get API key details | JWT |
| DELETE | /keys/:id | Revoke API key | JWT |

### File Endpoints (`/api/v1/files`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|-------|
| GET | /files | List files (paginated) | API Key |
| POST | /files | Upload file | API Key |
| GET | /files/:id | Get file metadata | API Key |
| DELETE | /files/:id | Delete file | API Key |

### Usage Endpoints (`/api/v1/usage`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|-------|
| GET | /usage | Get usage statistics | JWT |

### System Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|-------|
| GET | /health | Health check | None |

---

## Authentication

Kyro supports **two authentication methods**:

### 1. JWT (Dashboard Access)

Used for web dashboard access. Obtained via `/api/v1/auth/login` or `/api/v1/auth/register`.

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "owner",
    "orgId": "uuid"
  }
}
```

### 2. API Keys (Programmatic Access)

Used for programmatic API access. Include in the `Authorization` header:

```
Authorization: Bearer kyro_sk_xxxxxxxxxxxxx
```

#### Scopes

API keys support **scope-based permissions**. Available scopes:

| Scope | Description |
|-------|-------------|
| `files:read` | List and download files |
| `files:write` | Upload files |
| `files:delete` | Delete files |

Example key with multiple scopes:
```json
{
  "name": "Production Key",
  "scopes": ["files:read", "files:write", "files:delete"]
}
```

---

## Features

### Multi-Tenant Isolation

- Each organisation is isolated via `org_id` foreign keys
- API keys are scoped to a single organisation
- File operations are restricted to the key's organisation

### Scope-Based Permissions

- API keys have explicit scopes
- Middleware validates scopes before processing requests
- Files endpoint requires `files:read`, `files:write`, or `files:delete` scope

### Rate Limiting

- Rate limiting per API key using Redis
- Configurable via middleware

### Usage Tracking

- Every API request is logged to `usage_logs`
- Daily aggregation in `usage_daily` table
- Dashboard shows request counts, bandwidth, and storage usage

### File Storage Abstraction

- Local filesystem storage (default)
- Storage interface in `packages/api/src/lib/storage.ts`
- S3 adapter can be added without changing API code

### OpenAPI Specification

- Single source of truth: `packages/shared/openapi/openapi-generated.yaml`
- Generated from route annotations using swagger-jsdoc
- Auto-sync via `pnpm generate:openapi`

---

## Development Setup

### Prerequisites

- Node.js
- pnpm
- Docker (for PostgreSQL + Redis)

### Installation

```bash
pnpm install
```

### Environment Variables

Create `.env` files:

**Root `.env`**
```
DATABASE_URL=postgres://user:pass@localhost:5432/kyro
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
NODE_ENV=development
PORT=3000
```

**packages/web/.env**
```
PUBLIC_API_URL=http://localhost:3000
```

### Running Services

Start PostgreSQL and Redis:

```bash
docker compose up -d
```

### Running API

```bash
pnpm dev:api
```

API runs on `http://localhost:3000`.

### Running Web Dashboard

```bash
pnpm dev:web
```

Dashboard runs on `http://localhost:5173`.

### Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm generate:openapi` | Generate OpenAPI spec from routes |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:push` | Push schema to database |
| `pnpm test` | Run unit tests |
| `pnpm lint` | Lint API code |

---

## API Documentation

The API is documented using **OpenAPI 3.1**. The specification is generated from route annotations in the codebase.

### Viewing Documentation

1. Generate the spec: `pnpm generate:openapi`
2. The specification is available at `packages/shared/openapi/openapi-generated.yaml`
3. Import into Swagger UI or OpenAPI editor

### Specification Location

```
packages/shared/openapi/openapi-generated.yaml
packages/shared/openapi/openapi-generated.json
```

---

## Future Roadmap

From TODO.md:

- [ ] S3-compatible storage adapter
- [ ] SDK generation (TypeScript, Python, Go)
- [ ] Webhooks system
- [ ] OAuth authentication
- [ ] Billing integration (Stripe)
- [ ] CLI tool

---

## License

ISC