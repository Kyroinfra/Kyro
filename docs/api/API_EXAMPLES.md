# API Examples

> Base URL: `http://localhost:3000`
>
> Auth routes use JWT (`Authorization: Bearer <token>`).
>
> File and Semantic routes use API Key (`X-API-Key: <key>`).
>
> Collection routes use JWT.

---

## Auth

```
POST /api/v2/auth/register
```
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "orgName": "Acme Corp"
}
```

```
POST /api/v2/auth/login
```
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

```
GET /api/v2/auth/me
```

---

## Organisation

```
GET /api/v2/org
```

```
GET /api/v2/org/members?limit=20&offset=0
```

```
POST /api/v2/org/members
```
```json
{
  "email": "colleague@example.com",
  "password": "temppassword123",
  "role": "member"
}
```

```
DELETE /api/v2/org/members/:id
```

---

## API Keys

```
GET /api/v2/keys?limit=20&offset=0
```

```
POST /api/v2/keys
```
```json
{
  "name": "My Integration Key",
  "scopes": ["read", "write"]
}
```

```
DELETE /api/v2/keys/:id
```

---

## Files v2

```
POST /api/v2/files
```
Send as `multipart/form-data` with a `file` field:
| Field | Type | Description |
|-------|------|-------------|
| file | File | The file to upload |

```
GET /api/v2/files?limit=20&cursor=<base64>
```

```
GET /api/v2/files/search?q=invoice+terms
```

```
GET /api/v2/files/:id
```

```
GET /api/v2/files/:id/text
```

```
POST /api/v2/files/:id/extract
```

```
POST /api/v2/files/:id/embed
```

```
GET /api/v2/files/:id/metadata
```

```
PUT /api/v2/files/:id/metadata
```
```json
{
  "matter_number": "M-2024-001",
  "client_name": "Acme Corp",
  "document_type": "contract"
}
```

```
DELETE /api/v2/files/:id/metadata/:key
```

```
DELETE /api/v2/files/:id
```

---

## Semantic

```
GET /api/v2/files/semantic-search?q=payment+terms&limit=10&min_score=0.01
```

```
POST /api/v2/files/ask
```
```json
{
  "question": "What are the payment terms?",
  "filters": {
    "matter_number": "M-2024-001",
    "document_type": ["contract", "amendment"]
  },
  "stream": false
}
```

Scoped to specific files:
```json
{
  "question": "What is the termination clause?",
  "fileIds": ["<uuid>", "<uuid>"],
  "stream": true
}
```

Org-wide search:
```json
{
  "question": "Who are the key stakeholders?",
  "stream": true
}
```

---

## Collections

```
GET /api/v2/collections
```

```
POST /api/v2/collections
```
```json
{
  "name": "Merger Documents",
  "description": "All documents related to the Q3 merger"
}
```

```
GET /api/v2/collections/:id
```

```
PATCH /api/v2/collections/:id
```
```json
{
  "name": "Updated Collection Name",
  "description": "Updated description"
}
```

```
DELETE /api/v2/collections/:id
```

```
GET /api/v2/collections/:id/files?limit=20&offset=0
```

```
POST /api/v2/collections/:id/files
```
```json
{
  "fileIds": ["<uuid>", "<uuid>"]
}
```

```
DELETE /api/v2/collections/:id/files/:fileId
```

---

## Webhooks

```
GET /api/v2/webhooks
```

```
POST /api/v2/webhooks
```
```json
{
  "url": "https://hooks.example.com/kyro-events",
  "events": ["extraction.completed", "embedding.completed"]
}
```

```
PATCH /api/v2/webhooks/:id
```
```json
{
  "url": "https://hooks.example.com/kyro-events-v2",
  "enabled": false
}
```

```
DELETE /api/v2/webhooks/:id
```

```
GET /api/v2/webhooks/:id/deliveries
```

```
GET /api/v2/webhooks/events
```

---

## Usage

```
GET /api/v2/usage?start_date=2024-01-01&end_date=2024-12-31
```

```
GET /api/v2/usage/daily?start_date=2024-01-01&end_date=2024-12-31
```

---

## Health

```
GET /health
```
