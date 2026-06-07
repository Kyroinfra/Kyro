# Database Schema

All tables are defined in `packages/api/src/db/schema.ts` using Drizzle ORM with PostgreSQL.

---

## `organisations`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | `uuid` | PK, `defaultRandom()` | — |
| `name` | `varchar(255)` | NOT NULL | — |
| `slug` | `varchar(100)` | NOT NULL, UNIQUE | — |
| `plan` | `varchar(50)` | | `'free'` |
| `storage_limit` | `bigint` | | `1073741824` (1 GB) |
| `created_at` | `timestamp` | | `now()` |

---

## `users`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | `uuid` | PK, `defaultRandom()` | — |
| `org_id` | `uuid` | NOT NULL, FK → `organisations.id` ON DELETE CASCADE | — |
| `email` | `varchar(255)` | NOT NULL, UNIQUE | — |
| `password_hash` | `text` | NOT NULL | — |
| `role` | `varchar(50)` | | `'member'` |
| `created_at` | `timestamp` | | `now()` |

**Indexes:**
- `idx_users_org_id` on `org_id`
- `idx_users_email` on `email`

---

## `api_keys`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | `uuid` | PK, `defaultRandom()` | — |
| `org_id` | `uuid` | NOT NULL, FK → `organisations.id` ON DELETE CASCADE | — |
| `user_id` | `uuid` | NOT NULL, FK → `users.id` | — |
| `name` | `varchar(255)` | NOT NULL | — |
| `key_hash` | `text` | NOT NULL, UNIQUE | — |
| `key_prefix` | `varchar(20)` | NOT NULL | — |
| `scopes` | `text[]` | | `ARRAY['read']` |
| `last_used_at` | `timestamp` | | `null` |
| `revoked_at` | `timestamp` | | `null` |
| `created_at` | `timestamp` | | `now()` |

**Indexes:**
- `idx_api_keys_hash` on `key_hash`

---

## `files`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | `uuid` | PK, `defaultRandom()` | — |
| `org_id` | `uuid` | NOT NULL, FK → `organisations.id` ON DELETE CASCADE | — |
| `uploaded_by` | `uuid` | NOT NULL, FK → `users.id` | — |
| `name` | `varchar(500)` | NOT NULL | — |
| `storage_key` | `text` | NOT NULL | — |
| `mime_type` | `varchar(255)` | | `null` |
| `size_bytes` | `bigint` | NOT NULL | — |
| `extracted_text` | `text` | | `null` |
| `text_search_vector` | `tsvector` | | `null` |
| `extraction_job_id` | `uuid` | | `null` |
| `embedding_status` | `varchar(50)` | | `'pending'` |
| `deleted_at` | `timestamp` | | `null` |
| `created_at` | `timestamp` | | `now()` |

**Indexes:**
- `idx_files_org_id` on `org_id` (partial: `WHERE deleted_at IS NULL`)
- `idx_files_extraction_job_id` on `extraction_job_id`

---

## `text_extraction_jobs`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | `uuid` | PK, `defaultRandom()` | — |
| `file_id` | `uuid` | NOT NULL, FK → `files.id` ON DELETE CASCADE, UNIQUE | — |
| `status` | `varchar(50)` | NOT NULL | `'pending'` |
| `attempts` | `integer` | NOT NULL | `0` |
| `max_attempts` | `integer` | NOT NULL | `3` |
| `error` | `text` | | `null` |
| `started_at` | `timestamp` | | `null` |
| `completed_at` | `timestamp` | | `null` |
| `created_at` | `timestamp` | | `now()` |

**Indexes:**
- `idx_text_jobs_file_id` UNIQUE on `file_id`
- `idx_text_jobs_status` on `status`

---

## `file_chunks`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | `uuid` | PK, `defaultRandom()` | — |
| `file_id` | `uuid` | NOT NULL, FK → `files.id` ON DELETE CASCADE | — |
| `org_id` | `uuid` | NOT NULL, FK → `organisations.id` ON DELETE CASCADE | — |
| `chunk_index` | `integer` | NOT NULL | — |
| `content` | `text` | NOT NULL | — |
| `embedding` | `vector(768)` | | `null` |
| `token_count` | `integer` | | `null` |
| `text_search_vector` | `tsvector` | | `null` |
| `created_at` | `timestamp` | | `now()` |

