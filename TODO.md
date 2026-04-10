# Kyro — Language-Agnostic API Platform TODO (Final Structured Plan)

---

# 0. SOURCE OF TRUTH (NON-NEGOTIABLE)
- [ ] Define OpenAPI 3.1 spec as single source of truth
- [ ] Ensure every endpoint is documented in OpenAPI
- [ ] Enforce schema-first development (API follows spec, not vice versa)
- [x] Add versioning strategy (`/api/v1/` locked and immutable)

---

# 1. CORE API (UNIVERSAL HTTP LAYER)
- [x] Build REST API foundation
- [x] Standardize request/response format:
  - [x] Success: `{ data, meta }`
  - [x] Error: `{ error: { code, message, details } }`
- [x] Implement API key authentication (Bearer token)
- [x] Add middleware pipeline:
  - [x] Auth middleware
  - [x] Scope/permission middleware
  - [x] Validation middleware
  - [x] Error handler (global)
- [x] Define consistent pagination (cursor-based preferred)

---

# 2. MULTI-TENANT SYSTEM
- [x] Implement Users
- [x] Implement Workspaces (core isolation unit)
- [x] Optional: Projects under Workspaces
- [x] Enforce strict data isolation per workspace
- [x] Define roles (future: owner, admin, member)

---

# 3. API KEY SYSTEM (SECURITY CORE)
- [x] Generate API keys per workspace
- [x] Hash API keys before storage (never store raw keys)
- [x] Show key only once at creation
- [x] Support multiple keys per workspace
- [x] Add key lifecycle:
  - [x] revoke
  - [ ] regenerate
  - [x] disable
- [x] Add metadata:
  - [x] name
  - [x] created_at
  - [x] last_used_at

---

# 4. SCOPES / PERMISSIONS SYSTEM
- [x] Replace simple read/write model
- [x] Define scopes:
  - [x] files:read
  - [x] files:write
  - [x] files:list
  - [x] files:delete
- [x] Middleware to enforce scope checks
- [ ] Map UI permissions → internal scopes

---

# 5. FILE STORAGE ENGINE (CORE PRODUCT VALUE)
- [x] Design bucket abstraction layer
- [x] Implement file upload API
- [x] Implement file download API
- [x] Implement file listing API
- [x] Implement file deletion API
- [x] Store file metadata:
  - [x] size
  - [x] mime type
  - [x] timestamps
  - [x] workspace ownership
- [x] Create storage adapter system:
  - [x] Local storage (MVP)
  - [ ] S3-compatible adapter (future)

---

# 6. PLATFORM RELIABILITY
- [x] Rate limiting per API key
- [x] Request validation everywhere
- [x] Central logging system
- [x] Prevent sensitive data leakage in logs
- [ ] Add retry-safe endpoints where needed
- [ ] Add idempotency keys (future for uploads)

---

# 7. USAGE & OBSERVABILITY
- [x] Track API requests per key
- [x] Track storage usage per workspace
- [ ] Track bandwidth usage (future)
- [x] Track last active timestamp
- [ ] Build usage aggregation system
- [ ] Internal analytics dashboard

---

# 8. DEVELOPER EXPERIENCE (DX CORE)
- [x] Clean, consistent error codes (machine-readable)
- [ ] Stable pagination across all list endpoints
- [x] Predictable API behavior (no edge-case responses)
- [x] Strict backward compatibility rules
- [ ] Sandbox environment:
  - [ ] kyro_test_ keys
  - [ ] isolated data environment

---

# 9. SDK ECOSYSTEM (LANGUAGE-AGNOSTIC STRATEGY)
## 9.1 API CONTRACT FIRST
- [ ] Maintain OpenAPI 3.1 as canonical contract
- [ ] Ensure spec completeness for all endpoints
- [ ] Auto-sync API changes → OpenAPI

---

## 9.2 SDK GENERATION SYSTEM
- [ ] Generate SDKs from OpenAPI spec:
  - [ ] TypeScript SDK (priority #1)
  - [ ] Python SDK
  - [ ] Go SDK
  - [ ] Java SDK (future)
  - [ ] Rust SDK (future)
- [ ] Ensure consistent naming across all SDKs
- [ ] Maintain versioned SDK releases aligned with API

---

## 9.3 CORE SDK DESIGN (TS REFERENCE IMPLEMENTATION)
- [ ] Create `KyroClient`
- [ ] Build HTTP abstraction layer:
  - [ ] auth injection
  - [ ] error normalization
  - [ ] retry handling (optional)
- [ ] Implement resource modules:
  - [ ] files
  - [ ] keys
  - [ ] usage
- [ ] Ensure full TypeScript strict typing

---

## 9.4 SDK FEATURE REQUIREMENTS
- [ ] File upload abstraction:
  - [ ] Buffer support
  - [ ] Stream support
  - [ ] Browser File support
- [ ] Automatic multipart handling
- [ ] Unified error class (`KyroError`)
- [ ] No raw fetch exposure
- [ ] Browser + Node compatibility builds

---

## 10. SDK DEVELOPER EXPERIENCE (DX LAYER)
- [ ] Simple API surface:
  - [ ] client.files.upload()
  - [ ] client.files.list()
  - [ ] client.files.delete()
- [ ] Clear error codes:
  - [ ] invalid_api_key
  - [ ] insufficient_scope
  - [ ] storage_quota_exceeded
- [ ] Safe defaults (prevent production mistakes)
- [ ] Test mode support (kyro_test_ enforcement)

---

# 11. TESTING & QUALITY
- [x] Unit tests for auth system
- [x] Unit tests for scope enforcement
- [ ] Integration tests for file system
- [ ] Load testing for upload endpoints
- [ ] SDK integration tests against sandbox API
- [ ] Contract testing against OpenAPI spec

---

# 12. DASHBOARD / CONTROL PLANE
- [x] Workspace dashboard
- [x] API key management UI
- [x] File browser UI
- [x] Usage analytics UI
- [x] Key creation UI (with scope selection)
- [ ] Onboarding flow for new users

---

# 13. SCALABILITY PREPARATION
- [x] Storage abstraction layer (local → S3 migration ready)
- [x] Stateless API design
- [ ] Background job system (future)
- [ ] Caching layer (Redis optional future)
- [ ] Queue system for uploads (future optimization)

---

# 14. EVENT SYSTEM (FUTURE PLATFORM UPGRADE)
- [ ] Webhooks:
  - [ ] file.uploaded
  - [ ] file.deleted
  - [ ] key.created
- [ ] Webhook signing system
- [ ] Retry mechanism for failed webhooks

---

# 15. PLATFORM EXPANSION (FUTURE)
- [ ] CLI tool for developers
- [ ] OAuth-based authentication (enterprise use case)
- [ ] Billing system (Stripe integration)
- [ ] Team collaboration (multi-user workspaces)
- [ ] Public API ecosystem (third-party integrations)
