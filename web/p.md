
# 🖥️ Kyro Frontend — Phase-by-Phase Roadmap

> **A frontend roadmap for building the Kyro dashboard in Next.js.**
> Sits in `apps/web/` inside your existing monorepo.
> Built to work with the Kyro API you've already completed through Phase 4.

---

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  KYRO FRONTEND                      │
└─────────────────────────────────────────────────────┘

  apps/web/
  ├── app/                     ← Next.js App Router pages
  │   ├── (auth)/              ← Login / Register (no sidebar)
  │   │   ├── login/
  │   │   └── register/
  │   ├── (dashboard)/         ← Protected pages (with sidebar)
  │   │   ├── dashboard/       ← Overview / home
  │   │   ├── keys/            ← API key management
  │   │   ├── files/           ← File browser
  │   │   └── usage/           ← Usage stats
  │   └── layout.tsx
  ├── components/
  │   ├── ui/                  ← shadcn/ui primitives
  │   └── app/                 ← Your own components
  ├── lib/
  │   ├── api.ts               ← Axios instance pointing at Kyro API
  │   └── auth.ts              ← Token helpers
  └── middleware.ts            ← Route protection


Request Flow:
  Browser
    │
    ▼
  Next.js (apps/web — port 3001)
    │  calls
    ▼
  NGINX (port 80)
    │  proxies to
    ▼
  Kyro API (3 instances)
    │
    ▼
  PostgreSQL + Redis
```

---

## ⚙️ Phase 0 — Project Setup

### Phase Goal
Scaffold the Next.js app inside the monorepo, connect it to Tailwind and shadcn/ui, and verify it runs alongside the API with a single `npm run dev` from the root.

### What to Do
- Scaffold Next.js inside `apps/web/` with the App Router
- Install and configure Tailwind CSS
- Install and configure shadcn/ui
- Set up an `.env.local` with `NEXT_PUBLIC_API_URL=http://localhost`
- Create a minimal `lib/api.ts` — an axios instance that reads the API URL from env
- Verify `npm run dev` from monorepo root starts both API and web concurrently

### Folder Structure

```
apps/web/
├── app/
│   ├── layout.tsx         ← Root layout (fonts, global CSS)
│   └── page.tsx           ← Redirects to /login
├── lib/
│   └── api.ts             ← Axios base instance
├── .env.local
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

### `lib/api.ts`

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('kyro_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('kyro_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Completion Checklist
- [ ] `npm run dev` from monorepo root starts both `apps/api` and `apps/web`
- [ ] Next.js app is reachable at `http://localhost:3001`
- [ ] Tailwind styles render correctly (test with a colored div)
- [ ] shadcn/ui Button component renders without errors
- [ ] `lib/api.ts` exists and points to `http://localhost` (your NGINX)
- [ ] `app/page.tsx` redirects to `/login`

### Common Mistakes
- Installing shadcn/ui at the monorepo root instead of inside `apps/web/`
- Pointing `NEXT_PUBLIC_API_URL` at `http://localhost:3000` directly — always go through NGINX on port 80
- Forgetting `NEXT_PUBLIC_` prefix — env vars without it are invisible to the browser

---

## ⚙️ Phase 1 — Auth Screens (Register & Login)

### Phase Goal
Build the register and login screens. On success, store the JWT and redirect to the dashboard. On failure, show the error clearly.

### Screens to Build

**Register** (`/register`)
- Organisation name input
- Email input
- Password input
- Submit → calls `POST /api/v1/auth/register`
- On success → store token → redirect to `/dashboard`
- On error → show error message inline

**Login** (`/login`)
- Email input
- Password input
- Submit → calls `POST /api/v1/auth/login`
- On success → store token → redirect to `/dashboard`
- On error → show "Invalid email or password"
- Link to `/register`

### Route Group Structure

```
app/
└── (auth)/
    ├── layout.tsx     ← Centered card layout, no sidebar
    ├── login/
    │   └── page.tsx
    └── register/
        └── page.tsx
```

### Token Storage Pattern

```typescript
// After successful login/register
const { token } = response.data;
localStorage.setItem('kyro_token', token);
router.push('/dashboard');
```

