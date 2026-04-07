# 🎨 Kyro SaaS Frontend — Complete Phase-by-Phase Roadmap

> **A living engineering roadmap for building the Kyro frontend from zero to production-grade, in SvelteKit.**
> Mirrors the backend roadmap structure. Each phase maps directly to a backend phase.

---

## 📐 Architecture Evolution Diagram

```
  Phase 0
  ┌─────────────────────┐
  │   SvelteKit Skeleton │  ← Routing, layout, env config, /health ping
  │   + Design System   │    Fonts, tokens, base components
  └──────────┬──────────┘
             │
             ▼
  Phase 1
  ┌─────────────────────┐
  │  Auth & Org Shell   │  ← Register, login, JWT storage
  │                     │    Protected routes, org context
  └──────────┬──────────┘
             │
             ▼
  Phase 2
  ┌─────────────────────┐
  │  Core Dashboard     │  ← API key manager, file manager
  │                     │    Usage stats, org settings
  └──────────┬──────────┘
             │
             ▼
  Phase 3
  ┌─────────────────────┐
  │  Dockerized Frontend│  ← Dockerfile for SvelteKit
  │                     │    Added to compose, served via NGINX
  └──────────┬──────────┘
             │
             ▼
  Phase 4
  ┌─────────────────────┐
  │  NGINX Integration  │  ← NGINX routes / → SvelteKit
  │                     │    NGINX routes /api/ → backend
  │                     │    Single origin, no CORS
  └──────────┬──────────┘
             │
             ▼
  Phase 5
  ┌─────────────────────┐
  │  Production-Grade   │  ← Billing UI, observability,
  │  Scalable Frontend  │    error tracking, perf tuning
  └─────────────────────┘

Request Flow (Phase 4+):
  Browser
       │
       ▼
  ┌─────────┐
  │  NGINX  │  :80 / :443
  └────┬────┘
       │
  ┌────┴──────────────────────┐
  │                           │
  ▼                           ▼
┌───────────────┐       ┌───────────┐
│  SvelteKit    │       │  API      │
│  (web/)  /    │       │ /api/v1/  │
└───────────────┘       └───────────┘
```

---

## ⚙️ Phase 0 — SvelteKit Skeleton & Design System

### Phase Goal
Bootstrap a SvelteKit application with a solid design system, proper project structure, environment configuration, and a working connection to the backend's `/health` endpoint. The goal is a running app with a visual identity before a single real feature is built.

### Features to Build
- SvelteKit project with TypeScript (`npm create svelte@latest web`)
- Folder structure: `src/lib/`, `src/routes/`, `src/lib/components/`, `src/lib/api/`
- Design tokens (CSS custom properties: colors, spacing, typography, radius)
- Base component library: `Button`, `Input`, `Card`, `Badge`, `Spinner`, `Toast`
- Global layout with responsive shell (sidebar + main content area)
- Environment config via `.env` (`PUBLIC_API_URL`)
- API client wrapper (`src/lib/api/client.ts`) — base `fetch` with error handling
- `/health` route that pings backend and displays status
- `+error.svelte` — global error boundary page
- `+layout.svelte` — root layout with font loading and CSS reset

### System Components Introduced
- SvelteKit (routing, SSR/SPA, layouts)
- TypeScript
- CSS custom properties (design tokens)
- Svelte stores (`writable`, `derived`) for global state
- `vite` (bundler, built into SvelteKit)

### Project Structure

