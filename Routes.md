## Auth (JWT)
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
GET    /api/v1/auth/me
```

## Organisation
```
GET    /api/v1/org
GET    /api/v1/org/members
POST   /api/v1/org/members
DELETE /api/v1/org/members/:id
```

## API Keys
```
POST   /api/v1/keys
GET    /api/v1/keys
DELETE /api/v1/keys/:id
```

## Files v1 (API Key auth)
```
POST   /api/v1/files
GET    /api/v1/files
GET    /api/v1/files/:id
DELETE /api/v1/files/:id
```

## Files v2 (API Key auth)
```
POST   /api/v2/files
GET    /api/v2/files
GET    /api/v2/files/search?q=
GET    /api/v2/files/:id
GET    /api/v2/files/:id/text
POST   /api/v2/files/:id/extract
POST   /api/v2/files/:id/embed
DELETE /api/v2/files/:id
```

## Semantic (API Key auth)
```
GET    /api/v2/files/semantic-search?q=
POST   /api/v2/files/ask
```

## Collections (JWT auth)
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

## Webhooks
```
GET    /api/v1/webhooks
POST   /api/v1/webhooks
PATCH  /api/v1/webhooks/:id
DELETE /api/v1/webhooks/:id
GET    /api/v1/webhooks/:id/deliveries
```

## Usage
```
GET    /api/v1/usage
GET    /api/v1/usage/daily
```

## Health
```
GET    /health
```