### `middleware.ts` — Route Protection

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const token = request.cookies.get('kyro_token')?.value;
  const isPublic = PUBLIC_ROUTES.some(route =>
    request.nextUrl.pathname.startsWith(route)
  );

  if (!token && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (token && isPublic) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

> **Note:** Middleware reads cookies, not localStorage. On login, store the token in both localStorage (for axios) and a cookie (for middleware). See Phase 1 common mistakes.

### Completion Checklist
- [ ] Register creates an org and logs the user in (one flow, no separate steps)
- [ ] Login stores the JWT token on success
- [ ] Both forms show loading state while the request is in flight
- [ ] Both forms show the API error message on failure (not a generic "something went wrong")
- [ ] Successful auth redirects to `/dashboard`
- [ ] Already-logged-in users are redirected away from `/login` and `/register`
- [ ] Protected routes redirect to `/login` if no token exists

### Common Mistakes
- Storing token only in localStorage — Next.js middleware cannot read localStorage (it runs on the server). Store in both localStorage AND a cookie
- Not showing loading state — users will double-click the button and submit twice
- Catching errors but not displaying them — `error.response.data.error` has your API's message, use it
- Using `<form action>` instead of `onSubmit` with preventDefault in Next.js client components

---

## ⚙️ Phase 2 — Dashboard Layout & Overview

### Phase Goal
Build the shell that wraps all authenticated pages: a sidebar with navigation and a header showing the org name. Add a dashboard home screen with a quick stats overview.

### What to Build

**Shared Layout** (`app/(dashboard)/layout.tsx`)
- Sidebar with links: Dashboard, API Keys, Files, Usage
- Header with org name and a logout button
- Main content area

**Dashboard Home** (`/dashboard`)
- Total files count
- Storage used (formatted: "12.4 MB")
- Total API requests this month
- Active API keys count
- Each stat is a card — fetched from `GET /api/v1/usage` and `GET /api/v1/files`

### Sidebar Structure

```
┌─────────────────┐
│  Kyro           │  ← Logo / wordmark
│                 │
│  ○ Dashboard    │
│  ○ API Keys     │
│  ○ Files        │
│  ○ Usage        │
│                 │
│  ─────────────  │
│  org name       │  ← from GET /api/v1/org
│  Logout         │
└─────────────────┘
```

### Data to Fetch on Dashboard Home

```typescript
// Fetch in parallel
const [usage, files, keys] = await Promise.all([
  api.get('/api/v1/usage'),
  api.get('/api/v1/files'),
  api.get('/api/v1/keys'),
]);
```

### Completion Checklist
- [ ] Sidebar renders on all dashboard pages
- [ ] Active route is highlighted in the sidebar
- [ ] Org name displays correctly in sidebar (fetched from API, not hardcoded)
- [ ] Logout clears token from localStorage and cookie, redirects to `/login`
- [ ] Dashboard home shows real numbers from the API
- [ ] Stats cards show a skeleton/loading state while fetching
- [ ] Layout works on mobile (sidebar collapses or becomes a hamburger menu)

### Common Mistakes
- Fetching org data in every page instead of once in the layout
- Not handling the loading state — flash of empty content looks broken
- Logout only clearing localStorage but not the cookie — middleware still sees the cookie and lets them in

---

## ⚙️ Phase 3 — API Keys Management

### Phase Goal
Build the full API key management screen. Users can see all their keys, create new ones, and revoke them. This is the most important screen in Kyro — it's how users access your product.

### What to Build

**Keys List** (`/keys`)
- Table of all API keys: name, prefix, scopes, created date, last used
- Revoked keys shown greyed out (or hidden, your choice)
- "Create Key" button opens a modal

**Create Key Modal**
- Key name input
- Scope selector: `read` or `read + write`
- Submit → calls `POST /api/v1/keys`
- On success → show the raw key **once** in a modal with a copy button
- Warning: "This key will not be shown again. Copy it now."

**Revoke Key**
- Each key row has a "Revoke" button
- Confirmation dialog before revoking
- Calls `DELETE /api/v1/keys/:id`
- Key is removed from the list on success

### The "Show Key Once" Pattern

```typescript
const [createdKey, setCreatedKey] = useState<string | null>(null);

const handleCreate = async () => {
  const res = await api.post('/api/v1/keys', { name, scopes });
  setCreatedKey(res.data.key); // raw key, shown once
  // re-fetch key list (raw key won't be in list, only prefix)
};

// In JSX — show this modal only when createdKey is set
{createdKey && (
  <Modal>
    <p>Copy your API key now. It will not be shown again.</p>
    <code>{createdKey}</code>
    <CopyButton value={createdKey} />
    <Button onClick={() => setCreatedKey(null)}>I've copied it</Button>
  </Modal>
)}
```

### Completion Checklist
- [ ] Keys list shows all active keys with name, prefix, scopes, and dates
- [ ] Create key modal validates name is not empty before submitting
- [ ] Raw key is displayed exactly once after creation with a copy button
- [ ] Copy button gives visual feedback ("Copied!" for 2 seconds)
- [ ] Revoke asks for confirmation before calling the API
- [ ] Revoked key disappears from the list immediately (optimistic update or re-fetch)
- [ ] Empty state shown when org has no keys yet

### Common Mistakes
- Showing the raw key in the keys list — your API doesn't return it, and it shouldn't
- Not copying to clipboard properly — use `navigator.clipboard.writeText()`
- Skipping the confirmation on revoke — easy to accidentally revoke a key in production
- Not re-fetching the key list after creating or revoking

---

## ⚙️ Phase 4 — File Browser

### Phase Goal
Build the file browser. Users can see all uploaded files, upload new ones through the dashboard, and delete files. This screen makes Kyro tangible — users can see their data.

### What to Build

**File List** (`/files`)
- Table or grid of files: name, size, type, uploaded date, uploader
- File size formatted (bytes → KB/MB/GB)
- Upload button
- Delete button per file

**File Upload**
- Click upload → file picker opens
- Selected file → calls `POST /api/v1/files` with `multipart/form-data`
- Progress bar during upload (axios `onUploadProgress`)
- On success → file appears in list

**File Delete**
- Confirmation dialog
- Calls `DELETE /api/v1/files/:id`
- File removed from list on success

### Upload with Progress

```typescript
const handleUpload = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  await api.post('/api/v1/files', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      const percent = Math.round(
        (progressEvent.loaded * 100) / (progressEvent.total ?? 1)
      );
      setProgress(percent);
    },
  });
};
```

### File Size Formatter

```typescript
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}
```

### Completion Checklist
- [ ] File list shows all files with name, formatted size, type, and date
- [ ] Upload opens a file picker (no drag-and-drop needed yet)
- [ ] Upload progress is visible while uploading
- [ ] Uploaded file appears in list immediately after success
- [ ] Delete asks for confirmation
- [ ] Deleted file disappears from list immediately
- [ ] Empty state shown when org has no files
- [ ] Large file names truncate with ellipsis instead of breaking layout

### Common Mistakes
- Forgetting `Content-Type: multipart/form-data` header on upload — API rejects it
- Not resetting the file input after upload — user can't upload the same file twice
- Loading all file metadata into memory — just show the list, don't fetch file contents
- Not formatting file sizes — "1048576 bytes" means nothing to a user

---

## ⚙️ Phase 5 — Usage Screen & Polish

### Phase Goal
Add the usage screen showing request and storage history. Then polish the whole app — loading states, error states, empty states, and mobile responsiveness — so it feels finished.

### What to Build

**Usage Screen** (`/usage`)
- Daily requests bar chart (last 30 days) — use `recharts`
- Storage used over time line chart
- Summary stats: total requests this month, total data transferred
- Data from `GET /api/v1/usage/daily`

**Polish Pass**
- Every data-fetching screen has three states: loading (skeleton), error (message + retry), and success
- Every destructive action has a confirmation dialog
- All tables have empty states with a helpful message and a CTA
- Toast notifications for: key created, key revoked, file uploaded, file deleted
- Mobile sidebar (hamburger menu or bottom nav)
- Consistent spacing and typography throughout

### Recharts Example

```typescript
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

<ResponsiveContainer width="100%" height={300}>
  <BarChart data={dailyUsage}>
    <XAxis dataKey="date" />
    <YAxis />
    <Tooltip />
    <Bar dataKey="total_requests" fill="#6366f1" radius={[4, 4, 0, 0]} />
  </BarChart>
</ResponsiveContainer>
```

### Toast Notifications

```typescript
// Install: npx shadcn@latest add toast
import { useToast } from '@/components/ui/use-toast';

const { toast } = useToast();

// After revoking a key
toast({
  title: 'Key revoked',
  description: 'The API key has been permanently revoked.',
});
```

### Completion Checklist
- [ ] Usage chart renders with real data from the API
- [ ] Chart dates are formatted readably (e.g. "Apr 5" not "2026-04-05")
- [ ] Every screen has a loading skeleton (not a spinner — skeletons look more professional)
- [ ] Every screen has an error state with a retry button
- [ ] Toast appears after every user action (create, delete, revoke, upload)
- [ ] App is usable on a 375px wide mobile screen
- [ ] No layout breaks when data is longer than expected (long file names, long org names)
- [ ] Favicon and page titles set correctly per route

### Common Mistakes
- Adding polish before core screens work — always get it functional first
- Using spinners everywhere — skeleton loaders look significantly more professional
- Forgetting error states — a blank screen on a failed fetch looks like a bug
- Skipping mobile — even a developer tool gets opened on a phone

---

## 🧭 Current Phase Detector

**1. Does `npm run dev` start the web app at localhost:3001?**
- No → **Phase 0. Scaffold the Next.js app first.**
- Yes → Continue

**2. Can you register an org and log in through the browser?**
- No → **Phase 0 done. Build auth screens (Phase 1).**
- Yes → Continue

**3. Is there a dashboard layout with a sidebar and navigation?**
- No → **Phase 1 done. Build the shell (Phase 2).**
- Yes → Continue

**4. Can users create, view, and revoke API keys?**
- No → **Phase 2 done. Build key management (Phase 3).**
- Yes → Continue

**5. Can users upload, view, and delete files through the browser?**
- No → **Phase 3 done. Build the file browser (Phase 4).**
- Yes → Continue

**6. Is there a usage chart and does the app feel polished end to end?**
- No → **Phase 4 done. Add usage screen and polish (Phase 5).**
- Yes → **You're done. Ship it.**

---

## 📋 Quick Reference — Technology Decisions

| Concern             | Technology                  | Introduced In |
|---------------------|-----------------------------|---------------|
| Framework           | Next.js (App Router)        | Phase 0       |
| Styling             | Tailwind CSS                | Phase 0       |
| Component library   | shadcn/ui                   | Phase 0       |
| HTTP client         | Axios                       | Phase 0       |
| Route protection    | Next.js Middleware          | Phase 1       |
| Charts              | Recharts                    | Phase 5       |
| Toast notifications | shadcn/ui Toast             | Phase 5       |

---

## 🐳 Adding Web to Docker (When Ready)

When you're ready to add the frontend to your `compose.yaml`:

```yaml
web:
  build:
    context: ./apps/web
  restart: unless-stopped
  environment:
    - NEXT_PUBLIC_API_URL=http://nginx
  depends_on:
    - nginx
  networks:
    - kyro-net
```

And add a route in `nginx/nginx.conf`:

```nginx
location / {
  proxy_pass http://web:3000;
}

location /api/ {
  proxy_pass http://kyro_api;
}
```

This way NGINX serves both the frontend and API from port 80 — one entry point for everything.

---

*Kyro Frontend Roadmap v1.0*
*Build one phase at a time. Each phase is a working, demonstrable checkpoint.*


---

C Advice

Here's your frontend roadmap:Same structure as your backend roadmap — five phases, each one a working checkpoint.

A few things worth noting that are specific to your setup:

The Docker section at the bottom is important. When you eventually add the frontend to `compose.yaml`, NGINX becomes the single entry point for both the dashboard and the API. Your VPS only needs one port open.

Also pay attention to the token storage note in Phase 1 — Next.js middleware runs on the server and can't read localStorage, so you need to store the JWT in both localStorage (for axios) and a cookie (for middleware). That catches most people off guard.

Start with Phase 0 — scaffold the Next.js app and get `npm run dev` running both apps. Want me to walk you through that setup?