```
web/
├── src/
│   ├── app.css              ← Design tokens, reset, global styles
│   ├── app.html             ← HTML shell, font links
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts    ← Base fetch wrapper
│   │   │   └── health.ts    ← /health endpoint calls
│   │   ├── components/
│   │   │   ├── ui/          ← Button, Input, Card, Badge, etc.
│   │   │   └── layout/      ← Sidebar, Topbar, PageHeader
│   │   ├── stores/
│   │   │   └── toast.ts     ← Toast notification store
│   │   └── types/
│   │       └── index.ts     ← Shared TypeScript types
│   └── routes/
│       ├── +layout.svelte   ← Root layout
│       ├── +error.svelte    ← Error boundary
│       └── +page.svelte     ← Landing / redirect
├── .env                     ← PUBLIC_API_URL=http://localhost/api/v1
├── .env.example
├── svelte.config.js
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### Design Token System

```css
/* src/app.css */
:root {
  /* Colors */
  --color-bg:           #0d0d0f;
  --color-bg-2:         #17171a;
  --color-bg-3:         #1f1f24;
  --color-border:       #2a2a30;
  --color-text:         #e8e8ed;
  --color-text-muted:   #6b6b78;
  --color-accent:       #6366f1;    /* indigo — tweak to your brand */
  --color-accent-hover: #4f52d9;
  --color-danger:       #ef4444;
  --color-success:      #22c55e;
  --color-warning:      #f59e0b;

  /* Spacing scale */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  /* Typography */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --font-size-xs:   11px;
  --font-size-sm:   13px;
  --font-size-base: 14px;
  --font-size-lg:   16px;
  --font-size-xl:   20px;
  --font-size-2xl:  24px;
  --font-size-3xl:  30px;

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.4);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.5);
}
```

### Base API Client

```typescript
// src/lib/api/client.ts
import { PUBLIC_API_URL } from '$env/static/public';

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string;
  apiKey?: string;
};

