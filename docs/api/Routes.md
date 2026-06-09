## V2 API (`/api/v2`)

### Auth (JWT)
```
POST   /api/v2/auth/register
POST   /api/v2/auth/login
GET    /api/v2/auth/me
```

### Organisation (JWT)
```
GET    /api/v2/org
GET    /api/v2/org/members
POST   /api/v2/org/members
DELETE /api/v2/org/members/:id
```

### API Keys (JWT)
```
POST   /api/v2/keys
GET    /api/v2/keys
DELETE /api/v2/keys/:id
```

### Files v2 (API Key auth)
```
POST   /api/v2/files
GET    /api/v2/files
GET    /api/v2/files/search?q=
GET    /api/v2/files/:id
GET    /api/v2/files/:id/text
POST   /api/v2/files/:id/extract
POST   /api/v2/files/:id/embed
GET    /api/v2/files/:id/metadata
PUT    /api/v2/files/:id/metadata
DELETE /api/v2/files/:id/metadata/:key
DELETE /api/v2/files/:id
```

### Semantic (API Key auth)
```
GET    /api/v2/files/semantic-search?q=
POST   /api/v2/files/ask
```

### Collections (JWT auth)
```
GET    /api/v2/collections
POST   /api/v2/collections
GET    /api/v2/collections/:id
PATCH  /api/v2/collections/:id
DELETE /api/v2/collections/:id
GET    /api/v2/collections/:id/files
POST   /api/v2/collections/:id/files
DELETE /api/v2/collections/:id/files/:fileId
```

### Webhooks (JWT)
```
GET    /api/v2/webhooks
POST   /api/v2/webhooks
PATCH  /api/v2/webhooks/:id
DELETE /api/v2/webhooks/:id
GET    /api/v2/webhooks/:id/deliveries
GET    /api/v2/webhooks/events
```

### Usage (JWT)
```
GET    /api/v2/usage
GET    /api/v2/usage/daily
```

---

## V1 Legacy API (`/api/v1`)

All routes in the V2 sections above are also available at `/api/v1/` with the same behaviour, except for:

### Files v1 (API Key auth)
```
POST   /api/v1/files
GET    /api/v1/files
GET    /api/v1/files/:id
DELETE /api/v1/files/:id
```

---

## Health
```
GET    /health
```