**Indexes:**
- `idx_file_chunks_org_id` on `org_id`
- `idx_file_chunks_file_id` on `file_id`
- `idx_file_chunks_file_chunk` UNIQUE on `(file_id, chunk_index)`
- `idx_file_chunks_fts` GIN on `text_search_vector`

---

## `usage_logs`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | `uuid` | PK, `defaultRandom()` | — |
| `org_id` | `uuid` | NOT NULL, FK → `organisations.id` | — |
| `api_key_id` | `uuid` | FK → `api_keys.id` | `null` |
| `endpoint` | `varchar(500)` | | `null` |
| `method` | `varchar(10)` | | `null` |
| `status_code` | `integer` | | `null` |
| `response_ms` | `integer` | | `null` |
| `bytes_in` | `bigint` | | `0` |
| `bytes_out` | `bigint` | | `0` |
| `created_at` | `timestamp` | | `now()` |

**Indexes:**
- `idx_usage_logs_org_id` on `org_id`
- `idx_usage_logs_created` on `created_at`

---

## `usage_daily`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | `uuid` | PK, `defaultRandom()` | — |
| `org_id` | `uuid` | NOT NULL, FK → `organisations.id` | — |
| `date` | `date` | NOT NULL | — |
| `total_requests` | `bigint` | | `0` |
| `total_bytes_in` | `bigint` | | `0` |
| `total_bytes_out` | `bigint` | | `0` |
| `storage_bytes` | `bigint` | | `0` |

**Indexes:**
- `idx_usage_daily_org_date` UNIQUE on `(org_id, date)`

---

## `webhooks`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | `uuid` | PK, `defaultRandom()` | — |
| `org_id` | `uuid` | NOT NULL, FK → `organisations.id` ON DELETE CASCADE | — |
| `url` | `text` | NOT NULL | — |
| `secret` | `text` | NOT NULL | — |
| `events` | `text[]` | NOT NULL | — |
| `enabled` | `boolean` | NOT NULL | `true` |
| `created_at` | `timestamp` | | `now()` |

**Indexes:**
- `idx_webhooks_org_id` on `org_id`

---

## `webhook_deliveries`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | `uuid` | PK, `defaultRandom()` | — |
| `webhook_id` | `uuid` | NOT NULL, FK → `webhooks.id` ON DELETE CASCADE | — |
| `event` | `varchar(100)` | NOT NULL | — |
| `payload` | `text` | NOT NULL | — |
| `status` | `varchar(50)` | NOT NULL | `'pending'` |
| `status_code` | `integer` | | `null` |
| `attempts` | `integer` | NOT NULL | `0` |
| `last_attempt_at` | `timestamp` | | `null` |
| `created_at` | `timestamp` | | `now()` |

**Indexes:**
- `idx_webhook_deliveries_webhook_id` on `webhook_id`
- `idx_webhook_deliveries_status` on `status`

---

## `collections`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | `uuid` | PK, `defaultRandom()` | — |
| `org_id` | `uuid` | NOT NULL, FK → `organisations.id` ON DELETE CASCADE | — |
| `created_by` | `uuid` | NOT NULL, FK → `users.id` | — |
| `name` | `varchar(255)` | NOT NULL | — |
| `description` | `text` | | `null` |
| `slug` | `varchar(100)` | NOT NULL | — |
| `created_at` | `timestamp` | | `now()` |
| `updated_at` | `timestamp` | | `now()` |

**Indexes:**
- `idx_collections_org_id` on `org_id`
- `idx_collections_org_slug` UNIQUE on `(org_id, slug)`

---

## `collection_files`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `collection_id` | `uuid` | NOT NULL, FK → `collections.id` ON DELETE CASCADE | — |
| `file_id` | `uuid` | NOT NULL, FK → `files.id` ON DELETE CASCADE | — |
| `added_by` | `uuid` | NOT NULL, FK → `users.id` | — |
| `added_at` | `timestamp` | | `now()` |

**Primary Key:** `(collection_id, file_id)` — composite

**Indexes:**
- `idx_collection_files_file_id` on `file_id`
- `idx_collection_files_collection_id` on `collection_id`

---

## `_migrations`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | `serial` | PK | — |
| `name` | `varchar(255)` | NOT NULL | — |
| `run_at` | `timestamp` | | `now()` |