export async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, token, apiKey } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token)  headers['Authorization'] = `Bearer ${token}`;
  if (apiKey) headers['X-API-Key'] = apiKey;

  const res = await fetch(`${PUBLIC_API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, error.error ?? 'Request failed');
  }

  return res.json();
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
```

### API Surface Consumed (Phase 0)

| Backend Endpoint | Usage |
|-----------------|-------|
| GET /health | Ping on `/health` page to confirm backend connectivity |

### Completion Checklist
- [ ] `npm run dev` starts SvelteKit on port 5173 without errors
- [ ] Design tokens are defined in `app.css` and used in all components (no hardcoded hex values)
- [ ] `Button`, `Input`, `Card`, `Badge`, `Spinner` components are built and match the design system
- [ ] `/health` page pings the backend and renders status
- [ ] `+error.svelte` renders a useful error page (not a blank screen)
- [ ] `PUBLIC_API_URL` is read from `.env` — not hardcoded anywhere
- [ ] TypeScript is strict — no `any` types in `client.ts`
- [ ] `.env.example` documents all required env vars

### Common Mistakes
- Hardcoding the API URL — use `$env/static/public` from the start
- Putting component styles in `app.css` — use Svelte's `<style>` blocks with `scoped` (default)
- Skipping the base API client and calling `fetch` directly in components — impossible to maintain
- No loading states in components — every API call needs a loading and error state from day one
- Skipping TypeScript types for API responses — you'll pay for this in Phase 2

---

## ⚙️ Phase 1 — Auth, Org Context & Protected Routes

### Phase Goal
Build the full authentication flow: registration, login, JWT storage, and org-scoped context propagation. Every subsequent page sits behind a route guard. This phase establishes the session model the entire app depends on.

### Features to Build
- Registration page: org name + user email + password
- Login page: email + password → JWT
- JWT storage in `httpOnly` cookie (via SvelteKit server hooks) or `localStorage` — see note below
- Auth store: `currentUser`, `currentOrg`, `isAuthenticated`
- Route guard via `+layout.server.ts` — redirect unauthenticated users to `/login`
- Logout (clear token, redirect to `/login`)
- `/dashboard` shell: sidebar nav, topbar with org name + user avatar initials
- Org context: org name, plan badge, member role — all derived from JWT claims
- Form validation: client-side with native constraint validation or a lightweight lib

### JWT Storage Note
Use SvelteKit's server-side hooks (`hooks.server.ts`) to store the JWT in an `httpOnly` cookie. This is more secure than `localStorage` (immune to XSS) and works seamlessly with SSR.

```
Browser ──POST /login──▶ SvelteKit server route
                              │
                              │ sets httpOnly cookie: kyro_token=<jwt>
                              ▼
                         Redirect to /dashboard
                              │
                              ▼ (subsequent requests)
                         hooks.server.ts reads cookie
                              │
                              ▼
                         event.locals.user = decoded JWT
```

### System Components Introduced
- SvelteKit server routes (`+page.server.ts`, `+layout.server.ts`)
- `hooks.server.ts` — JWT extraction and `event.locals` injection
- Svelte stores for client-side auth state
- `js-cookie` or native cookie handling (server-side only)
- `zod` for form schema validation (matches backend validation)

### Route Structure

```
src/routes/
├── (auth)/                  ← Auth group layout (centered, no sidebar)
│   ├── +layout.svelte
│   ├── login/
│   │   ├── +page.svelte
│   │   └── +page.server.ts  ← Calls POST /auth/login, sets cookie
│   └── register/
│       ├── +page.svelte
│       └── +page.server.ts  ← Calls POST /auth/register, sets cookie
│
└── (app)/                   ← Protected group layout (with sidebar)
    ├── +layout.svelte        ← Sidebar + topbar shell
    ├── +layout.server.ts     ← Route guard: redirect if no valid token
    └── dashboard/
        └── +page.svelte      ← Landing page after login
```

### Auth Store

```typescript
// src/lib/stores/auth.ts
import { writable, derived } from 'svelte/store';

type User = {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  orgId: string;
  orgName: string;
  plan: string;
};

export const user = writable<User | null>(null);
export const isAuthenticated = derived(user, $u => $u !== null);
export const isOwner = derived(user, $u => $u?.role === 'owner');
```

### Route Guard Pattern

```typescript
// src/routes/(app)/+layout.server.ts
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.user) {
    redirect(302, '/login');
  }
  return { user: locals.user };
};
```

### API Surface Consumed (Phase 1)

| Backend Endpoint | Usage |
|-----------------|-------|
| POST /api/v1/auth/register | Registration form submission |
| POST /api/v1/auth/login | Login form submission, receive JWT |
| GET /api/v1/auth/me | Populate auth store on app load |
| GET /api/v1/org | Display org name and plan in sidebar |

### Completion Checklist
- [ ] Register form creates org + user and redirects to `/dashboard`
- [ ] Login sets JWT in an `httpOnly` cookie (not `localStorage`)
- [ ] All `/app/**` routes redirect to `/login` if no valid token
- [ ] Sidebar displays org name, plan badge, and user role
- [ ] Logout clears the cookie and redirects to `/login`
- [ ] Form errors (invalid email, wrong password) display inline — not in a JS alert
- [ ] `hooks.server.ts` decodes JWT and populates `event.locals.user` on every request
- [ ] Registration page is not accessible when already logged in (redirect to `/dashboard`)

### Common Mistakes
- Storing JWT in `localStorage` — vulnerable to XSS; use `httpOnly` cookies
- Calling the backend directly from `+page.svelte` instead of `+page.server.ts` — exposes the API URL and bypasses server-side auth
- No feedback on form submission — always show a loading state on the submit button
- Trusting the client-side `user` store for authorization — always re-validate on the server in `load` functions
- Forgetting to handle expired JWTs — `hooks.server.ts` should catch 401s and clear the cookie

---

## ⚙️ Phase 2 — Core Dashboard: API Keys, Files & Usage

### Phase Goal
Build the three primary product surfaces of Kyro's dashboard: API key management, file management, and usage analytics. This is the phase where the app becomes a real product.

### Features to Build

**API Key Manager** (`/dashboard/keys`)
- List all org API keys (name, prefix, scopes, created date, last used)
- Create key modal: name input + scope checkboxes → display raw key once with a copy button
- Revoke key with a confirmation dialog
- Empty state with a "Create your first key" CTA

**File Manager** (`/dashboard/files`)
- File list with name, size, MIME type, uploaded date, uploader
- Upload via drag-and-drop zone + file picker (multipart form)
- Upload progress bar (using `XMLHttpRequest` for progress events)
- Download file (opens signed URL or triggers browser download)
- Delete file with confirmation
- Storage quota bar (used / total)
- Empty state

**Usage Dashboard** (`/dashboard/usage`)
- Total requests (current month)
- Total bandwidth (bytes in + out, formatted as MB/GB)
- Storage used
- Daily requests chart (line chart using a lightweight lib like `Chart.js` or `layerchart`)
- Date range selector (last 7 days / 30 days / 90 days)
- Per-endpoint breakdown table

**Org Settings** (`/dashboard/settings`)
- Display org name, slug, plan
- Invite member form (email + role)
- Member list with role badges
- Danger zone: delete org (owner only, with confirmation)

### System Components Introduced
- `Chart.js` or `layerchart` (usage charts)
- Drag-and-drop file upload (`FileReader` API)
- `XMLHttpRequest` upload progress (native — `fetch` doesn't support progress)
- Svelte `transition:` and `animate:` for list animations
- Clipboard API for the "Copy key" button

### One-Time Key Display Pattern

```svelte
<!-- Show raw key exactly once, then it's gone -->
<script lang="ts">
  let newKey: string | null = null;
  let copied = false;

  async function createKey(name: string, scopes: string[]) {
    const res = await request<{ key: string }>('/keys', {
      method: 'POST',
      body: { name, scopes },
      token: $user!.token,
    });
    newKey = res.key; // show it once
  }

  async function copy() {
    await navigator.clipboard.writeText(newKey!);
    copied = true;
    setTimeout(() => copied = false, 2000);
  }
</script>

{#if newKey}
  <div class="key-reveal">
    <p>Copy this key now — it won't be shown again.</p>
    <code>{newKey}</code>
    <button onclick={copy}>{copied ? 'Copied!' : 'Copy'}</button>
  </div>
{/if}
```

### Upload Progress Pattern

```typescript
// Use XHR instead of fetch for upload progress
export function uploadFile(
  file: File,
  token: string,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress((e.loaded / e.total) * 100);
    };
    xhr.onload = () => xhr.status < 400 ? resolve() : reject(xhr.responseText);
    xhr.onerror = () => reject('Network error');
    xhr.open('POST', `${PUBLIC_API_URL}/files`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    const fd = new FormData();
    fd.append('file', file);
    xhr.send(fd);
  });
}
```

### API Surface Consumed (Phase 2)

| Backend Endpoint | Usage |
|-----------------|-------|
| GET /api/v1/keys | API key list |
| POST /api/v1/keys | Create key, display once |
| DELETE /api/v1/keys/:id | Revoke key |
| GET /api/v1/files | File list |
| POST /api/v1/files | Upload file (multipart) |
| GET /api/v1/files/:id | Download file |
| DELETE /api/v1/files/:id | Delete file |
| GET /api/v1/usage | Usage summary |
| GET /api/v1/usage/daily | Chart data |
| GET /api/v1/org | Org settings |
| POST /api/v1/org/members | Invite member |

### Completion Checklist
- [ ] API key raw value is shown exactly once in a dismissable banner with a copy button
- [ ] File upload shows a progress bar — not a spinner
- [ ] Drag-and-drop upload works (dragover highlight, drop zone)
- [ ] Storage quota bar updates after every upload/delete
- [ ] Usage chart renders with real data from `/usage/daily`
- [ ] All list pages have empty states with CTAs — no blank screens
- [ ] Revoke key and delete file both require a confirmation dialog
- [ ] All data fetching uses SvelteKit `load` functions — not `onMount` fetch calls
- [ ] Large file sizes are displayed as KB/MB/GB — not raw bytes
- [ ] Delete/revoke actions are owner/admin only — member role sees read-only UI

### Common Mistakes
- Using `fetch` for file uploads — no progress event support; use `XMLHttpRequest`
- Showing the API key as a toast — it needs to be a persistent, copyable block until dismissed
- Fetching data in `onMount` instead of `load` — breaks SSR, causes flash of empty content
- No pagination on file and key lists — they will grow and need offset or cursor pagination
- Using `any` for API response types — define response interfaces for everything

---

## ⚙️ Phase 3 — Dockerize the Frontend

### Phase Goal
Package SvelteKit into a Docker container and run it alongside the backend in `compose.yaml`. SvelteKit's Node adapter serves the app. NGINX is not integrated yet — the frontend runs on its own port.

### Features to Build
- `Dockerfile` for SvelteKit (`web/Dockerfile`)
- Switch SvelteKit adapter to `@sveltejs/adapter-node`
- Add `web` service to `compose.yaml`
- Pass `PUBLIC_API_URL` as a build arg and runtime env var
- Frontend accessible at `http://localhost:5173` (or mapped port)

### Dockerfile

```dockerfile
# web/Dockerfile

FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Pass API URL at build time (Vite bakes PUBLIC_ vars into the bundle)
ARG PUBLIC_API_URL=http://localhost/api/v1
ENV PUBLIC_API_URL=$PUBLIC_API_URL

RUN npm run build

# ---

FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup -S kyro && adduser -S kyro -G kyro

COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production

USER kyro
EXPOSE 3001

ENV NODE_ENV=production
CMD ["node", "build"]
```

### SvelteKit Adapter

```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-node';

export default {
  kit: {
    adapter: adapter({ out: 'build' }),
  },
};
```

### Updated compose.yaml (Phase 3 addition)

```yaml
web:
  build:
    context: ./web
    args:
      PUBLIC_API_URL: http://localhost/api/v1
  container_name: kyro-web
  restart: unless-stopped
  ports:
    - "3001:3001"
  environment:
    - NODE_ENV=production
    - PORT=3001
  depends_on:
    api:
      condition: service_healthy
  networks:
    - kyro-net
```

### Completion Checklist
- [ ] `docker compose up --build` starts the `web` service cleanly
- [ ] Frontend is reachable at `http://localhost:3001`
- [ ] `PUBLIC_API_URL` is injected at build time via `--build-arg`
- [ ] Multi-stage Dockerfile: `builder` stage uses dev deps, `runner` stage has only production deps
- [ ] `.dockerignore` in `web/` excludes `node_modules`, `.svelte-kit`, `.env`
- [ ] Container runs as a non-root user
- [ ] Auth flows work end-to-end (register → login → dashboard) through containerised stack

### Common Mistakes
- Forgetting `adapter-node` — the default adapter targets Vercel/serverless and won't run as a plain Node server
- Not passing `PUBLIC_API_URL` as a build arg — Vite bakes env vars at build time, not runtime
- Exposing both `3000` (API) and `3001` (web) in production — in Phase 4, only NGINX port 80 should be exposed
- Copying `node_modules` into the runner stage — install fresh in runner with `--only=production`

---

## ⚙️ Phase 4 — NGINX Integration (Single Origin)

### Phase Goal
Route all traffic through NGINX. The frontend serves at `/`, the backend API at `/api/`. The browser talks to one origin (`http://yourdomain.com`), eliminating CORS entirely. The `web` service port is no longer exposed directly.

### NGINX Config Changes

```nginx
# nginx/nginx.conf — updated upstream + routing

upstream kyro_api {
  least_conn;
  server api:3000;
}

upstream kyro_web {
  server web:3001;
}

server {
  listen 80;
  server_name _;

  client_max_body_size 100M;
  limit_req zone=api_limit burst=200 nodelay;

  # --- Frontend (SvelteKit) ---
  location / {
    proxy_pass         http://kyro_web;
    proxy_http_version 1.1;
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
    proxy_set_header   Upgrade           $http_upgrade;
    proxy_set_header   Connection        "upgrade";  # for HMR in dev (not needed in prod)
  }

  # --- Backend API ---
  location /api/ {
    proxy_pass         http://kyro_api;
    proxy_http_version 1.1;
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
    proxy_set_header   Connection        "";
    proxy_connect_timeout 60s;
    proxy_send_timeout    60s;
    proxy_read_timeout    60s;
  }

  # --- Health (bypass rate limit) ---
  location /health {
    access_log off;
    proxy_pass http://kyro_api;
  }
}
```

### Updated compose.yaml (Phase 4)

```yaml
nginx:
  image: nginx:alpine
  container_name: kyro-nginx
  restart: unless-stopped
  ports:
    - "80:80"
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
  depends_on:
    - api
    - web           # ← add web dependency
  networks:
    - kyro-net

web:
  build:
    context: ./web
    args:
      PUBLIC_API_URL: /api/v1    # ← relative now — same origin, no CORS
  restart: unless-stopped
  # No ports: — web is internal only, NGINX is the entry point
  environment:
    - NODE_ENV=production
    - PORT=3001
  depends_on:
    api:
      condition: service_healthy
  networks:
    - kyro-net
```

### Why `PUBLIC_API_URL` Becomes Relative

In Phase 3, the frontend and backend were on different ports so you needed an absolute URL. After NGINX routes both through port 80 on the same origin, you can use a relative path:

```
Before (Phase 3):  PUBLIC_API_URL=http://localhost:3000/api/v1
After  (Phase 4):  PUBLIC_API_URL=/api/v1
```

This means zero CORS configuration needed. All browser requests go to the same origin and NGINX routes them internally.

### Security Headers (add to NGINX server block)

```nginx
add_header X-Frame-Options          "DENY"                always;
add_header X-Content-Type-Options   "nosniff"             always;
add_header Referrer-Policy          "strict-origin"       always;
add_header Permissions-Policy       "camera=(), microphone=()" always;
# add_header Content-Security-Policy  "..." always;  # add in Phase 5
```

### Completion Checklist
- [ ] `curl http://localhost/` returns the SvelteKit app through NGINX
- [ ] `curl http://localhost/api/v1/health` returns the backend through NGINX
- [ ] `web` service has no `ports:` mapping — not reachable directly
- [ ] `PUBLIC_API_URL` is now a relative path (`/api/v1`) — no hardcoded hostnames
- [ ] CORS is not configured anywhere in the backend — not needed on a single origin
- [ ] Security headers are present on all responses (`X-Frame-Options`, `X-Content-Type-Options`)
- [ ] File uploads through NGINX work correctly (`client_max_body_size 100M`)
- [ ] Auth cookie (`kyro_token`) flows correctly through NGINX (check `proxy_set_header` passes cookies)

### Common Mistakes
- Keeping `PUBLIC_API_URL` as an absolute URL — causes CORS issues when deployed to a real domain
- Adding CORS headers to the backend "just in case" — a sign the routing is wrong
- Not adding `web` to NGINX's `depends_on` — NGINX starts before SvelteKit is ready
- Forgetting to remove `ports:` from the `web` service — NGINX is bypassed for direct access
- Not forwarding the `Cookie` header through NGINX — auth breaks silently

---

## ⚙️ Phase 5 — Production-Grade Frontend

### Phase Goal
Make the frontend production-ready: HTTPS, error tracking, performance optimisation, billing UI, and a polished onboarding experience.

### Features to Build

**HTTPS / TLS**
- Add Let's Encrypt via `certbot` or `acme.sh` to NGINX
- Redirect HTTP → HTTPS in NGINX
- `HSTS` header (`Strict-Transport-Security`)

**Error Tracking**
- Integrate `Sentry` (`@sentry/sveltekit`) — captures frontend JS errors and SvelteKit load errors
- Source maps uploaded to Sentry at build time

**Performance**
- `Cache-Control` headers for static assets via NGINX (`/_app/immutable/` → 1 year)
- SvelteKit route-level code splitting (automatic, verify bundle sizes)
- Image optimisation for any user-uploaded images (lazy loading, `loading="lazy"`)
- Core Web Vitals baseline (LCP, CLS, INP) — measure before/after

**Billing UI** (`/dashboard/billing`)
- Current plan display
- Usage vs. plan limits (progress bars)
- Upgrade CTA (integrate Stripe Checkout redirect)
- Invoice history table
- Cancel subscription (with confirmation)

**Onboarding Flow**
- First-login wizard: org name → create first API key → copy key → done
- Progress steps component
- Skip option that can be resumed later

**Content Security Policy**
- Add `Content-Security-Policy` header in NGINX
- Audit and restrict script/style/connect sources

**NGINX Static Asset Caching**
```nginx
# Cache SvelteKit's immutable assets for 1 year
location /_app/immutable/ {
  proxy_pass http://kyro_web;
  add_header Cache-Control "public, max-age=31536000, immutable";
}
```

### Completion Checklist
- [ ] HTTPS works with a valid certificate (Let's Encrypt or your provider)
- [ ] HTTP redirects to HTTPS (301)
- [ ] `HSTS` header is set
- [ ] Sentry captures frontend errors in production (test by throwing a known error)
- [ ] Immutable assets (`/_app/immutable/`) are cached for 1 year
- [ ] Largest Contentful Paint (LCP) < 2.5s on a simulated 4G connection
- [ ] Billing page shows current plan and usage vs. limits
- [ ] Onboarding wizard fires on first login and does not repeat
- [ ] CSP header is present and does not break the app
- [ ] All environment variables are documented in `.env.example`

---

## 📦 Package Reference

| Package | Purpose | Phase |
|---------|---------|-------|
| `@sveltejs/adapter-node` | SvelteKit Node.js server | 3 |
| `zod` | Form + API response validation | 1 |
| `chart.js` / `layerchart` | Usage charts | 2 |
| `@sentry/sveltekit` | Error tracking | 5 |
| `js-cookie` | Cookie handling (if needed client-side) | 1 |

---

## 🔁 Phase → Backend Mapping

| Frontend Phase | Backend Phase | What Connects |
|---------------|---------------|---------------|
| Phase 0 | Phase 0 | `/health` ping |
| Phase 1 | Phase 1 | Auth endpoints, JWT flow |
| Phase 2 | Phase 2 | Keys, files, usage APIs |
| Phase 3 | Phase 3 | Both containerised, separate ports |
| Phase 4 | Phase 4 | NGINX unifies both under one origin |
| Phase 5 | Phase 5 | Billing, observability, TLS |
