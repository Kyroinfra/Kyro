<script lang="ts">
  import { onMount } from "svelte";
  import Logo from "$lib/components/Logo.svelte";

  // The single canonical OpenAPI spec lives at packages/api/openapi.yaml
  // (main). This object is the docs-site projection of that file, authored
  // to match it field-for-field (order, tags, paths, scopes, examples).
  // When a route changes, update the yaml and this object in the same PR.
  const openapiSpec = {
    openapi: "3.0.3",
    info: {
      title: "Kyro API",
      version: "1.0.0",
      description:
        "Self-hosted RAG API. Upload documents, embed them locally, and ask questions grounded in your own files — no data leaves your server.",
    },
    servers: [
      { url: "http://localhost:3000/api/v1" },
      { url: "https://api.kyro.io/api/v1" },
    ],
    tags: [
      { name: "Auth", description: "Registration, login, session introspection and setup status." },
      { name: "Organisation", description: "Workspace profile and member management (owner/admin actions)." },
      { name: "API Keys", description: "Org-scoped API keys and their scopes." },
      { name: "Usage", description: "Aggregate and per-day request/byte metrics." },
      { name: "Webhooks", description: "HTTP webhook subscriptions for file pipeline events." },
      {
        name: "Files",
        description: "Upload, download, delete, text, reprocess and metadata.",
      },
      {
        name: "Collections",
        description: "Named groups of files queried as a unit.",
      },
      { name: "Search", description: "Hybrid (keyword + embedding) search with RRF scoring." },
      { name: "Ask", description: "RAG question answering with SSE streaming." },
      {
        name: "Health",
        description: "Backend readiness of the deployment.",
      },
    ],
    paths: {
      "/auth/register": {
        post: {
          summary: "Register an organisation and its first owner",
          tags: ["Auth"],
          // Open only to bootstrap the first org (or with ALLOW_SIGNUP=true).
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["orgName", "email", "password"],
                  properties: {
                    orgName: { type: "string", minLength: 1, maxLength: 255 },
                    email: { type: "string", format: "email" },
                    password: {
                      type: "string",
                      minLength: 8,
                      maxLength: 100,
                    },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Organisation and owner created; JWT issued." },
            "400": { description: "Invalid input or email already registered." },
            "403": { description: "Signup locked after the first organisation." },
          },
          "x-response-example": JSON.stringify({
            token: "eyJhbGciOi…",
            user: {
              id: "u_owner1",
              email: "owner@example.com",
              role: "owner",
              orgId: "o_kyro",
            },
          }),
        },
      },
      "/auth/login": {
        post: {
          summary: "Log in to an existing account",
          tags: ["Auth"],
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Session token issued." },
            "400": { description: "Invalid input." },
            "401": { description: "Unknown email or wrong password." },
          },
          "x-response-example": JSON.stringify({
            token: "eyJhbGciOi…",
            user: {
              id: "u_owner1",
              email: "test@example.com",
              role: "owner",
              orgId: "o_kyro",
            },
          }),
        },
      },
      "/auth/me": {
        get: {
          summary: "Current user",
          tags: ["Auth"],
          security: [{ bearerAuth: [] }],
          responses: {
            "200": { description: "The authenticated user." },
            "401": { description: "Missing or invalid token." },
            "404": { description: "User no longer exists." },
          },
          "x-response-example": JSON.stringify({
            id: "u_owner1",
            email: "test@example.com",
            role: "owner",
            orgId: "o_kyro",
          }),
        },
      },
      "/auth/setup-status": {
        get: {
          summary: "Whether the deployment has been bootstrapped",
          description:
            "Public probe for the onboarding flow. On a database outage it degrades to a 500 with configured: false instead of an error body.",
          tags: ["Auth"],
          security: [],
          parameters: [],
          responses: {
            "200": { description: "Setup state." },
            "500": { description: "Database outage, reported as unconfigured." },
          },
          "x-response-example": JSON.stringify({ configured: true }),
        },
      },
      "/org": {
        get: {
          summary: "Current organisation",
          tags: ["Organisation"],
          security: [{ bearerAuth: [] }],
          responses: {
            "200": { description: "The authenticated user's organisation." },
            "401": { description: "Missing or invalid token." },
            "404": { description: "Organisation not found." },
          },
          "x-response-example": JSON.stringify({
            id: "o_kyro",
            name: "Kyro",
            slug: "kyro",
            createdAt: "2026-01-10T09:00:00.000Z",
          }),
        },
      },
      "/org/members": {
        get: {
          summary: "List members",
          tags: ["Organisation"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "limit",
              in: "query",
              required: false,
              description: "Max results (default 50, max 100).",
              schema: { type: "integer", default: 50, maximum: 100 },
            },
            {
              name: "offset",
              in: "query",
              required: false,
              description: "Rows to skip (default 0).",
              schema: { type: "integer", default: 0 },
            },
          ],
          responses: {
            "200": { description: "Members of the org." },
            "401": { description: "Missing or invalid token." },
          },
          "x-response-example": JSON.stringify({
            data: [
              {
                id: "u_1",
                email: "owner@example.com",
                role: "owner",
                createdAt: "2026-01-10T09:00:00.000Z",
              },
              {
                id: "u_2",
                email: "member@example.com",
                role: "member",
                createdAt: "2026-01-12T10:20:00.000Z",
              },
            ],
            pagination: { total: 2, limit: 50, offset: 0, hasMore: false },
          }),
        },
        post: {
          summary: "Create a member",
          description: "Requires the owner role; members join by email + password.",
          tags: ["Organisation"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email" },
                    password: {
                      type: "string",
                      minLength: 8,
                      maxLength: 100,
                    },
                    role: {
                      type: "string",
                      enum: ["admin", "member"],
                      default: "member",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Member created." },
            "400": { description: "Invalid input or email already in use." },
            "401": { description: "Missing or invalid token." },
            "403": { description: "Only the owner may create members." },
          },
          "x-response-example": JSON.stringify({
            id: "u_3",
            email: "new@example.com",
            role: "member",
          }),
        },
      },
      "/org/members/{id}": {
        delete: {
          summary: "Remove a member",
          description:
            "Requires owner or admin. Owners cannot be removed (403); admins cannot remove other admins (403).",
          tags: ["Organisation"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Member user UUID.",
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "204": { description: "Member removed." },
            "401": { description: "Missing or invalid token." },
            "403": { description: "Owners are irremovable; admins cannot remove admins." },
            "404": { description: "Member not found." },
          },
        },
      },
      "/keys": {
        get: {
          summary: "List API keys",
          tags: ["API Keys"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "limit",
              in: "query",
              required: false,
              description: "Max results (default 50, max 100).",
              schema: { type: "integer", default: 50, maximum: 100 },
            },
            {
              name: "offset",
              in: "query",
              required: false,
              description: "Rows to skip (default 0).",
              schema: { type: "integer", default: 0 },
            },
          ],
          responses: {
            "200": { description: "The org's keys; the secret value is never returned here." },
            "401": { description: "Missing or invalid token." },
          },
          "x-response-example": JSON.stringify({
            data: [
              {
                id: "k_1",
                name: "docs-exporter",
                key_prefix: "kyro_live_abcd",
                scopes: ["read"],
                last_used_at: "2026-02-01T08:00:00.000Z",
                revoked_at: null,
                created_at: "2026-01-15T11:00:00.000Z",
              },
            ],
            pagination: { total: 1, limit: 50, offset: 0, hasMore: false },
          }),
        },
        post: {
          summary: "Create an API key",
          description:
            "Requires owner or admin. The plaintext key is returned exactly once, at creation; later responses only carry key_prefix. Revoke with DELETE /keys/{id} (soft).",
          tags: ["API Keys"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name"],
                  properties: {
                    name: { type: "string", minLength: 1, maxLength: 255 },
                    scopes: {
                      type: "array",
                      items: { type: "string", enum: ["read", "write"] },
                      default: ["read"],
                    },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Key created; key is the only copy of the secret." },
            "400": { description: "Invalid input." },
            "401": { description: "Missing or invalid token." },
            "403": { description: "Owner or admin only." },
          },
          "x-response-example": JSON.stringify({
            id: "k_2",
            name: "docs-exporter",
            key_prefix: "kyro_live_wxyz",
            scopes: ["read"],
            created_at: "2026-02-02T09:30:00.000Z",
            key: "kyro_live_wxyz…full…value…",
          }),
        },
      },
      "/keys/{id}": {
        delete: {
          summary: "Revoke an API key",
          description:
            "Requires owner or admin. Soft revoke: revoked_at is stamped and the row is kept for audit.",
          tags: ["API Keys"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "API key UUID.",
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "200": { description: "Key revoked." },
            "401": { description: "Missing or invalid token." },
            "403": { description: "Owner or admin only." },
            "404": { description: "Key unknown for the org or already revoked." },
          },
          "x-response-example": JSON.stringify({
            message: "API key revoked",
            id: "k_2",
          }),
        },
      },
      "/usage": {
        get: {
          summary: "Usage summary",
          description:
            "start_date/end_date span whole days inclusive (the end date counts that entire day); without them the window is all time.",
          tags: ["Usage"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "start_date",
              in: "query",
              required: false,
              description: "Window start (YYYY-MM-DD).",
              schema: { type: "string", format: "date" },
            },
            {
              name: "end_date",
              in: "query",
              required: false,
              description: "Window end (YYYY-MM-DD), inclusive whole day.",
              schema: { type: "string", format: "date" },
            },
          ],
          responses: {
            "200": { description: "Aggregated usage." },
            "401": { description: "Missing or invalid token." },
          },
          "x-response-example": JSON.stringify({
            total_requests: 1520,
            total_bytes_in: 209715200,
            total_bytes_out: 1048576000,
            total_storage: 52428800,
            active_api_keys: 3,
            storage_limit: 107374182400,
          }),
        },
      },
      "/usage/daily": {
        get: {
          summary: "Daily usage series, newest first",
          description: "Defaults to the trailing 30 days when dates are omitted.",
          tags: ["Usage"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "start_date",
              in: "query",
              required: false,
              description: "Series start (YYYY-MM-DD).",
              schema: { type: "string", format: "date" },
            },
            {
              name: "end_date",
              in: "query",
              required: false,
              description: "Series end (YYYY-MM-DD), inclusive whole day.",
              schema: { type: "string", format: "date" },
            },
          ],
          responses: {
            "200": { description: "One row per day with activity." },
            "401": { description: "Missing or invalid token." },
          },
          "x-response-example": JSON.stringify([
            {
              date: "2026-02-02",
              requests: "42",
              bytes_in: 5242880,
              bytes_out: 26214400,
            },
            {
              date: "2026-02-01",
              requests: "120",
              bytes_in: 15728640,
              bytes_out: 78643200,
            },
          ]),
        },
      },
      "/webhooks": {
        get: {
          summary: "List webhooks, newest first",
          tags: ["Webhooks"],
          security: [{ bearerAuth: [] }],
          parameters: [],
          responses: {
            "200": { description: "The org's webhooks (no secrets)." },
            "401": { description: "Missing or invalid token." },
          },
          "x-response-example": JSON.stringify([
            {
              id: "wh_1",
              url: "https://ops.example.com/hooks/kyro",
              events: ["file.ready", "file.failed"],
              enabled: true,
              createdAt: "2026-01-20T08:00:00.000Z",
            },
          ]),
        },
        post: {
          summary: "Create a webhook",
          description:
            "Requires owner or admin. The signing secret is returned only on creation.",
          tags: ["Webhooks"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["url", "events"],
                  properties: {
                    url: { type: "string", format: "uri" },
                    events: {
                      type: "array",
                      minItems: 1,
                      items: {
                        type: "string",
                        enum: ["file.ready", "file.failed"],
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Webhook created with its signing secret." },
            "400": { description: "Invalid input." },
            "401": { description: "Missing or invalid token." },
            "403": { description: "Owner or admin only." },
          },
          "x-response-example": JSON.stringify({
            id: "wh_2",
            url: "https://ops.example.com/hooks/kyro",
            events: ["file.ready"],
            enabled: true,
            createdAt: "2026-02-02T09:40:00.000Z",
            secret: "9f2c…64hex…",
          }),
        },
      },
      "/webhooks/{id}": {
        patch: {
          summary: "Update a webhook",
          description: "Requires owner or admin; all fields optional.",
          tags: ["Webhooks"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Webhook UUID.",
              schema: { type: "string", format: "uuid" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  minProperties: 1,
                  properties: {
                    url: { type: "string", format: "uri" },
                    events: {
                      type: "array",
                      minItems: 1,
                      items: {
                        type: "string",
                        enum: ["file.ready", "file.failed"],
                      },
                    },
                    enabled: { type: "boolean", default: true },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Updated webhook." },
            "400": { description: "Invalid input." },
            "401": { description: "Missing or invalid token." },
            "403": { description: "Owner or admin only." },
            "404": { description: "Webhook not found in the org." },
          },
          "x-response-example": JSON.stringify({
            id: "wh_2",
            url: "https://ops.example.com/hooks/kyro",
            events: ["file.ready"],
            enabled: false,
          }),
        },
        delete: {
          summary: "Delete a webhook",
          description: "Requires owner or admin; hard delete.",
          tags: ["Webhooks"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Webhook UUID.",
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "204": { description: "Webhook deleted." },
            "401": { description: "Missing or invalid token." },
            "403": { description: "Owner or admin only." },
            "404": { description: "Webhook not found in the org." },
          },
        },
      },
      "/webhooks/{id}/deliveries": {
        get: {
          summary: "Delivery history for a webhook (latest 50)",
          tags: ["Webhooks"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Webhook UUID.",
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "200": { description: "Recent delivery attempts, newest first." },
            "401": { description: "Missing or invalid token." },
            "404": { description: "Webhook not found in the org." },
          },
          "x-response-example": JSON.stringify([
            {
              id: "whd_1",
              event: "file.ready",
              status: "delivered",
              statusCode: 200,
              attempts: 1,
              lastAttemptAt: "2026-02-02T09:41:00.000Z",
              createdAt: "2026-02-02T09:40:59.000Z",
            },
          ]),
        },
      },
      "/webhooks/events": {
        get: {
          summary: "Subscribable events",
          tags: ["Webhooks"],
          security: [{ bearerAuth: [] }],
          parameters: [],
          responses: {
            "200": { description: "Event names with human descriptions." },
            "401": { description: "Missing or invalid token." },
          },
          "x-response-example": JSON.stringify({
            events: ["file.ready", "file.failed"],
            descriptions: {
              "file.ready":
                "A file is queryable — its chunks are persisted and searchable.",
              "file.failed":
                "A file will never become queryable in this pass. Re-run via POST /files/:id/reprocess",
            },
          }),
        },
      },
      "/files": {
        get: {
          summary: "List files",
          tags: ["Files"],
          security: [{ apiKey: [] }, { bearerAuth: [] }],
          "x-scope": "read",
          parameters: [
            {
              name: "limit",
              in: "query",
              required: false,
              description: "Max results (default 100, max 100).",
              schema: { type: "integer", default: 100, maximum: 100 },
            },
            {
              name: "cursor",
              in: "query",
              required: false,
              description:
                "Opaque cursor from pagination.nextCursor of the previous page (base64url of {\"createdAt\",\"id\"}).",
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description:
                "Paginated file list, newest first. Failed rows additionally carry error.",
            },
            "400": { description: "Malformed or expired cursor." },
            "401": { description: "Missing or invalid credentials." },
          },
          "x-response-example": JSON.stringify({
            data: [
              {
                id: "f_1",
                name: "contract.pdf",
                mimeType: "application/pdf",
                sizeBytes: 204800,
                createdAt: "2026-02-01T12:00:00.000Z",
                status: "ready",
              },
              {
                id: "f_2",
                name: "broken.pdf",
                mimeType: "application/pdf",
                sizeBytes: 4096,
                createdAt: "2026-01-31T12:00:00.000Z",
                status: "failed",
                error: "PDF parse error",
              },
            ],
            pagination: { limit: 100, hasMore: false, nextCursor: null },
          }),
        },
        post: {
          summary: "Upload file",
          description:
            "Extractable types (PDF, DOC/DOCX, TXT) start the pipeline immediately: pending → processing → ready (or failed). CSV and JSON are stored without extraction (status \"skipped\"); any other type is rejected with 415. The deployment-wide storage cap answers 507.",
          tags: ["Files"],
          security: [{ apiKey: [] }, { bearerAuth: [] }],
          "x-scope": "write",
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["file"],
                  properties: {
                    file: {
                      type: "string",
                      format: "binary",
                      description:
                        "PDF, DOCX, DOC and TXT are extracted; CSV and JSON are stored as \"skipped\"; other types are rejected with 415.",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description:
                "File stored; the pipeline is queued for extractable types.",
            },
            "400": { description: "No file field in the multipart body." },
            "401": { description: "Missing or invalid credentials." },
            "403": { description: "Not write-scoped (`Required scope: write`)." },
            "413": { description: "File exceeds the 100 MB limit." },
            "415": { description: "Unsupported file type." },
            "507": { description: "Deployment storage limit reached." },
          },
          "x-response-example": JSON.stringify({
            id: "f_1",
            name: "contract.pdf",
            mimeType: "application/pdf",
            sizeBytes: 204800,
            createdAt: "2026-02-01T12:00:00.000Z",
            status: "pending",
          }),
        },
      },
      "/files/{id}": {
        get: {
          summary: "Download file",
          description: "Streams the original bytes as an attachment.",
          tags: ["Files"],
          security: [{ apiKey: [] }, { bearerAuth: [] }],
          "x-scope": "read",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "File UUID.",
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "200": { description: "Binary file stream (attachment)." },
            "401": { description: "Missing or invalid credentials." },
            "404": { description: "Unknown file, or the bytes are missing on disk." },
          },
          "x-response-example": "Binary file stream (attachment).",
        },
        delete: {
          summary: "Delete file",
          description:
            "Hard delete — removes the record, the on-disk bytes and cascading rows (chunks, metadata, collection membership).",
          tags: ["Files"],
          security: [{ apiKey: [] }, { bearerAuth: [] }],
          "x-scope": "write",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "File UUID.",
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "200": { description: "Deleted." },
            "401": { description: "Missing or invalid credentials." },
            "403": { description: "Not write-scoped." },
            "404": { description: "File not found." },
          },
          "x-response-example": JSON.stringify({
            message: "File deleted",
            id: "f_1",
          }),
        },
      },
      "/files/{id}/text": {
        get: {
          summary: "Extracted text for a file",
          tags: ["Files"],
          security: [{ apiKey: [] }, { bearerAuth: [] }],
          "x-scope": "read",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "File UUID.",
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "200": { description: "Extraction state and (where present) the text." },
            "401": { description: "Missing or invalid credentials." },
            "404": { description: "File not found." },
          },
          "x-response-example": JSON.stringify({
            fileId: "f_1",
            status: "ready",
            extractedText: "The payment terms are payable within 30 days…",
          }),
        },
      },
      "/files/{id}/reprocess": {
        post: {
          summary: "Re-run the pipeline for a file",
          description:
            "Resets the file to pending and re-runs extract → embed in one flow. 400 (with supportedTypes) for types with nothing to reprocess; 409 while a pipeline run is already in progress.",
          tags: ["Files"],
          security: [{ apiKey: [] }, { bearerAuth: [] }],
          "x-scope": "write",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "File UUID.",
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "202": { description: "Reprocess started." },
            "400": { description: "Type with nothing to reprocess; supportedTypes lists accepted MIMEs." },
            "401": { description: "Missing or invalid credentials." },
            "403": { description: "Not write-scoped." },
            "404": { description: "File not found." },
            "409": { description: "Pipeline already in progress; body carries the current status." },
          },
          "x-response-example": JSON.stringify({
            fileId: "f_1",
            status: "pending",
            message: "Reprocessing started",
          }),
        },
      },
      "/files/{id}/metadata": {
        get: {
          summary: "File metadata",
          description: "Always a flat object (the column is jsonb, non-null).",
          tags: ["Files"],
          security: [{ apiKey: [] }, { bearerAuth: [] }],
          "x-scope": "read",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "File UUID.",
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "200": { description: "Flat metadata map." },
            "401": { description: "Missing or invalid credentials." },
            "404": { description: "File not found." },
          },
          "x-response-example": JSON.stringify({
            document_type: "contract",
            effective_date: "2026-01-01",
          }),
        },
        put: {
          summary: "Upsert file metadata",
          description:
            "Non-destructive merge — keys not in the body keep their values, body keys win. Values must be strings. An empty body answers {}. Remove a key with DELETE /files/{id}/metadata/{key}.",
          tags: ["Files"],
          security: [{ apiKey: [] }, { bearerAuth: [] }],
          "x-scope": "write",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "File UUID.",
              schema: { type: "string", format: "uuid" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  additionalProperties: { type: "string" },
                },
              },
            },
          },
          responses: {
            "200": { description: "The upserted keys (the body, as stored)." },
            "400": { description: "Body is not a flat object of string values." },
            "401": { description: "Missing or invalid credentials." },
            "403": { description: "Not write-scoped." },
            "404": { description: "File not found." },
          },
          "x-response-example": JSON.stringify({
            document_type: "contract",
          }),
        },
      },
      "/files/{id}/metadata/{key}": {
        delete: {
          summary: "Delete one metadata key",
          description: "A missing key is a no-op; only an unknown file is an error.",
          tags: ["Files"],
          security: [{ apiKey: [] }, { bearerAuth: [] }],
          "x-scope": "write",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "File UUID.",
              schema: { type: "string", format: "uuid" },
            },
            {
              name: "key",
              in: "path",
              required: true,
              description: "Metadata key.",
              schema: { type: "string" },
            },
          ],
          responses: {
            "204": { description: "Key removed (or was already absent)." },
            "401": { description: "Missing or invalid credentials." },
            "403": { description: "Not write-scoped." },
            "404": { description: "File not found." },
          },
        },
      },
      "/collections": {
        get: {
          summary: "List collections, newest first",
          tags: ["Collections"],
          security: [{ apiKey: [] }, { bearerAuth: [] }],
          "x-scope": "read",
          parameters: [],
          responses: {
            "200": { description: "Collections with file-count roll-ups." },
            "401": { description: "Missing or invalid credentials." },
          },
          "x-response-example": JSON.stringify([
            {
              id: "c_1",
              name: "Mergers",
              description: "Deal documents",
              createdAt: "2026-01-25T10:00:00.000Z",
              updatedAt: "2026-02-01T10:00:00.000Z",
              fileCount: 3,
              embeddedCount: 2,
              pendingCount: 1,
              failedCount: 0,
            },
          ]),
        },
        post: {
          summary: "Create a collection",
          tags: ["Collections"],
          security: [{ apiKey: [] }, { bearerAuth: [] }],
          "x-scope": "write",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name"],
                  properties: {
                    name: { type: "string", minLength: 1, maxLength: 255 },
                    description: { type: "string", maxLength: 2000 },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Collection created." },
            "400": { description: "Invalid input." },
            "401": { description: "Missing or invalid credentials." },
          },
          "x-response-example": JSON.stringify({
            id: "c_1",
            name: "Mergers",
            description: "Deal documents",
            createdAt: "2026-01-25T10:00:00.000Z",
          }),
        },
      },
      "/collections/{id}": {
        get: {
          summary: "Collection detail",
          description: "Adds skippedCount and queryReady to the count roll-up.",
          tags: ["Collections"],
          security: [{ apiKey: [] }, { bearerAuth: [] }],
          "x-scope": "read",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Collection UUID.",
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "200": { description: "The collection." },
            "401": { description: "Missing or invalid credentials." },
            "404": { description: "Collection not found." },
          },
          "x-response-example": JSON.stringify({
            id: "c_1",
            name: "Mergers",
            description: "Deal documents",
            createdAt: "2026-01-25T10:00:00.000Z",
            updatedAt: "2026-02-01T10:00:00.000Z",
            fileCount: 3,
            embeddedCount: 2,
            pendingCount: 1,
            failedCount: 0,
            skippedCount: 0,
            queryReady: false,
          }),
        },
        patch: {
          summary: "Update a collection",
          description:
            "Partial update. Renaming to the current name is a plain no-op (no slug state exists), so no conflict status exists.",
          tags: ["Collections"],
          security: [{ apiKey: [] }, { bearerAuth: [] }],
          "x-scope": "write",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Collection UUID.",
              schema: { type: "string", format: "uuid" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  minProperties: 1,
                  properties: {
                    name: { type: "string", minLength: 1, maxLength: 255 },
                    description: { type: "string", maxLength: 2000 },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Updated collection." },
            "400": { description: "Invalid input." },
            "401": { description: "Missing or invalid credentials." },
            "404": { description: "Collection not found." },
          },
          "x-response-example": JSON.stringify({
            id: "c_1",
            name: "Mergers 2026",
            description: "Deal documents",
            updatedAt: "2026-02-02T11:00:00.000Z",
          }),
        },
        delete: {
          summary: "Delete a collection",
          description: "Membership rows detach; the files themselves are kept.",
          tags: ["Collections"],
          security: [{ apiKey: [] }, { bearerAuth: [] }],
          "x-scope": "write",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Collection UUID.",
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "204": { description: "Collection deleted." },
            "401": { description: "Missing or invalid credentials." },
            "404": { description: "Collection not found." },
          },
        },
      },
      "/collections/{id}/files": {
        get: {
          summary: "List a collection's files",
          tags: ["Collections"],
          security: [{ apiKey: [] }, { bearerAuth: [] }],
          "x-scope": "read",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Collection UUID.",
              schema: { type: "string", format: "uuid" },
            },
            {
              name: "limit",
              in: "query",
              required: false,
              description: "Max results (default 100, max 100).",
              schema: { type: "integer", default: 100, maximum: 100 },
            },
            {
              name: "offset",
              in: "query",
              required: false,
              description: "Rows to skip (default 0).",
              schema: { type: "integer", default: 0 },
            },
          ],
          responses: {
            "200": { description: "Files in the collection, newest added first." },
            "401": { description: "Missing or invalid credentials." },
            "404": { description: "Collection not found." },
          },
          "x-response-example": JSON.stringify({
            data: [
              {
                id: "f_1",
                name: "contract.pdf",
                mimeType: "application/pdf",
                sizeBytes: 204800,
                status: "ready",
                createdAt: "2026-02-01T12:00:00.000Z",
                addedAt: "2026-02-01T12:05:00.000Z",
              },
            ],
            pagination: { total: 1, limit: 100, offset: 0, hasMore: false },
          }),
        },
        post: {
          summary: "Add files to a collection",
          description: "Adds an org-owned set of files; duplicates are ignored.",
          tags: ["Collections"],
          security: [{ apiKey: [] }, { bearerAuth: [] }],
          "x-scope": "write",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Collection UUID.",
              schema: { type: "string", format: "uuid" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["fileIds"],
                  properties: {
                    fileIds: {
                      type: "array",
                      minItems: 1,
                      maxItems: 100,
                      items: { type: "string", format: "uuid" },
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Files added." },
            "400": {
              description:
                "Invalid input, or some file IDs are unknown/not org-owned (then invalidFileIds lists them).",
            },
            "401": { description: "Missing or invalid credentials." },
            "404": { description: "Collection not found." },
          },
          "x-response-example": JSON.stringify({
            added: 3,
            collectionId: "c_1",
          }),
        },
      },
      "/collections/{id}/files/{fileId}": {
        delete: {
          summary: "Remove a file from a collection",
          tags: ["Collections"],
          security: [{ apiKey: [] }, { bearerAuth: [] }],
          "x-scope": "write",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Collection UUID.",
              schema: { type: "string", format: "uuid" },
            },
            {
              name: "fileId",
              in: "path",
              required: true,
              description: "File UUID.",
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "204": { description: "File removed from the collection." },
            "401": { description: "Missing or invalid credentials." },
            "404": { description: "Collection unknown, or the file is not a member." },
          },
        },
      },
      "/search": {
        get: {
          summary: "Hybrid search across embedded chunks",
          description:
            "Combines keyword and embedding retrieval, ranked by Reciprocal Rank Fusion (rrfScore, higher = better). Scope with exactly one of collection_id or file_ids — both, or neither with a filter, is 400; unknown scopes 404; empty scopes 422. filters carries metadata filters as a URL-encoded JSON object whose values are strings or arrays of strings.",
          tags: ["Search"],
          security: [{ apiKey: [] }, { bearerAuth: [] }],
          "x-scope": "read",
          parameters: [
            {
              name: "q",
              in: "query",
              required: true,
              description: "The query text.",
              schema: { type: "string", minLength: 1 },
            },
            {
              name: "limit",
              in: "query",
              required: false,
              description: "Max results (default 10, max 50).",
              schema: { type: "integer", default: 10, maximum: 50 },
            },
            {
              name: "collection_id",
              in: "query",
              required: false,
              description: "Restrict to one collection's embedded files (mutually exclusive with file_ids).",
              schema: { type: "string", format: "uuid" },
            },
            {
              name: "file_ids",
              in: "query",
              required: false,
              description: "Comma-separated org file UUIDs to scope to (mutually exclusive with collection_id).",
              schema: { type: "string" },
            },
            {
              name: "filters",
              in: "query",
              required: false,
              description: "URL-encoded JSON object of metadata filters (string or string[] values).",
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": { description: "Ranked chunks for the query." },
            "400": { description: "Missing q, both scopes given, or malformed filters." },
            "401": { description: "Missing or invalid credentials." },
            "404": { description: "Unknown collection or no owned files among file_ids." },
            "422": { description: "Empty collection, no filter match, or empty intersection." },
          },
          "x-response-example": JSON.stringify({
            data: [
              {
                fileId: "f_1",
                fileName: "contract.pdf",
                chunkIndex: 3,
                content: "The payment terms are payable within 30 days…",
                rrfScore: 0.032,
              },
            ],
            query: "payment terms",
            limit: 10,
          }),
        },
      },
      "/ask": {
        post: {
          summary: "Answer a question from retrieved context",
          description:
            "Retrieves top-k chunks (same hybrid ranking as /search), builds a document-grounded prompt with citations, then either answers over Server-Sent Events (stream defaults to true — sources → chunk* → done, all named only by type on data: frames; an in-band error event keeps 200 semantics) or returns one JSON object {answer, sources} with stream: false. Scope with collectionId or fileIds (mutually exclusive), history replays prior turns, model overrides the chat model. Requires OLLAMA_URL configured, otherwise 400.",
          tags: ["Ask"],
          security: [{ apiKey: [] }, { bearerAuth: [] }],
          "x-scope": "read",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["question"],
                  properties: {
                    question: { type: "string", minLength: 1, maxLength: 2000 },
                    fileIds: {
                      type: "array",
                      maxItems: 20,
                      items: { type: "string", format: "uuid" },
                      description: "Scope to specific files (mutually exclusive with collectionId).",
                    },
                    collectionId: {
                      type: "string",
                      format: "uuid",
                      description: "Scope to one collection (mutually exclusive with fileIds).",
                    },
                    filters: {
                      type: "object",
                      additionalProperties: {
                        type: "string",
                      },
                      description:
                        "Metadata filters, same shape as the /search query parameter (string or string[] values).",
                    },
                    topK: {
                      type: "integer",
                      minimum: 1,
                      maximum: 20,
                      default: 8,
                    },
                    model: {
                      type: "string",
                      description: "Chat model override; defaults to the deployment's configured model.",
                    },
                    stream: { type: "boolean", default: true },
                    history: {
                      type: "array",
                      maxItems: 10,
                      items: {
                        type: "object",
                        required: ["role", "content"],
                        properties: {
                          role: { type: "string", enum: ["user", "assistant"] },
                          content: { type: "string", minLength: 1, maxLength: 2000 },
                        },
                      },
                      description: "Prior user/assistant turns for multi-turn conversations.",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description:
                "Answer as an SSE stream when the body requested streaming, or one JSON object otherwise.",
            },
            "400": {
              description:
                "Invalid input, or the endpoint is disabled (OLLAMA_URL unset).",
            },
            "401": { description: "Missing or invalid credentials." },
            "404": { description: "Unknown collection or no owned files among file_ids." },
            "422": { description: "Empty collection, no filter match, or empty intersection." },
          },
          "x-response-example": `// SSE stream:\ndata: {"type":"sources","sources":[{"fileId":"f_1","fileName":"contract.pdf","chunkIndex":3,"content":"The payment terms…","rrfScore":0.032}]}\ndata: {"type":"chunk","text":"According to [1], the payment terms…"}\ndata: {"type":"done"}\n\n// stream: false → application/json:\n{"answer":"According to [1], payment is due in 30 days.","sources":[{"fileId":"f_1","fileName":"contract.pdf","chunkIndex":3,"content":"The payment terms…","rrfScore":0.032}]}`,
        },
      },
      "/health": {
        get: {
          summary: "Backend health",
          description:
            "Sits at the origin root (not under /api/v1). Reports database reachability only; degraded answers 503.",
          tags: ["Health"],
          security: [],
          parameters: [],
          responses: {
            "200": { description: "Healthy." },
            "503": { description: "Degraded (database unreachable)." },
          },
          "x-response-example": JSON.stringify({
            status: "ok",
            uptime: 86400,
            timestamp: "2026-02-02T12:00:00.000Z",
            database: "connected",
          }),
        },
      },
    },
  };

  interface SchemaProperty {
    type?: string;
    format?: string;
    description?: string;
    enum?: string[];
    minLength?: number;
    maxLength?: number;
    nullable?: boolean;
    items?: SchemaProperty;
    default?: unknown;
  }

  interface Schema {
    type?: string;
    required?: string[];
    properties?: Record<string, SchemaProperty>;
  }

  interface Parameter {
    name: string;
    in: string;
    required?: boolean;
    description?: string;
    schema?: SchemaProperty;
  }

  interface RequestBody {
    required?: boolean;
    content?: Record<string, { schema?: Schema }>;
  }

  interface ResponseEntry {
    description?: string;
  }

  interface Operation {
    summary?: string;
    description?: string;
    tags?: string[];
    security?: Array<Record<string, string[]>>;
    parameters?: Parameter[];
    requestBody?: RequestBody;
    responses?: Record<string, ResponseEntry>;
    "x-scope"?: string | null;
    "x-body-description"?: string | null;
    "x-response-example"?: string;
  }

  interface Endpoint {
    method: string;
    path: string;
    op: Operation;
    id: string;
  }

  const TAG_ORDER = [
    "Auth",
    "Organisation",
    "API Keys",
    "Usage",
    "Webhooks",
    "Files",
    "Collections",
    "Search",
    "Ask",
    "Health",
  ];

  const TAG_IDS: Record<string, string> = {
    Auth: "auth",
    Organisation: "organisation",
    "API Keys": "api-keys",
    Usage: "usage",
    Webhooks: "webhooks",
    Files: "files",
    Collections: "collections",
    Search: "search",
    Ask: "ask",
    Health: "health",
  };

  const endpointsByTag: Record<string, Endpoint[]> = {};

  for (const [path, pathItem] of Object.entries(
    (openapiSpec as any).paths || {},
  )) {
    for (const [method, operation] of Object.entries(
      pathItem as Record<string, unknown>,
    )) {
      if (["parameters", "summary", "description"].includes(method)) continue;
      const op = operation as Operation;
      const tag = op.tags?.[0] || "Other";
      const tagId = TAG_IDS[tag] || tag.toLowerCase();
      if (!endpointsByTag[tagId]) endpointsByTag[tagId] = [];
      const id = `${tagId}-${method}-${path.replace(/\//g, "-").replace(/[{}]/g, "")}`;
      endpointsByTag[tagId].push({
        method: method.toUpperCase(),
        path,
        op,
        id,
      });
    }
  }

  const allTags = TAG_ORDER.map((t) => ({
    label: t,
    id: TAG_IDS[t] || t.toLowerCase(),
    endpoints: endpointsByTag[TAG_IDS[t] || t.toLowerCase()] || [],
  })).filter((t) => t.endpoints.length > 0);

  const staticSections = [
    { id: "overview", label: "Overview" },
    { id: "access-methods", label: "How to use Kyro" }, // NEW
    { id: "dashboard", label: "Dashboard" }, // NEW
    { id: "sdk", label: "TypeScript SDK" }, // NEW
    { id: "sdk-files", label: "↳ Files" }, // NEW
    { id: "sdk-collections", label: "↳ Collections" }, // NEW
    { id: "sdk-ask", label: "↳ Ask & Search" }, // NEW
    { id: "sdk-errors", label: "↳ Error Handling" }, // NEW
    { id: "self-hosting", label: "Self-hosting" },
    { id: "auth", label: "Authentication" },
    { id: "rag-pipeline", label: "RAG Pipeline" },
    { id: "rag-ask", label: "↳ /ask" },
    { id: "rag-search", label: "↳ /search" },
    { id: "metadata-filters", label: "Metadata Filters" },
    { id: "rate-limiting", label: "Rate Limiting" },
    { id: "errors", label: "Error Codes" },
    { id: "http-reference", label: "HTTP Reference" },
  ];

  function getAuthType(op: Operation): "bearer" | "apiKey" | "none" {
    if (!op.security || op.security.length === 0) return "none";
    if (op.security.some((s) => "bearerAuth" in s)) return "bearer";
    if (op.security.some((s) => "apiKey" in s)) return "apiKey";
    return "none";
  }

  function getScopeRequired(op: Operation): string | null {
    return op["x-scope"] || null;
  }

  interface ParsedSchema {
    fields: Array<{
      name: string;
      type: string;
      required: boolean;
      description: string;
      enum?: string[];
      default?: unknown;
    }>;
    isFormData: boolean;
    contentType: string;
  }

  function parseRequestBody(op: Operation): ParsedSchema | null {
    if (!op.requestBody?.content) return null;
    const content = op.requestBody.content;

    if (content["multipart/form-data"]) {
      const schema = content["multipart/form-data"].schema;
      const required = schema?.required || [];
      const fields = Object.entries(schema?.properties || {}).map(
        ([name, prop]) => ({
          name,
          type:
            (prop as SchemaProperty).format === "binary"
              ? "File (binary)"
              : (prop as SchemaProperty).type || "string",
          required: required.includes(name),
          description: (prop as SchemaProperty).description || "",
          enum: (prop as SchemaProperty).enum,
          default: (prop as SchemaProperty).default,
        }),
      );
      return {
        fields,
        isFormData: true,
        contentType: "multipart/form-data",
      };
    }

    if (content["application/json"]) {
      const schema = content["application/json"].schema;
      const required = schema?.required || [];
      const fields = Object.entries(schema?.properties || {}).map(
        ([name, prop]) => ({
          name,
          type: formatType(prop as SchemaProperty),
          required: required.includes(name),
          description: (prop as SchemaProperty).description || "",
          enum: (prop as SchemaProperty).enum,
          default: (prop as SchemaProperty).default,
        }),
      );
      return {
        fields,
        isFormData: false,
        contentType: "application/json",
      };
    }

    return null;
  }

  function formatType(prop: SchemaProperty): string {
    if (prop.type === "array" && prop.items)
      return `${formatType(prop.items)}[]`;
    if (prop.format) return `${prop.type} (${prop.format})`;
    return prop.type || "any";
  }

  function generateCurl(ep: Endpoint): string {
    const authType = getAuthType(ep.op);
    const body = parseRequestBody(ep.op);
    const baseUrl = "http://localhost:3000/api/v1";

    const lines: string[] = [`curl -X ${ep.method} \\`];
    lines.push(`  "${baseUrl}${ep.path}" \\`);

    if (authType === "bearer") {
      lines.push(`  -H "Authorization: Bearer $JWT_TOKEN" \\`);
    } else if (authType === "apiKey") {
      lines.push(`  -H "X-Api-Key: $API_KEY" \\`);
    }

    if (body?.isFormData) {
      lines.push(`  -F "file=@./your-file.pdf"`);
    } else if (body) {
      lines.push(`  -H "Content-Type: application/json" \\`);
      const bodyObj: Record<string, unknown> = {};
      for (const f of body.fields) {
        if (f.required)
          bodyObj[f.name] =
            f.default ??
            (f.type.includes("string")
              ? `"${f.name}_value"`
              : f.type.includes("array")
                ? []
                : "value");
      }
      lines.push(
        `  -d '${JSON.stringify(bodyObj, null, 2).replace(/\n/g, "\n  ")}'`,
      );
    }

    const last = lines[lines.length - 1];
    if (last.endsWith(" \\")) lines[lines.length - 1] = last.slice(0, -2);
    return lines.join("\n");
  }

  function generateFetch(ep: Endpoint): string {
    const authType = getAuthType(ep.op);
    const body = parseRequestBody(ep.op);
    const baseUrl = "http://localhost:3000/api/v1";

    const headers: Record<string, string> = {};
    if (authType === "bearer") headers["Authorization"] = "Bearer JWT_TOKEN";
    else if (authType === "apiKey") headers["X-Api-Key"] = "API_KEY";
    if (body && !body.isFormData) headers["Content-Type"] = "application/json";

    const headersStr = JSON.stringify(headers, null, 2)
      .replace(/"([^"]+)":/g, "$1:")
      .replace(/"/g, "'");

    let bodyStr = "";
    if (body?.isFormData) {
      bodyStr = `\n  const form = new FormData();\n  form.append('file', file);\n`;
    } else if (body) {
      const bodyObj: Record<string, unknown> = {};
      for (const f of body.fields) {
        bodyObj[f.name] =
          f.default ??
          (f.type.includes("string")
            ? `${f.name}_value`
            : f.type.includes("array")
              ? []
              : "value");
      }
      bodyStr = `\n  const payload = ${JSON.stringify(bodyObj, null, 2).replace(/\n/g, "\n  ")};\n`;
    }

    const fetchBody = body
      ? body.isFormData
        ? ",\n  body: form"
        : ",\n  body: JSON.stringify(payload)"
      : "";

    return `const response = await fetch('${baseUrl}${ep.path}', {
  method: '${ep.method}',
  headers: ${headersStr}${fetchBody}
});${bodyStr ? `\n${bodyStr.trimEnd()}` : ""}

const data = await response.json();`;
  }

  function formatResponseExample(raw: string | undefined): string {
    if (!raw) return "";
    if (
      raw.startsWith("Binary") ||
      raw.includes("No Content") ||
      raw.startsWith("//")
    )
      return raw;
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  }

  function getStatusBadgeClass(code: string): string {
    const n = parseInt(code);
    if (n >= 200 && n < 300) return "status-2xx";
    if (n >= 400 && n < 500) return "status-4xx";
    if (n >= 500) return "status-5xx";
    return "";
  }

  function getStatusLabel(code: string, desc: string | undefined): string {
    return desc || code;
  }

  let copiedId = $state<string | null>(null);

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    copiedId = id;
    setTimeout(() => (copiedId = null), 2000);
  }

  let activeTab = $state<Record<string, "curl" | "fetch">>({});

  function getTab(id: string): "curl" | "fetch" {
    return activeTab[id] ?? "curl";
  }

  function setTab(id: string, tab: "curl" | "fetch") {
    activeTab = { ...activeTab, [id]: tab };
  }

  let sidebarOpen = $state(false);
  let activeSection = $state("overview");

  onMount(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            activeSection = entry.target.id;
            const link = document.querySelector(
              `.sidebar a[href="#${entry.target.id}"]`,
            );
            link?.scrollIntoView({
              block: "nearest",
              behavior: "smooth",
            });
            break;
          }
        }
      },
      { rootMargin: "-80px 0px -55% 0px", threshold: 0 },
    );
    document
      .querySelectorAll(".doc-section, .endpoint-section")
      .forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  });

  const errorCodes = [
    {
      code: "400",
      label: "Bad Request",
      desc: "Invalid input or missing required fields",
    },
    {
      code: "401",
      label: "Unauthorized",
      desc: "Missing or invalid API key",
    },
    {
      code: "403",
      label: "Forbidden",
      desc: "Insufficient scope or storage quota exceeded",
    },
    { code: "404", label: "Not Found", desc: "Resource does not exist" },
    { code: "409", label: "Conflict", desc: "Operation already in progress" },
    {
      code: "413",
      label: "Payload Too Large",
      desc: "File exceeds the 100 MB size limit",
    },
    {
      code: "422",
      label: "Unprocessable",
      desc: "Empty scope — the collection has no embedded files, no files match the metadata filters, or the intersection of all constraints is empty",
    },
    {
      code: "429",
      label: "Too Many Requests",
      desc: "Rate limit exceeded — the body carries retryAfter (seconds)",
    },
    {
      code: "500",
      label: "Internal Server Error",
      desc: "Unexpected server-side error",
    },
    {
      code: "507",
      label: "Insufficient Storage",
      desc: "Deployment storage limit reached",
    },
  ];
</script>

<svelte:head>
  <title>API Reference — Kyro</title>
</svelte:head>

<div class="page">
  <!-- ── Top bar ── -->
  <header class="topbar">
    <div class="topbar-left">
      <button
        class="hamburger"
        onclick={() => (sidebarOpen = !sidebarOpen)}
        aria-label="Open menu"
        aria-expanded={sidebarOpen}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      <a href="/" class="logo">
        <Logo size={20} />
        <span>kyro</span>
      </a>
      <span class="topbar-divider">/</span>
      <span class="topbar-label">API Reference</span>
    </div>
    <nav class="topbar-nav">
      <a
        href="https://github.com/Kyroinfra/Kyro"
        target="_blank"
        rel="noopener noreferrer"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"
          />
        </svg>
        github
      </a>
    </nav>
  </header>

  <div class="layout">
    <!-- ── Overlay ── -->
    {#if sidebarOpen}
      <div
        class="overlay"
        onclick={() => (sidebarOpen = false)}
        role="presentation"
      ></div>
    {/if}

    <!-- ── Sidebar ── -->
    <aside class="sidebar" class:open={sidebarOpen}>
      <div class="sidebar-inner">
        <div class="sidebar-close-row">
          <span class="sidebar-heading">docs</span>
          <button class="sidebar-close" onclick={() => (sidebarOpen = false)}
            >✕</button
          >
        </div>

        <div class="sidebar-group">
          <span class="sidebar-group-label">General</span>
          {#each staticSections as s}
            <a
              href="#{s.id}"
              class="sidebar-link"
              class:active={activeSection === s.id}
              onclick={() => (sidebarOpen = false)}>{s.label}</a
            >
          {/each}
        </div>

        {#each allTags as tag}
          <div class="sidebar-group">
            <span class="sidebar-group-label">{tag.label}</span>
            {#each tag.endpoints as ep}
              <a
                href="#{ep.id}"
                class="sidebar-endpoint"
                class:active={activeSection === ep.id}
                onclick={() => (sidebarOpen = false)}
              >
                <span class="sidebar-method method-{ep.method.toLowerCase()}"
                  >{ep.method}</span
                >
                <span class="sidebar-path"
                  >{ep.path}</span
                >
              </a>
            {/each}
          </div>
        {/each}
      </div>
    </aside>

    <!-- ── Main content ── -->
    <main class="content">
      <!-- OVERVIEW -->
      <section id="overview" class="doc-section">
        <div class="section-eyebrow">
          v{(openapiSpec as any).info.version}
        </div>
        <h1 class="section-hero">{(openapiSpec as any).info.title}</h1>
        <p class="section-lead">
          {(openapiSpec as any).info.description}
        </p>

        <div class="info-grid">
          <div class="info-card">
            <span class="info-label">Default URL</span>
            <code class="info-value">http://localhost:3000/api/v1</code>
          </div>
          <div class="info-card">
            <span class="info-label">License</span>
            <code class="info-value">MIT — free to self-host</code>
          </div>
          <div class="info-card">
            <span class="info-label">Spec format</span>
            <code class="info-value"
              >OpenAPI {(openapiSpec as any).openapi}</code
            >
          </div>
          <div class="info-card">
            <span class="info-label">Auth</span>
            <code class="info-value">X-Api-Key</code>
          </div>
        </div>

        <div class="spec-download">
          <a
            href="https://github.com/Kyroinfra/Kyro/blob/main/packages/api/openapi.yaml"
            target="_blank"
            class="spec-link"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              ><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline
                points="7 10 12 15 17 10"
              /><line x1="12" y1="15" x2="12" y2="3" /></svg
            >
            Download OpenAPI YAML
          </a>
        </div>
      </section>

      <!-- HOW TO USE KYRO -->
      <section id="access-methods" class="doc-section">
        <h2 class="section-title">How to use Kyro</h2>
        <p class="section-desc">
          Kyro gives you three ways to interact with your documents — pick
          whichever fits your workflow. All three talk to the same backend
          running on your server.
        </p>

        <div class="access-grid">
          <div class="access-card">
            <div class="access-card-top">
              <span class="access-num">01</span>
              <span class="access-badge">no code</span>
            </div>
            <h3 class="access-title">Dashboard</h3>
            <p class="access-desc">
              A web UI built into Kyro. Upload files, manage collections, create
              API keys, view usage analytics, and ask questions — all without
              writing any code. Best for non-technical teammates or quick
              one-off tasks.
            </p>
            <a href="#dashboard" class="access-link">Dashboard guide →</a>
          </div>

          <div class="access-card access-card-featured">
            <div class="access-card-top">
              <span class="access-num">02</span>
              <span class="access-badge access-badge-green">recommended</span>
            </div>
            <h3 class="access-title">TypeScript SDK</h3>
            <p class="access-desc">
              The official <code>kyro-sdk</code> package. Typed methods for
              files, collections and metadata — upload, list, tag, organize.
              For search and ask, use the HTTP API below.
            </p>
            <a href="#sdk" class="access-link">SDK reference →</a>
          </div>

          <div class="access-card">
            <div class="access-card-top">
              <span class="access-num">03</span>
              <span class="access-badge">advanced</span>
            </div>
            <h3 class="access-title">HTTP API</h3>
            <p class="access-desc">
              Raw REST endpoints — useful if you're building in a language other
              than TypeScript, scripting with curl, or need direct control over
              request shape and headers.
            </p>
            <a href="#http-reference" class="access-link">HTTP reference →</a>
          </div>
        </div>
      </section>

      <!-- DASHBOARD -->
      <section id="dashboard" class="doc-section">
        <h2 class="section-title">Dashboard</h2>
        <p class="section-desc">
          Kyro ships with a built-in web dashboard available at the root of your
          instance (e.g. <code>http://localhost:3000</code>). It's the fastest
          way to get started — no API calls required.
        </p>

        <div class="steps">
          <div class="step">
            <div class="step-num">01</div>
            <div class="step-body">
              <h4>Register your organisation</h4>
              <p class="section-desc" style="margin-bottom: 0">
                On first run, navigate to your instance URL and register. This
                creates your organisation and owner account. Subsequent users
                are invited from the <strong>Settings</strong> page — the registration
                page locks after the first org is created.
              </p>
            </div>
          </div>

          <div class="step">
            <div class="step-num">02</div>
            <div class="step-body">
              <h4>Create an API key</h4>
              <p class="section-desc" style="margin-bottom: 10px">
                Go to <strong>API Keys</strong> in the sidebar and create a key with
                the scopes you need. The full key is shown once — copy it immediately.
                You'll need it to use the SDK or HTTP API.
              </p>
              <div class="code-block">
                <div class="code-toolbar">
                  <span class="code-lang">scopes</span>
                </div>
                <pre><code
                    >read   — list and download files, search, ask questions
write  — upload, delete and reprocess files; manage collections</code
                  ></pre>
              </div>
            </div>
          </div>

          <div class="step">
            <div class="step-num">03</div>
            <div class="step-body">
              <h4>Upload and manage files</h4>
              <p class="section-desc" style="margin-bottom: 0">
                The <strong>Files</strong> page lets you drag-and-drop uploads, track
                pipeline status per file, download originals, and
                add files to collections. Extraction and embedding run
                automatically — failed files can be re-run from the file row.
              </p>
            </div>
          </div>

          <div class="step">
            <div class="step-num">04</div>
            <div class="step-body">
              <h4>Organise with Collections</h4>
              <p class="section-desc" style="margin-bottom: 0">
                Collections group files so you can scope search and <code
                  >/ask</code
                > to a specific set of documents — a matter, a product, a project.
                Create a collection, add files, and use its ID in the SDK or API to
                limit context.
              </p>
            </div>
          </div>

          <div class="step">
            <div class="step-num">05</div>
            <div class="step-body">
              <h4>Ask questions</h4>
              <p class="section-desc" style="margin-bottom: 0">
                The <strong>Ask</strong> page is a chat interface wired to the
                <code>/ask</code> endpoint. Select a scope (whole org or a specific
                collection), type a question, and get a streamed answer with source
                citations — no code required. Useful for testing retrieval quality
                before building your own UI.
              </p>
            </div>
          </div>

          <div class="step">
            <div class="step-num">06</div>
            <div class="step-body">
              <h4>Monitor usage</h4>
              <p class="section-desc" style="margin-bottom: 0">
                The <strong>Usage</strong> page shows total requests, data in/out,
                storage consumed, and a daily request chart. Switch between 7, 30,
                and 90-day windows to track trends.
              </p>
            </div>
          </div>
        </div>

        <div class="callout callout-info" style="margin-top: 28px">
          <span class="callout-icon">ℹ</span>
          <div>
            <strong>Dashboard vs API key scope</strong> — The dashboard authenticates
            with a session cookie (JWT). The API key is a separate credential used
            by the SDK and HTTP API. You manage API keys from the dashboard but use
            them outside it.
          </div>
        </div>
      </section>

      <!-- SDK OVERVIEW -->
      <section id="sdk" class="doc-section">
        <div class="section-eyebrow">typescript sdk</div>
        <h2 class="section-title">TypeScript SDK</h2>
        <p class="section-desc">
          <code>kyro-sdk</code> is the official client library for Node.js and the
          browser. It wraps every HTTP endpoint with typed methods, handles streaming
          SSE responses, and throws structured errors you can catch and branch on.
        </p>

        <div class="info-grid" style="margin-bottom: 24px">
          <div class="info-card">
            <span class="info-label">Package</span>
            <code class="info-value">kyro-sdk</code>
          </div>
          <div class="info-card">
            <span class="info-label">Install</span>
            <code class="info-value">npm i @kyroinfra/kyro</code>
          </div>
          <div class="info-card">
            <span class="info-label">Environments</span>
            <code class="info-value">Node.js · Browser · Edge</code>
          </div>
          <div class="info-card">
            <span class="info-label">Default API version</span>
            <code class="info-value">v1</code>
          </div>
        </div>

        <div class="code-block" style="margin-bottom: 20px">
          <div class="code-toolbar">
            <span class="code-lang">shell</span>
            <button
              class="copy-btn"
              onclick={() => copy("npm i @kyroinfra/kyro", "sdk-install")}
            >
              {copiedId === "sdk-install" ? "✓ copied" : "copy"}
            </button>
          </div>
          <pre><code>npm i @kyroinfra/kyro</code></pre>
        </div>

        <div class="code-block">
          <div class="code-toolbar">
            <span class="code-lang">typescript</span>
            <button
              class="copy-btn"
              onclick={() =>
                copy(
                  `import { KyroClient } from "kyro-sdk";

const kyro = new KyroClient({
  baseURL: "http://localhost:3000/api/v1",
  apiKey:  "kyro_live_...",
});

// Upload a file — extraction + embedding run automatically
const file = await kyro.files.upload(blob, "report.pdf");

// Poll until the file is queryable (files.status)
const { status } = await kyro.files.getText(file.id);
// status: "pending" | "processing" | "ready" | "failed" | "skipped"`,
                  "sdk-quickstart",
                )}
            >
              {copiedId === "sdk-quickstart" ? "✓ copied" : "copy"}
            </button>
          </div>
          <pre><code
              ><span class="ck">import</span> {"{ KyroClient }"} <span
                class="ck">from</span
              > <span class="cs">"kyro-sdk"</span>;

<span class="ck">const</span> kyro = <span class="ck">new</span> <span
                class="cs">KyroClient</span
              >({"{"} 
  baseURL: <span class="cs">"http://localhost:3000/api/v1"</span>,
  apiKey:  <span class="cs">"kyro_live_..."</span>,
{"}"});

<span class="c-comment">// Upload a file — extraction + embedding run automatically</span>
<span class="ck">const</span> file = <span class="ck">await</span
              > kyro.files.<span class="cs">upload</span>(blob, <span class="cs"
                >"report.pdf"</span
              >);

<span class="c-comment">// Poll until the file is queryable (files.status)</span>
<span class="ck">const</span> {"{ status }"} = <span class="ck">await</span
              > kyro.files.<span class="cs">getText</span>(file.id);
<span class="c-comment">// status: "pending" | "processing" | "ready" | "failed" | "skipped"</span
            ></code
            ></pre>
        </div>

        <h3 class="sdk-subheading" style="margin-top: 32px">
          Typical workflow
        </h3>
        <p class="section-desc">End-to-end: upload → tag → organize → ask.</p>

        <div class="code-block">
          <div class="code-toolbar">
            <span class="code-lang">typescript</span>
            <button
              class="copy-btn"
              onclick={() =>
                copy(
                  `// 1. Upload — pipeline runs automatically (extract → chunk → embed)
const file = await kyro.files.upload(pdfBlob, "agreement.pdf");

// 2. Tag with metadata
await kyro.files.setMetadata(file.id, {
  document_type: "contract",
  matter_number: "M-2024-001",
});

// 3. Add to a collection
await kyro.collections.addFiles(collectionId, { fileIds: [file.id] });

// 4. Poll until the file is queryable
let { status } = await kyro.files.getText(file.id);
while (status !== "ready") {
  await new Promise(r => setTimeout(r, 2000));
  ({ status } = await kyro.files.getText(file.id));
}

// 5. Ask — use the HTTP API (POST /ask, SSE stream)
const res = await fetch("http://localhost:3000/api/v1/ask", {
  method: "POST",
  headers: { "X-Api-Key": process.env.KYRO_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({
    question:     "What are the termination conditions?",
    collectionId: collectionId,
    stream:       false,
  }),
});
const { answer, sources } = await res.json();`,
                  "sdk-workflow",
                )}
            >
              {copiedId === "sdk-workflow" ? "✓ copied" : "copy"}
            </button>
          </div>
          <pre><code
              ><span class="c-comment">// 1. Upload — pipeline runs automatically (extract → chunk → embed)</span>
<span class="ck">const</span> file = <span class="ck">await</span
              > kyro.files.<span class="cs">upload</span>(pdfBlob, <span
                class="cs">"agreement.pdf"</span
              >);

<span class="c-comment">// 2. Tag with metadata</span>
<span class="ck">await</span> kyro.files.<span class="cs">setMetadata</span
              >(file.id, {"{"} 
  document_type: <span class="cs">"contract"</span>,
  matter_number: <span class="cs">"M-2024-001"</span>,
{"}"});

<span class="c-comment">// 3. Add to a collection</span>
<span class="ck">await</span> kyro.collections.<span class="cs">addFiles</span
              >(collectionId, {"{"} fileIds: [file.id] {"}"});

<span class="c-comment">// 4. Poll until the file is queryable</span>
<span class="ck">let</span> {"{ status }"} = <span class="ck">await</span
              > kyro.files.<span class="cs">getText</span>(file.id);
<span class="ck">while</span> (status !== <span class="cs">"ready"</span
              >) {"{"} 
  <span class="ck">await new</span> Promise(r => <span class="cs"
                >setTimeout</span
              >(r, <span class="cs">2000</span>));
  ({"{ status }"} = <span class="ck">await</span> kyro.files.<span
                class="cs">getText</span
              >(file.id));
{"}"}

<span class="c-comment">// 5. Ask — use the HTTP API (POST /ask, SSE stream)</span>
<span class="ck">const</span> res = <span class="ck">await</span
              > <span class="cs">fetch</span>(<span class="cs"
                >"http://localhost:3000/api/v1/ask"</span
              >, {"{"}
  method: <span class="cs">"POST"</span>,
  headers: {"{"} <span class="cs">"X-Api-Key"</span>: process.env.<span
                class="ck">KYRO_KEY</span>, <span class="cs"
                >"Content-Type"</span
              >: <span class="cs">"application/json"</span> {"}"},
  body: JSON.<span class="cs">stringify</span>({"{"} 
    question:     <span class="cs">"What are the termination conditions?"</span>,
    collectionId: collectionId,
    stream:       <span class="ck">false</span>,
  {"}"}),
{"}"});
<span class="ck">const</span> {"{ answer, sources }"} = <span class="ck">await</span
              > res.<span class="cs">json</span>();</code
            ></pre>
        </div>
      </section>

      <!-- SDK FILES -->
      <section id="sdk-files" class="doc-section">
        <h2 class="section-title">SDK · Files</h2>
        <p class="section-desc">
          All file operations live on <code>kyro.files</code>. The ingest
          pipeline (extract → chunk → embed) runs automatically on upload —
          failed files re-run via <code>POST /files/:id/reprocess</code>, and
          search/ask live on the HTTP API (see below).
        </p>

        <div class="sdk-method-list">
          {#each [{ name: "kyro.files.upload(blob, filename)", desc: "Upload a file. Returns the file record including its ID and initial status. PDF, DOCX, DOC and TXT are extracted; CSV and JSON are stored with status \"skipped\"; other types are rejected with 415.", example: `const file = await kyro.files.upload(blob, "contract.pdf");\n// file.id, file.status` }, { name: "kyro.files.list(limit?, cursor?)", desc: "Paginated file list. Pass pagination.nextCursor as the cursor argument to fetch the next page.", example: `const { data, pagination } = await kyro.files.list(50);\nif (pagination.hasMore) {\n  const next = await kyro.files.list(50, pagination.nextCursor);\n}` }, { name: "kyro.files.download(fileId)", desc: "Download the original file as a Blob.", example: `const blob = await kyro.files.download(fileId);` }, { name: "kyro.files.delete(fileId)", desc: "Soft-delete a file and remove it from disk.", example: `await kyro.files.delete(fileId);` }, { name: "kyro.files.getText(fileId)", desc: "Get the file's pipeline status and extracted text. Poll this after upload to know when the file is queryable.", example: `const { status, extractedText } = await kyro.files.getText(fileId);\n// status: "pending" | "processing" | "ready" | "failed" | "skipped"` }, { name: "kyro.files.setMetadata(fileId, meta)", desc: "Upsert arbitrary key-value metadata on a file. Non-destructive — keys not in the payload are left untouched.", example: `await kyro.files.setMetadata(fileId, {\n  matter_number: "M-2024-001",\n  document_type: "contract",\n});` }, { name: "kyro.files.getMetadata(fileId)", desc: "Return all metadata keys and values for a file.", example: `const meta = await kyro.files.getMetadata(fileId);` }, { name: "kyro.files.deleteMetadataKey(fileId, key)", desc: "Remove a single metadata key.", example: `await kyro.files.deleteMetadataKey(fileId, "counterparty");` }] as method}
            <div class="sdk-entry">
              <div class="sdk-entry-header">
                <code class="sdk-sig">{method.name}</code>
              </div>
              <p class="sdk-entry-desc">{method.desc}</p>
              <div class="code-block">
                <div class="code-toolbar">
                  <span class="code-lang">typescript</span>
                  <button
                    class="copy-btn"
                    onclick={() =>
                      copy(method.example, `sdk-file-${method.name}`)}
                  >
                    {copiedId === `sdk-file-${method.name}` ? "✓" : "copy"}
                  </button>
                </div>
                <pre><code>{method.example}</code></pre>
              </div>
            </div>
          {/each}
        </div>
      </section>

      <!-- SDK COLLECTIONS -->
      <section id="sdk-collections" class="doc-section">
        <h2 class="section-title">SDK · Collections</h2>
        <p class="section-desc">
          All collection operations live on <code>kyro.collections</code>. A
          collection is a named group of files — scope search and
          <code>/ask</code> to it by passing its ID.
        </p>

        <div class="sdk-method-list">
          {#each [{ name: "kyro.collections.create({ name, description? })", desc: "Create a new collection. Name must be unique within your org.", example: `const col = await kyro.collections.create({\n  name:        "Q4 Contracts",\n  description: "All contracts signed in Q4 2024",\n});` }, { name: "kyro.collections.list()", desc: "List all collections. Each item includes fileCount, embeddedCount, pendingCount, and failedCount.", example: `const collections = await kyro.collections.list();` }, { name: "kyro.collections.get(collectionId)", desc: "Get a collection with full status. col.queryReady is true when all files are embedded.", example: `const col = await kyro.collections.get(collectionId);\n// col.queryReady — true when ready to search` }, { name: "kyro.collections.update(collectionId, { name?, description? })", desc: "Update collection name or description.", example: `await kyro.collections.update(collectionId, { name: "Q4 Agreements" });` }, { name: "kyro.collections.delete(collectionId)", desc: "Delete a collection. Does not delete the files themselves.", example: `await kyro.collections.delete(collectionId);` }, { name: "kyro.collections.addFiles(collectionId, { fileIds })", desc: "Add up to 100 files to a collection in one call.", example: `await kyro.collections.addFiles(collectionId, {\n  fileIds: [fileId1, fileId2],\n});` }, { name: "kyro.collections.listFiles(collectionId)", desc: "List files in a collection with per-file embedding status.", example: `const { data } = await kyro.collections.listFiles(collectionId);\n// data[i].embeddingStatus` }, { name: "kyro.collections.removeFile(collectionId, fileId)", desc: "Remove a file from a collection without deleting it.", example: `await kyro.collections.removeFile(collectionId, fileId);` }] as method}
            <div class="sdk-entry">
              <div class="sdk-entry-header">
                <code class="sdk-sig">{method.name}</code>
              </div>
              <p class="sdk-entry-desc">{method.desc}</p>
              <div class="code-block">
                <div class="code-toolbar">
                  <span class="code-lang">typescript</span>
                  <button
                    class="copy-btn"
                    onclick={() =>
                      copy(method.example, `sdk-col-${method.name}`)}
                  >
                    {copiedId === `sdk-col-${method.name}` ? "✓" : "copy"}
                  </button>
                </div>
                <pre><code>{method.example}</code></pre>
              </div>
            </div>
          {/each}
        </div>
      </section>

      <!-- SDK ASK & SEARCH -->
      <section id="sdk-ask" class="doc-section">
        <h2 class="section-title">Search &amp; Ask — HTTP API</h2>
        <p class="section-desc">
          Retrieval and question answering live on the REST surface. Both
          accept <code>X-Api-Key</code> or <code>Authorization: Bearer</code>,
          and share the same scope rules: <code>collectionId</code> XOR
          <code>fileIds</code>, or org-wide when neither is given.
        </p>

        <div class="sdk-method-list">
          <div class="sdk-entry">
            <div class="sdk-entry-header">
              <code class="sdk-sig">GET /api/v1/search</code>
            </div>
            <p class="sdk-entry-desc">
              Ranked chunks without a generated answer — the same hybrid
              retrieval <code>/ask</code> uses: a <code>ts_rank</code> keyword
              arm fused with the pgvector cosine arm via Reciprocal Rank
              Fusion, optionally followed by cross-encoder reranking. Scope
              with <code>collection_id</code> or <code>file_ids</code>;
              <code>filters</code> takes a URL-encoded JSON object of metadata
              filters.
            </p>

            <div class="code-block" style="margin-bottom: 12px">
              <div class="code-toolbar">
                <span class="code-lang">shell</span>
                <button
                  class="copy-btn"
                  onclick={() =>
                    copy(
                      `curl "http://localhost:3000/api/v1/search?q=payment+terms&collection_id=c_xyz&limit=5" \\\n  -H "X-Api-Key: $API_KEY"`,
                      "sdk-search-curl",
                    )}
                >
                  {copiedId === "sdk-search-curl" ? "✓" : "copy"}
                </button>
              </div>
              <pre><code
                  >curl "http://localhost:3000/api/v1/search?q=payment+terms&collection_id=c_xyz&limit=5" \
  -H "X-Api-Key: $API_KEY"</code
                ></pre>
            </div>
          </div>

          <div class="sdk-entry">
            <div class="sdk-entry-header">
              <code class="sdk-sig">POST /api/v1/ask</code>
            </div>
            <p class="sdk-entry-desc">
              Ask a natural language question and get an answer grounded in your
              documents, with source citations. <code>stream: true</code>
              (default) answers over Server-Sent Events;
              <code>stream: false</code> returns one JSON body.
            </p>

            <div class="code-block" style="margin-bottom: 12px">
              <div class="code-toolbar">
                <span class="code-lang">non-streaming</span>
                <button
                  class="copy-btn"
                  onclick={() =>
                    copy(
                      `const res = await fetch("http://localhost:3000/api/v1/ask", {\n  method: "POST",\n  headers: { "X-Api-Key": process.env.KYRO_KEY, "Content-Type": "application/json" },\n  body: JSON.stringify({\n    question:     "What is the total contract value?",\n    collectionId: collectionId,\n    stream:       false,\n  }),\n});\nconst { answer, sources } = await res.json();\n\n// sources[i]: { fileId, fileName, chunkIndex, content, rrfScore }`,
                      "sdk-ask-nonstream",
                    )}
                >
                  {copiedId === "sdk-ask-nonstream" ? "✓" : "copy"}
                </button>
              </div>
              <pre><code
                  ><span class="ck">const</span> res = <span class="ck"
                    >await</span
                  > <span class="cs">fetch</span>(<span class="cs"
                    >"http://localhost:3000/api/v1/ask"</span
                  >, {"{"}
  method: <span class="cs">"POST"</span>,
  headers: {"{"} <span class="cs">"X-Api-Key"</span>: process.env.<span
                    class="ck">KYRO_KEY</span>, <span class="cs"
                    >"Content-Type"</span
                  >: <span class="cs">"application/json"</span> {"}"},
  body: JSON.<span class="cs">stringify</span>({"{"} 
    question:     <span class="cs">"What is the total contract value?"</span>,
    collectionId: collectionId,
    stream:       <span class="ck">false</span>,
  {"}"}),
{"}"});
<span class="ck">const</span> {"{ answer, sources }"} = <span class="ck"
                    >await</span
                  > res.<span class="cs">json</span>();

<span class="c-comment"
                    >// sources[i]: {"{ fileId, fileName, chunkIndex, content, rrfScore }"}</span
                  ></code
                ></pre>
            </div>

            <div class="code-block" style="margin-bottom: 12px">
              <div class="code-toolbar">
                <span class="code-lang">streaming (SSE)</span>
                <button
                  class="copy-btn"
                  onclick={() =>
                    copy(
                      `const res = await fetch("http://localhost:3000/api/v1/ask", {\n  method: "POST",\n  headers: { "X-Api-Key": process.env.KYRO_KEY, "Content-Type": "application/json" },\n  body: JSON.stringify({ question: "Summarise the risks." }),\n});\n\nfor await (const event of parseSSE(res.body)) {\n  switch (event.type) {\n    case "sources": console.log(event.sources); break;\n    case "chunk":   process.stdout.write(event.text); break;\n    case "done":    console.log("\\nDone"); break;\n    case "error":   console.error(event.message); break;\n  }\n}`,
                      "sdk-ask-stream",
                    )}
                >
                  {copiedId === "sdk-ask-stream" ? "✓" : "copy"}
                </button>
              </div>
              <pre><code
                  ><span class="ck">const</span> res = <span class="ck"
                    >await</span
                  > <span class="cs">fetch</span>(<span class="cs"
                    >"http://localhost:3000/api/v1/ask"</span
                  >, {"{"}
  method: <span class="cs">"POST"</span>,
  headers: {"{"} <span class="cs">"X-Api-Key"</span>: process.env.<span
                    class="ck">KYRO_KEY</span>, <span class="cs"
                    >"Content-Type"</span
                  >: <span class="cs">"application/json"</span> {"}"},
  body: JSON.<span class="cs">stringify</span>({"{"} question: <span
                    class="cs">"Summarise the risks."</span
                  > {"}"}),
{"}"});

<span class="ck">for await</span> (<span class="ck"
                    >const</span
                  > event <span class="ck">of</span> <span class="cs"
                    >parseSSE</span
                  >(res.body)) {"{"} 
  <span class="ck">switch</span> (event.type) {"{"} 
    <span class="ck">case</span> <span class="cs">"sources"</span
                  >: console.<span class="cs">log</span>(event.sources); <span
                    class="ck">break</span
                  >;
    <span class="ck">case</span> <span class="cs">"chunk"</span
                  >:   process.stdout.<span class="cs">write</span
                  >(event.text); <span class="ck">break</span>;
    <span class="ck">case</span> <span class="cs">"done"</span
                  >:    console.<span class="cs">log</span>(<span class="cs"
                    >"\nDone"</span
                  >); <span class="ck">break</span>;
    <span class="ck">case</span> <span class="cs">"error"</span
                  >:   console.<span class="cs">error</span
                  >(event.message); <span class="ck">break</span>;
  {"}"}
{"}"}</code
                ></pre>
            </div>

            <div class="table-scroll">
              <table class="ref-table">
                <thead
                  ><tr
                    ><th>Option</th><th>Type</th><th>Default</th><th
                      >Description</th
                    ></tr
                  ></thead
                >
                <tbody>
                  {#each [["question", "string", "—", "The question to answer (1–2000 chars)"], ["collectionId", "string", "—", "Scope to a collection. Mutually exclusive with fileIds"], ["fileIds", "string[]", "—", "Scope to specific files (max 20). Mutually exclusive with collectionId"], ["filters", "object", "—", "Metadata key-value filters. AND across keys, OR across values"], ["topK", "number", "8", "Number of chunks to retrieve (1–20)"], ["model", "string", "server default", "Ollama model override"], ["stream", "boolean", "true", "Whether to stream the response as SSE"], ["history", "array", "—", "Up to 10 prior user/assistant turns for follow-ups — replayed to the LLM, never affects retrieval"]] as row}
                    <tr
                      >{#each row as cell}<td>{cell}</td>{/each}</tr
                    >
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <!-- SDK ERRORS -->
      <section id="sdk-errors" class="doc-section">
        <h2 class="section-title">SDK · Error Handling</h2>
        <p class="section-desc">
          All SDK methods throw typed errors. Import the specific class you want
          to catch — each maps to a distinct HTTP status code.
        </p>

        <div class="code-block" style="margin-bottom: 24px">
          <div class="code-toolbar">
            <span class="code-lang">typescript</span>
            <button
              class="copy-btn"
              onclick={() =>
                copy(
                  `import {\n  KyroApiError,\n  KyroAuthError,\n  KyroNotFoundError,\n  KyroRateLimitError,\n  KyroQuotaError,\n  KyroValidationError,\n} from "kyro-sdk";\n\ntry {\n  await kyro.files.upload(blob, "file.pdf");\n} catch (err) {\n  if (err instanceof KyroAuthError)      { /* 401 — invalid or missing API key */ }\n  if (err instanceof KyroQuotaError)     { /* 403 — storage quota exceeded */ }\n  if (err instanceof KyroNotFoundError)  { /* 404 — resource not found */ }\n  if (err instanceof KyroRateLimitError) { /* 429 — slow down */ setTimeout(retry, err.retryAfter * 1000); }\n  if (err instanceof KyroValidationError){ /* 400 — bad input */ console.error(err.details); }\n  if (err instanceof KyroApiError)       { /* catch-all */ console.error(err.status, err.message); }\n}`,
                  "sdk-errors-ex",
                )}
            >
              {copiedId === "sdk-errors-ex" ? "✓ copied" : "copy"}
            </button>
          </div>
          <pre><code
              ><span class="ck">import</span> {"{"}
  KyroApiError, KyroAuthError, KyroNotFoundError,
  KyroRateLimitError, KyroQuotaError, KyroValidationError,
{"}"} <span class="ck">from</span> <span class="cs">"kyro-sdk"</span>;

<span class="ck">try</span> {"{"} 
  <span class="ck">await</span> kyro.files.<span class="cs">upload</span
              >(blob, <span class="cs">"file.pdf"</span>);
{"}"} <span class="ck">catch</span> (err) {"{"} 
  <span class="ck">if</span> (err <span class="ck">instanceof</span
              > KyroAuthError)       {"{"} <span class="c-comment"
                >/* 401 — invalid or missing API key */</span
              > {"}"}
  <span class="ck">if</span> (err <span class="ck">instanceof</span
              > KyroQuotaError)      {"{"} <span class="c-comment"
                >/* 403 — storage quota exceeded */</span
              > {"}"}
  <span class="ck">if</span> (err <span class="ck">instanceof</span
              > KyroNotFoundError)   {"{"} <span class="c-comment"
                >/* 404 — resource not found */</span
              > {"}"}
  <span class="ck">if</span> (err <span class="ck">instanceof</span
              > KyroRateLimitError)  {"{"} <span class="c-comment"
                >/* 429 — check err.retryAfter */</span
              >
    <span class="cs">setTimeout</span>(retry, err.retryAfter * <span class="cs"
                >1000</span
              >); {"}"}
  <span class="ck">if</span> (err <span class="ck">instanceof</span
              > KyroValidationError) {"{"} <span class="c-comment"
                >/* 400 — err.details has field errors */</span
              > {"}"}
  <span class="ck">if</span> (err <span class="ck">instanceof</span
              > KyroApiError)        {"{"} <span class="c-comment"
                >/* catch-all */</span
              > {"}"}
{"}"}</code
            ></pre>
        </div>

        <div class="table-scroll">
          <table class="ref-table">
            <thead
              ><tr
                ><th>Class</th><th>HTTP status</th><th>When it's thrown</th></tr
              ></thead
            >
            <tbody>
              {#each [["KyroAuthError", "401", "Missing or invalid API key"], ["KyroQuotaError", "403", "Storage quota exceeded"], ["KyroNotFoundError", "404", "File, collection, or resource not found"], ["KyroValidationError", "400", "Bad input — err.details has per-field messages"], ["KyroRateLimitError", "429", "Rate limit hit — err.retryAfter is seconds to wait"], ["KyroApiError", "any", "Catch-all for any other API error — err.status and err.code available"]] as row}
                <tr
                  >{#each row as cell}<td>{cell}</td>{/each}</tr
                >
              {/each}
            </tbody>
          </table>
        </div>
      </section>

      <!-- SELF-HOSTING -->
      <section id="self-hosting" class="doc-section">
        <h2 class="section-title">Self-hosting</h2>
        <p class="section-desc">
          Kyro runs entirely on your own infrastructure. Postgres (with
          pgvector) stores files, chunks and embeddings, the api runs the
          ingest pipeline and webhook delivery in-process, and Ollama runs your
          embedding and chat models locally. Nothing leaves your network.
        </p>

        <div class="steps">
          <div class="step">
            <div class="step-num">01</div>
            <div class="step-body">
              <h4>Start the stack</h4>
              <p class="section-desc" style="margin-bottom: 10px">
                One command brings up Postgres, nginx, and the Kyro api —
                migrations run at api startup under a Postgres advisory lock.
              </p>
              <div class="code-block">
                <div class="code-toolbar">
                  <span class="code-lang">shell</span>
                  <button
                    class="copy-btn"
                    onclick={() =>
                      copy("./scripts/prod.sh", "self-host-start")}
                  >
                    {copiedId === "self-host-start" ? "✓ copied" : "copy"}
                  </button>
                </div>
                <pre><code>./scripts/prod.sh</code></pre>
              </div>
            </div>
          </div>

          <div class="step">
            <div class="step-num">02</div>
            <div class="step-body">
              <h4>Pull an Ollama model</h4>
              <p class="section-desc" style="margin-bottom: 10px">
                Kyro uses <code>nomic-embed-text</code> for embeddings and
                <code>llama3.2</code>
                for answering questions. Set <code>OLLAMA_URL</code>,
                <code>EMBEDDING_MODEL</code>, and <code>CHAT_MODEL</code> in
                your <code>.env</code> to use different models.
              </p>
              <div class="code-block">
                <div class="code-toolbar">
                  <span class="code-lang">shell</span>
                  <button
                    class="copy-btn"
                    onclick={() =>
                      copy(
                        "ollama pull nomic-embed-text\nollama pull llama3.2",
                        "self-host-models",
                      )}
                  >
                    {copiedId === "self-host-models" ? "✓ copied" : "copy"}
                  </button>
                </div>
                <pre><code
                    >ollama pull nomic-embed-text
ollama pull llama3.2</code
                  ></pre>
              </div>
            </div>
          </div>

          <div class="step">
            <div class="step-num">03</div>
            <div class="step-body">
              <h4>Create an account and API key</h4>
              <p class="section-desc" style="margin-bottom: 10px">
                Register via <code>POST /api/v1/auth/register</code> (the first
                registration creates your organisation and owner), then create
                an API key from the dashboard or via
                <code>POST /api/v1/keys</code>. Keys carry one of two scopes.
              </p>
              <div class="code-block">
                <div class="code-toolbar">
                  <span class="code-lang">scopes</span>
                </div>
                <pre><code
                    >read   — list and download files, search, ask questions
write  — upload, delete and reprocess files; manage collections</code
                  ></pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- AUTH -->
      <section id="auth" class="doc-section">
        <h2 class="section-title">Authentication</h2>
        <p class="section-desc">
          One gate covers every org-scoped route: send either an
          <code>X-Api-Key</code> header or a <code>Bearer</code> JWT. An
          explicit <code>X-Api-Key</code> wins when both are present — it is
          the narrower credential. Key management (<code>/auth</code>,
          <code>/org</code>, <code>/keys</code>, <code>/usage</code>,
          <code>/webhooks</code>) uses the short-lived JWT obtained from
          <code>/auth/login</code>.
        </p>

        <div class="sdk-methods">
          <div class="sdk-method">
            <div class="sdk-method-header">
              <code class="sdk-method-name"
                >X-Api-Key header — file operations</code
              >
              <span class="auth-badge auth-apikey">API Key</span>
            </div>
            <div class="code-block">
              <div class="code-toolbar">
                <span class="code-lang">http</span>
                <button
                  class="copy-btn"
                  onclick={() =>
                    copy("X-Api-Key: kyro_live_your_key_here", "auth-apikey")}
                >
                  {copiedId === "auth-apikey" ? "✓" : "copy"}
                </button>
              </div>
              <pre><code>X-Api-Key: kyro_live_your_key_here</code></pre>
            </div>
          </div>

          <div class="sdk-method">
            <div class="sdk-method-header">
              <code class="sdk-method-name"
                >Authorization header — org & key management</code
              >
              <span class="auth-badge auth-bearer">Bearer JWT</span>
            </div>
            <div class="code-block">
              <div class="code-toolbar">
                <span class="code-lang">http</span>
                <button
                  class="copy-btn"
                  onclick={() =>
                    copy(
                      "Authorization: Bearer <token from /auth/login>",
                      "auth-bearer",
                    )}
                >
                  {copiedId === "auth-bearer" ? "✓" : "copy"}
                </button>
              </div>
              <pre><code
                  >Authorization: Bearer &lt;token from /auth/login&gt;</code
                ></pre>
            </div>
          </div>
        </div>
      </section>

      <!-- RAG PIPELINE -->
      <section id="rag-pipeline" class="doc-section">
        <h2 class="section-title">RAG Pipeline</h2>
        <p class="section-desc">
          Every document goes through three stages before it can be queried. All
          processing runs on your server — no external API calls are made at any
          stage.
        </p>

        <div class="steps">
          <div class="step">
            <div class="step-num">01</div>
            <div class="step-body">
              <h4>Upload</h4>
              <p class="section-desc">
                <code>POST /files</code> saves the file to disk and starts the
                in-process pipeline immediately — the file moves through
                <code>pending → processing → ready</code> (or
                <code>failed</code>, with the reason in <code>files.error</code>).
                Supported types: <strong>PDF, DOCX, DOC, TXT</strong>; CSV and
                JSON are stored without extraction (<code>skipped</code>).
              </p>
            </div>
          </div>

          <div class="step">
            <div class="step-num">02</div>
            <div class="step-body">
              <h4>Extract</h4>
              <p class="section-desc">
                The pipeline extracts text (PDF via <code>unpdf</code>, DOCX
                via <code>mammoth</code>), splits it into overlapping chunks
                (~1200 chars each), and stores them in Postgres. Poll
                <code>GET /files/:id/text</code> for status. Failed files
                re-run with <code>POST /files/:id/reprocess</code>.
              </p>
            </div>
          </div>

          <div class="step">
            <div class="step-num">03</div>
            <div class="step-body">
              <h4>Embed</h4>
              <p class="section-desc">
                Embedding is part of the same pipeline — no manual trigger. It
                calls your local Ollama embedding model
                (<code>nomic-embed-text</code> by default) and stores
                768-dimensional vectors alongside each chunk in
                <code>pgvector</code>. When the file becomes queryable the
                terminal <code>file.ready</code> webhook fires (or
                <code>file.failed</code> if anything went wrong).
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- RAG ASK -->
      <section id="rag-ask" class="doc-section">
        <h2 class="section-title">/ask — grounded answers</h2>
        <p class="section-desc">
          Send a question, get a cited answer. Kyro retrieves the most relevant
          chunks via hybrid search, builds a grounded prompt, and streams the
          response from your local LLM. The LLM only sees what is in your
          documents — it cannot fabricate facts from outside them.
        </p>

        <div class="info-grid" style="margin-bottom: 20px">
          <div class="info-card">
            <span class="info-label">Retrieval</span>
            <code class="info-value">ts_rank + pgvector → RRF</code>
          </div>
          <div class="info-card">
            <span class="info-label">Reranking</span>
            <code class="info-value">Cross-encoder (opt-in)</code>
          </div>
          <div class="info-card">
            <span class="info-label">Response</span>
            <code class="info-value">SSE stream (or JSON)</code>
          </div>
          <div class="info-card">
            <span class="info-label">Scope</span>
            <code class="info-value">file IDs, collection, or entire org</code>
          </div>
        </div>

        <div class="code-block">
          <div class="code-toolbar">
            <span class="code-lang">typescript</span>
            <button
              class="copy-btn"
              onclick={() =>
                copy(
                  `const res = await fetch('/api/v1/ask', {
  method: 'POST',
  headers: { 'X-Api-Key': process.env.KYRO_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: 'What are the payment terms?',
    collectionId: 'c_xyz',  // or fileIds: [...], or omit for org-wide
    topK: 8,
    stream: true,
  }),
});

for await (const event of parseSSE(res)) {
  if (event.type === 'sources')  console.log(event.sources);
  if (event.type === 'chunk')    process.stdout.write(event.text);
  if (event.type === 'done')     break;
}`,
                  "rag-ask-example",
                )}
            >
              {copiedId === "rag-ask-example" ? "✓ copied" : "copy"}
            </button>
          </div>
          <pre><code
              ><span class="ck">const</span> res = <span class="ck">await</span
              > <span class="cs">fetch</span>(<span class="cs"
                >'/api/v1/ask'</span
              >, {"{"}
  method: <span class="cs">'POST'</span>,
  headers: {"{"} <span class="cs">'X-Api-Key'</span>: process.env.<span
                class="ck">KYRO_KEY</span
              >, <span class="cs">'Content-Type'</span>: <span class="cs"
                >'application/json'</span
              > {"}"},
  body: JSON.<span class="cs">stringify</span>({"{"} 
    question: <span class="cs">'What are the payment terms?'</span>,
    collectionId: <span class="cs">'c_xyz'</span>,  <span class="c-comment"
                >// or fileIds: [...], or omit for org-wide</span
              >
    topK: <span class="cs">8</span>,
    stream: <span class="ck">true</span>,
  {"}"}),
{"}"});

<span class="ck">for await</span> (<span class="ck">const</span> event <span
                class="ck">of</span
              > <span class="cs">parseSSE</span>(res)) {"{"}
  <span class="ck">if</span> (event.type === <span class="cs">'sources'</span
              >)  console.log(event.sources);
  <span class="ck">if</span> (event.type === <span class="cs">'chunk'</span
              >)    process.stdout.write(event.text);
  <span class="ck">if</span> (event.type === <span class="cs">'done'</span
              >)     <span class="ck">break</span>;
{"}"}</code
            ></pre>
        </div>

        <div class="table-scroll" style="margin-top: 20px">
          <table class="ref-table">
            <thead>
              <tr><th>SSE event type</th><th>Payload</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><code>sources</code></td>
                <td
                  >Array of retrieved chunks with file name, chunk index,
                  content, and RRF score. Sent before the first answer token.</td
                >
              </tr>
              <tr>
                <td><code>chunk</code></td>
                <td
                  >A token fragment from the LLM. Accumulate these to build the
                  full answer.</td
                >
              </tr>
              <tr>
                <td><code>done</code></td>
                <td>Stream complete.</td>
              </tr>
              <tr>
                <td><code>error</code></td>
                <td
                  >LLM or retrieval error. Includes a <code>message</code> field.</td
                >
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- RAG SEARCH -->
      <section id="rag-search" class="doc-section">
        <h2 class="section-title">/search — chunk retrieval</h2>
        <p class="section-desc">
          Returns ranked chunks without generating an answer. Useful for
          building your own UI, debugging retrieval quality, or feeding results
          into your own pipeline. Uses the same hybrid retrieval as <code
            >/ask</code
          >: a <code>ts_rank</code> keyword arm over the generated tsvector,
          fused with pgvector cosine similarity via Reciprocal Rank Fusion,
          optionally followed by cross-encoder reranking
          (<code>RERANK_ENABLED</code>, off by default).
        </p>

        <div class="code-block">
          <div class="code-toolbar">
            <span class="code-lang">shell</span>
            <button
              class="copy-btn"
              onclick={() =>
                copy(
                  `curl "http://localhost:3000/api/v1/search?q=payment+terms&collection_id=c_xyz&limit=5" \\
  -H "X-Api-Key: $API_KEY"`,
                  "rag-search-example",
                )}
            >
              {copiedId === "rag-search-example" ? "✓ copied" : "copy"}
            </button>
          </div>
          <pre><code
              >curl "http://localhost:3000/api/v1/search?q=payment+terms&collection_id=c_xyz&limit=5" \
  -H "X-Api-Key: $API_KEY"</code
            ></pre>
        </div>
      </section>

      <!-- METADATA FILTERS -->
      <section id="metadata-filters" class="doc-section">
        <h2 class="section-title">Metadata Filters</h2>
        <p class="section-desc">
          Every file can carry arbitrary key/value metadata — useful for tagging
          documents with vertical-specific fields like
          <code>matter_number</code>, <code>document_type</code>,
          <code>product</code>, or <code>version</code>. Set metadata with
          <code>PUT /files/:id/metadata</code>, then pass a <code>filters</code>
          object to <code>/ask</code> to scope retrieval.
        </p>

        <div class="code-block" style="margin-bottom: 16px">
          <div class="code-toolbar">
            <span class="code-lang">set metadata</span>
            <button
              class="copy-btn"
              onclick={() =>
                copy(
                  `curl -X PUT http://localhost:3000/api/v1/files/3f1c2a4b-0000-0000-0000-000000000000/metadata \\
  -H "X-Api-Key: $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"matter_number": "M-2024-001", "document_type": "contract"}'`,
                  "meta-set",
                )}
            >
              {copiedId === "meta-set" ? "✓ copied" : "copy"}
            </button>
          </div>
          <pre><code
              >curl -X PUT http://localhost:3000/api/v1/files/3f1c2a4b-0000-0000-0000-000000000000/metadata \
  -H "X-Api-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"{"}\"matter_number\": \"M-2024-001\", \"document_type\": \"contract\"{"}"}'</code
            ></pre>
        </div>

        <div class="code-block">
          <div class="code-toolbar">
            <span class="code-lang">filter in /ask</span>
            <button
              class="copy-btn"
              onclick={() =>
                copy(
                  `{
  "question": "What are the termination clauses?",
  "filters": {
    "matter_number": "M-2024-001",
    "document_type": ["contract", "amendment"]
  }
}`,
                  "meta-filter",
                )}
            >
              {copiedId === "meta-filter" ? "✓ copied" : "copy"}
            </button>
          </div>
          <pre><code
              >{`{
  "question": "What are the termination clauses?",
  "filters": {
    "matter_number": "M-2024-001",
    "document_type": ["contract", "amendment"]
  }
}`}</code
            ></pre>
        </div>

        <p class="section-desc" style="margin-top: 16px">
          Filters are <strong>AND across keys</strong> and
          <strong>OR across values</strong>. The example above matches files
          where <code>matter_number</code> is <code>M-2024-001</code>
          <em>and</em> <code>document_type</code> is either
          <code>contract</code>
          or <code>amendment</code>.
        </p>
      </section>

      <!-- RATE LIMITING -->
      <section id="rate-limiting" class="doc-section">
        <h2 class="section-title">Rate Limiting</h2>
        <p class="section-desc">
          The default limit is 100 requests per minute per API key, enforced by
          an in-memory sliding window inside each api process. Replicas do not
          share a budget — a documented trade-off of the no-Redis architecture.
          When the window is exhausted the api answers <code>429</code> with a
          <code>retryAfter</code> value in seconds.
        </p>

        <div class="rate-card">
          <div class="rate-number">100</div>
          <div class="rate-label">requests / minute (default)</div>
        </div>

        <div class="code-block" style="margin-top: 20px">
          <div class="code-toolbar">
            <span class="code-lang">json</span>
          </div>
          <pre><code
              >{`{
  "error": "Too many requests",
  "retryAfter": 42
}`}</code
            ></pre>
        </div>
      </section>

      <!-- ERROR CODES -->
      <section id="errors" class="doc-section">
        <h2 class="section-title">Error Codes</h2>
        <p class="section-desc">
          Errors come in two shapes. Route handlers answer with the simple
          envelope; anything that reaches the central error handler returns
          the structured envelope (<code>stack</code> appears in development
          only).
        </p>

        <div class="code-block" style="margin-bottom: 16px">
          <div class="code-toolbar">
            <span class="code-lang">json — simple envelope</span>
          </div>
          <pre><code
              >{`{
  "error": "API key does not have write scope"
}`}</code
            ></pre>
        </div>

        <div class="code-block" style="margin-bottom: 20px">
          <div class="code-toolbar">
            <span class="code-lang">json — structured envelope</span>
          </div>
          <pre><code
              >{`{
  "error": {
    "message": "Unsupported file type: application/zip"
  }
}`}</code
            ></pre>
        </div>

        <div class="table-scroll">
          <table class="ref-table">
            <thead>
              <tr><th>Code</th><th>Label</th><th>Description</th></tr>
            </thead>
            <tbody>
              {#each errorCodes as err}
                <tr>
                  <td>
                    <span class="status-badge {getStatusBadgeClass(err.code)}"
                      >{err.code}</span
                    >
                  </td>
                  <td><strong>{err.label}</strong></td>
                  <td>{err.desc}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>

      <!-- HTTP REFERENCE -->
      <section id="http-reference" class="doc-section">
        <div class="section-eyebrow">reference</div>
        <h2 class="section-title">HTTP API Reference</h2>
        <p class="section-desc">
          All endpoints documented below. Authenticate file and search
          operations with your API key in the <code>X-Api-Key</code> header (a
          <code>Bearer</code> JWT works too). Base URL defaults to
          <code>http://localhost:3000/api/v1</code> — replace
          with whatever host you deployed Kyro on.
        </p>
        <div class="code-block">
          <div class="code-toolbar">
            <span class="code-lang">http</span>
            <button
              class="copy-btn"
              onclick={() =>
                copy("X-Api-Key: kyro_live_your_key_here", "http-auth")}
            >
              {copiedId === "http-auth" ? "✓ copied" : "copy"}
            </button>
          </div>
          <pre><code>X-Api-Key: kyro_live_your_key_here</code></pre>
        </div>
      </section>

      <!-- ── ENDPOINT SECTIONS ── -->
      {#each allTags as tag}
        <section id={tag.id} class="doc-section tag-section">
          <div class="tag-header">
            <h2 class="section-title">{tag.label}</h2>
            <span class="endpoint-count">
              {tag.endpoints.length} endpoint{tag.endpoints.length !== 1
                ? "s"
                : ""}
            </span>
          </div>
          <p class="section-desc">
            {(openapiSpec as any).tags?.find(
              (t: { name: string; description?: string }) =>
                t.name === tag.label,
            )?.description ?? ""}
          </p>
        </section>

        {#each tag.endpoints as ep}
          {@const authType = getAuthType(ep.op)}
          {@const scope = getScopeRequired(ep.op)}
          {@const bodySchema = parseRequestBody(ep.op)}
          {@const pathParams =
            ep.op.parameters?.filter((p) => p.in === "path") ?? []}
          {@const queryParams =
            ep.op.parameters?.filter((p) => p.in === "query") ?? []}
          {@const responses = Object.entries(ep.op.responses || {})}
          {@const responseExample = formatResponseExample(
            ep.op["x-response-example"],
          )}
          {@const curlSnippet = generateCurl(ep)}
          {@const fetchSnippet = generateFetch(ep)}
          {@const tabKey = getTab(ep.id)}

          <section id={ep.id} class="endpoint-section">
            <div class="ep-header">
              <div class="ep-title-row">
                <span class="method-badge method-{ep.method.toLowerCase()}"
                  >{ep.method}</span
                >
                <code class="ep-path">{ep.path}</code>
                <span class="ep-summary">{ep.op.summary ?? ""}</span>
              </div>
              <div class="ep-badges">
                {#if authType === "bearer"}
                  <span class="auth-badge auth-bearer">Bearer JWT</span>
                {:else if authType === "apiKey"}
                  <span class="auth-badge auth-apikey">X-Api-Key</span>
                {:else}
                  <span class="auth-badge auth-none">No auth</span>
                {/if}
                {#if scope}
                  <span class="scope-tag scope-inline">scope: {scope}</span>
                {/if}
              </div>
            </div>

            <div class="ep-body">
              <div class="ep-left">
                {#if pathParams.length > 0}
                  <div class="ep-block">
                    <h4 class="block-title">Path Parameters</h4>
                    <div class="table-scroll">
                      <table class="param-table">
                        <thead>
                          <tr
                            ><th>Name</th><th>Type</th><th>Required</th><th
                              >Description</th
                            ></tr
                          >
                        </thead>
                        <tbody>
                          {#each pathParams as p}
                            <tr>
                              <td><code>{p.name}</code></td>
                              <td
                                ><span class="type-tag"
                                  >{p.schema?.format ??
                                    p.schema?.type ??
                                    "string"}</span
                                ></td
                              >
                              <td>{p.required ? "✓" : "—"}</td>
                              <td>{p.description ?? ""}</td>
                            </tr>
                          {/each}
                        </tbody>
                      </table>
                    </div>
                  </div>
                {/if}

                {#if queryParams.length > 0}
                  <div class="ep-block">
                    <h4 class="block-title">Query Parameters</h4>
                    <div class="table-scroll">
                      <table class="param-table">
                        <thead>
                          <tr
                            ><th>Name</th><th>Type</th><th>Required</th><th
                              >Description</th
                            ></tr
                          >
                        </thead>
                        <tbody>
                          {#each queryParams as p}
                            <tr>
                              <td><code>{p.name}</code></td>
                              <td
                                ><span class="type-tag"
                                  >{p.schema?.format ??
                                    p.schema?.type ??
                                    "string"}</span
                                ></td
                              >
                              <td>{p.required ? "✓" : "—"}</td>
                              <td>{p.description ?? ""}</td>
                            </tr>
                          {/each}
                        </tbody>
                      </table>
                    </div>
                  </div>
                {/if}

                {#if bodySchema}
                  <div class="ep-block">
                    <h4 class="block-title">
                      Request Body
                      <span class="content-type-tag"
                        >{bodySchema.contentType}</span
                      >
                    </h4>
                    <div class="table-scroll">
                      <table class="param-table">
                        <thead>
                          <tr
                            ><th>Field</th><th>Type</th><th>Required</th><th
                              >Description</th
                            ></tr
                          >
                        </thead>
                        <tbody>
                          {#each bodySchema.fields as field}
                            <tr>
                              <td>
                                <code>{field.name}</code>
                                {#if field.default !== undefined}
                                  <span class="default-tag"
                                    >default: {JSON.stringify(
                                      field.default,
                                    )}</span
                                  >
                                {/if}
                              </td>
                              <td>
                                <span class="type-tag">{field.type}</span>
                                {#if field.enum}
                                  <div class="enum-list">
                                    {#each field.enum as val}
                                      <span class="enum-val">{val}</span>
                                    {/each}
                                  </div>
                                {/if}
                              </td>
                              <td class={field.required ? "req-yes" : ""}
                                >{field.required ? "✓" : "—"}</td
                              >
                              <td>{field.description}</td>
                            </tr>
                          {/each}
                        </tbody>
                      </table>
                    </div>
                  </div>
                {/if}

                <div class="ep-block">
                  <h4 class="block-title">Response Codes</h4>
                  <div class="response-codes">
                    {#each responses as [code, resp]}
                      <div class="response-code-row">
                        <span class="status-badge {getStatusBadgeClass(code)}"
                          >{code}</span
                        >
                        <span class="response-desc"
                          >{getStatusLabel(code, resp.description)}</span
                        >
                      </div>
                    {/each}
                  </div>
                </div>
              </div>

              <div class="ep-right">
                <div class="code-card">
                  <div class="code-card-header">
                    <span class="code-card-label">Request</span>
                    <div class="tab-group">
                      <button
                        class="tab-btn"
                        class:active={tabKey === "curl"}
                        onclick={() => setTab(ep.id, "curl")}>curl</button
                      >
                      <button
                        class="tab-btn"
                        class:active={tabKey === "fetch"}
                        onclick={() => setTab(ep.id, "fetch")}>fetch</button
                      >
                    </div>
                    <button
                      class="copy-btn"
                      onclick={() =>
                        copy(
                          tabKey === "curl" ? curlSnippet : fetchSnippet,
                          `req-${ep.id}`,
                        )}
                    >
                      {copiedId === `req-${ep.id}` ? "✓ copied" : "copy"}
                    </button>
                  </div>
                  <div class="code-body">
                    {#if tabKey === "curl"}
                      <pre><code>{curlSnippet}</code></pre>
                    {:else}
                      <pre><code>{fetchSnippet}</code></pre>
                    {/if}
                  </div>
                </div>

                {#if responseExample}
                  <div class="code-card">
                    <div class="code-card-header">
                      <span class="code-card-label">Response</span>
                      <span class="status-badge status-2xx">200</span>
                      <button
                        class="copy-btn"
                        onclick={() => copy(responseExample, `res-${ep.id}`)}
                      >
                        {copiedId === `res-${ep.id}` ? "✓ copied" : "copy"}
                      </button>
                    </div>
                    <div class="code-body">
                      <pre><code>{responseExample}</code></pre>
                    </div>
                  </div>
                {/if}
              </div>
            </div>
          </section>
        {/each}
      {/each}
    </main>
  </div>
</div>

<style>
  *,
  *::before,
  *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :root {
    --bg: #080808;
    --bg2: #0f0f0f;
    --bg3: #151515;
    --bg4: #1c1c1c;
    --bg5: #242424;
    --border: rgba(255, 255, 255, 0.06);
    --border2: rgba(255, 255, 255, 0.1);
    --border3: rgba(255, 255, 255, 0.16);
    --text: #eeebe4;
    --text-dim: #b8b4ac;
    --text-muted: #7a7670;
    --text-ghost: #3d3b38;
    --green: #3dd68c;
    --green-dim: rgba(61, 214, 140, 0.1);
    --blue: #5b9cf6;
    --blue-dim: rgba(91, 156, 246, 0.1);
    --amber: #f5a623;
    --amber-dim: rgba(245, 166, 35, 0.1);
    --red: #f26b6b;
    --red-dim: rgba(242, 107, 107, 0.1);
    --radius: 6px;
    --radius-sm: 3px;
    --font-mono: "JetBrains Mono", "Fira Code", "SF Mono", monospace;

    --content-pad-lg: 56px;
    --content-pad-md: 32px;
    --content-pad-sm: 20px;
    --content-pad-xs: 16px;
  }

  .page {
    font-family: var(--font-mono);
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    font-size: 13px;
    line-height: 1.6;
  }

  .topbar {
    position: sticky;
    top: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 50px;
    padding: 0 24px;
    background: rgba(8, 8, 8, 0.95);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .topbar-nav a {
    font-size: 12px;
    color: var(--text-muted);
    text-decoration: none;
    transition: color 0.12s;
    display: flex; /* add */
    align-items: center; /* add */
    gap: 5px; /* add */
  }

  .topbar-left {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    text-decoration: none;
    flex-shrink: 0;
  }

  .topbar-divider {
    color: var(--text-ghost);
    font-size: 16px;
    flex-shrink: 0;
  }

  .topbar-label {
    font-size: 12px;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .hamburger {
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 4px;
    border-radius: var(--radius-sm);
    flex-shrink: 0;
    transition:
      color 0.1s,
      background 0.1s;
  }
  .hamburger:hover {
    color: var(--text);
    background: var(--bg3);
  }

  .topbar-nav {
    display: flex;
    align-items: center;
    gap: 20px;
    flex-shrink: 0;
  }

  .topbar-nav a {
    font-size: 12px;
    color: var(--text-muted);
    text-decoration: none;
    transition: color 0.12s;
  }
  .topbar-nav a:hover {
    color: var(--text);
  }

  .layout {
    display: flex;
    max-width: 1440px;
    margin: 0 auto;
    min-height: calc(100vh - 50px);
    position: relative;
  }

  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    z-index: 199;
  }

  .sidebar {
    width: 224px;
    flex-shrink: 0;
    position: sticky;
    top: 50px;
    height: calc(100vh - 50px);
    overflow-y: auto;
    border-right: 1px solid var(--border);
    background: var(--bg);
    scrollbar-width: none;
    transform: translateX(-100%);
    position: fixed;
    top: 50px;
    left: 0;
    height: calc(100vh - 50px);
    z-index: 200;
    transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .sidebar::-webkit-scrollbar {
    display: none;
  }

  .sidebar.open {
    transform: translateX(0);
  }

  .sidebar-inner {
    padding: 16px 0 40px;
  }

  .sidebar-close-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 8px;
  }

  .sidebar-heading {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .sidebar-close {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 12px;
    padding: 2px 4px;
    border-radius: var(--radius-sm);
    transition: color 0.1s;
  }
  .sidebar-close:hover {
    color: var(--text);
  }

  .sidebar-group {
    margin-bottom: 6px;
    padding: 0 10px;
  }

  .sidebar-group-label {
    display: block;
    font-size: 10px;
    font-weight: 700;
    color: var(--text-ghost);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    padding: 10px 6px 4px;
  }

  .sidebar-link {
    display: block;
    font-size: 12px;
    color: var(--text-muted);
    text-decoration: none;
    padding: 5px 8px;
    border-radius: var(--radius-sm);
    border-left: 2px solid transparent;
    transition: all 0.1s;
  }
  .sidebar-link:hover {
    color: var(--text-dim);
    background: var(--bg2);
  }
  .sidebar-link.active {
    color: var(--text);
    background: var(--bg3);
    border-left-color: var(--text-dim);
  }

  .sidebar-endpoint {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 11px;
    color: var(--text-muted);
    text-decoration: none;
    padding: 4px 8px;
    border-radius: var(--radius-sm);
    border-left: 2px solid transparent;
    transition: all 0.1s;
    overflow: hidden;
  }
  .sidebar-endpoint:hover {
    color: var(--text-dim);
    background: var(--bg2);
  }
  .sidebar-endpoint.active {
    color: var(--text);
    background: var(--bg3);
    border-left-color: var(--text-dim);
  }

  .sidebar-method {
    font-size: 9px;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 2px;
    text-transform: uppercase;
    flex-shrink: 0;
    letter-spacing: 0.03em;
  }

  .sidebar-path {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 11px;
  }

  .content {
    flex: 1;
    min-width: 0;
    padding-bottom: 80px;
  }

  .doc-section {
    padding: 48px var(--content-pad-lg);
    border-bottom: 1px solid var(--border);
    scroll-margin-top: 70px;
  }

  .section-eyebrow {
    font-size: 10px;
    font-weight: 700;
    color: var(--green);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 10px;
  }

  .section-hero {
    font-size: 32px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.025em;
    margin-bottom: 10px;
    line-height: 1.15;
  }

  .section-lead {
    font-size: 13px;
    color: var(--text-muted);
    max-width: 560px;
    line-height: 1.75;
    margin-bottom: 28px;
  }

  .section-title {
    font-size: 20px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.02em;
    margin-bottom: 8px;
    line-height: 1.2;
  }

  .section-desc {
    font-size: 12px;
    color: var(--text-muted);
    line-height: 1.75;
    max-width: 640px;
    margin-bottom: 24px;
  }

  .section-desc strong {
    color: var(--text-dim);
  }
  .section-desc code {
    font-family: var(--font-mono);
    font-size: 11px;
    background: var(--bg3);
    padding: 1px 5px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border2);
    color: var(--text-dim);
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 8px;
    margin-bottom: 20px;
  }

  .info-card {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    overflow-wrap: anywhere;
  }

  .info-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-ghost);
  }

  .info-value {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-dim);
    background: none;
    border: none;
    padding: 0;
    overflow-wrap: anywhere;
    word-break: break-all;
  }

  .spec-download {
    margin-top: 4px;
  }

  .spec-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--blue);
    text-decoration: none;
    padding: 6px 10px;
    border: 1px solid rgba(91, 156, 246, 0.2);
    border-radius: var(--radius-sm);
    background: var(--blue-dim);
    transition: border-color 0.12s;
  }
  .spec-link:hover {
    border-color: rgba(91, 156, 246, 0.4);
  }

  .rate-card {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 20px;
    padding: 20px 24px;
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    width: fit-content;
  }

  .rate-number {
    font-size: 44px;
    font-weight: 700;
    color: var(--green);
    letter-spacing: -0.04em;
    line-height: 1;
  }

  .rate-label {
    font-size: 13px;
    color: var(--text-muted);
  }

  .table-scroll {
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    border-radius: var(--radius-sm);
  }

  .ref-table,
  .param-table {
    width: 100%;
    min-width: 400px;
    border-collapse: collapse;
    font-size: 12px;
  }

  .ref-table th,
  .ref-table td,
  .param-table th,
  .param-table td {
    text-align: left;
    padding: 8px 12px;
    border: 1px solid var(--border);
    white-space: nowrap;
  }

  .ref-table td:last-child,
  .param-table td:last-child {
    white-space: normal;
    min-width: 120px;
  }

  .ref-table th,
  .param-table th {
    background: var(--bg2);
    color: var(--text-muted);
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .ref-table td,
  .param-table td {
    background: var(--bg);
    color: var(--text-dim);
    vertical-align: top;
  }

  .param-table code {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text);
    background: none;
  }

  .ref-table code {
    font-family: var(--font-mono);
    font-size: 11px;
    background: var(--bg3);
    padding: 1px 5px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border2);
    color: var(--text-dim);
  }

  .ref-table strong {
    color: var(--text-dim);
    font-weight: 500;
  }

  .steps {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .step {
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }

  .step-num {
    font-size: 10px;
    font-weight: 700;
    color: var(--green);
    background: var(--green-dim);
    border: 1px solid rgba(61, 214, 140, 0.2);
    width: 32px;
    height: 32px;
    border-radius: var(--radius);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .step-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .step-body h4 {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
  }

  .sdk-methods {
    display: flex;
    flex-direction: column;
    gap: 28px;
  }

  .sdk-method {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .sdk-method-header {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .sdk-method-name {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text);
    background: var(--bg3);
    border: 1px solid var(--border2);
    padding: 3px 10px;
    border-radius: var(--radius-sm);
    white-space: normal;
    word-break: break-all;
  }

  .tag-section {
    padding-bottom: 20px;
  }

  .tag-header {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 6px;
    flex-wrap: wrap;
  }

  .endpoint-count {
    font-size: 10px;
    color: var(--text-ghost);
    background: var(--bg3);
    border: 1px solid var(--border);
    padding: 2px 7px;
    border-radius: 99px;
  }

  .endpoint-section {
    border-bottom: 1px solid var(--border);
    scroll-margin-top: 70px;
  }

  .ep-header {
    padding: 20px var(--content-pad-lg) 16px;
    background: var(--bg2);
    border-bottom: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .ep-title-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .ep-path {
    font-family: var(--font-mono);
    font-size: 14px;
    color: var(--text);
    background: none;
    word-break: break-all;
  }

  .ep-summary {
    font-size: 12px;
    color: var(--text-muted);
  }

  .ep-badges {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .ep-body {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    align-items: start;
  }

  .ep-left {
    padding: 24px var(--content-pad-md) 32px var(--content-pad-lg);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 24px;
    min-width: 0;
  }

  .ep-right {
    padding: 24px var(--content-pad-lg) 32px var(--content-pad-md);
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;
    position: sticky;
    top: 50px;
    max-height: calc(100vh - 50px);
    overflow-y: auto;
    scrollbar-width: none;
  }
  .ep-right::-webkit-scrollbar {
    display: none;
  }

  .ep-block {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .block-title {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-ghost);
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .content-type-tag {
    font-size: 9px;
    font-weight: 600;
    background: var(--bg4);
    color: var(--text-muted);
    border: 1px solid var(--border2);
    padding: 1px 6px;
    border-radius: 3px;
    text-transform: none;
    letter-spacing: 0;
  }

  .type-tag {
    font-size: 10px;
    color: var(--blue);
    background: var(--blue-dim);
    border: 1px solid rgba(91, 156, 246, 0.15);
    padding: 1px 6px;
    border-radius: 3px;
    font-family: var(--font-mono);
    white-space: nowrap;
  }

  .enum-list {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    margin-top: 4px;
  }

  .enum-val {
    font-size: 9px;
    color: var(--text-ghost);
    background: var(--bg4);
    border: 1px solid var(--border);
    padding: 1px 5px;
    border-radius: 2px;
  }

  .default-tag {
    display: block;
    font-size: 9px;
    color: var(--text-ghost);
    margin-top: 2px;
  }

  .req-yes {
    color: var(--green);
  }

  .response-codes {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .response-code-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .response-desc {
    font-size: 12px;
    color: var(--text-muted);
  }

  .code-card {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }

  .code-card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: var(--bg3);
    border-bottom: 1px solid var(--border);
    flex-wrap: wrap;
  }

  .code-card-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-ghost);
    flex: 1;
    min-width: 40px;
  }

  .tab-group {
    display: flex;
    gap: 2px;
    background: var(--bg4);
    padding: 2px;
    border-radius: 4px;
  }

  .tab-btn {
    font-family: var(--font-mono);
    font-size: 10px;
    padding: 3px 9px;
    background: transparent;
    border: none;
    border-radius: 3px;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.1s;
  }
  .tab-btn:hover {
    color: var(--text-dim);
  }
  .tab-btn.active {
    background: var(--bg);
    color: var(--text);
  }

  .code-body {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
    scrollbar-color: var(--bg5) transparent;
  }

  .code-body pre {
    margin: 0;
    padding: 14px 16px;
    font-family: var(--font-mono);
    font-size: 11px;
    line-height: 1.7;
    color: var(--text-dim);
    white-space: pre;
    background: transparent;
    border: none;
    border-radius: 0;
  }

  .code-body code {
    background: none;
    border: none;
    padding: 0;
  }

  .code-block {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }

  .code-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 12px;
    background: var(--bg3);
    border-bottom: 1px solid var(--border);
    flex-wrap: wrap;
  }

  .code-lang {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-ghost);
    flex: 1;
  }

  .code-block pre {
    margin: 0;
    padding: 14px 16px;
    font-family: var(--font-mono);
    font-size: 11px;
    line-height: 1.7;
    color: var(--text-dim);
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    background: transparent;
    border: none;
  }

  .code-block code {
    background: none;
    border: none;
    padding: 0;
  }

  .copy-btn {
    font-family: var(--font-mono);
    font-size: 10px;
    padding: 3px 8px;
    background: var(--bg4);
    border: 1px solid var(--border2);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.1s;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .copy-btn:hover {
    color: var(--text);
    border-color: var(--border3);
  }

  .method-badge {
    display: inline-flex;
    align-items: center;
    padding: 3px 9px;
    border-radius: 3px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    flex-shrink: 0;
  }

  .method-get {
    background: var(--green-dim);
    color: var(--green);
  }
  .method-post {
    background: var(--blue-dim);
    color: var(--blue);
  }
  .method-delete {
    background: var(--red-dim);
    color: var(--red);
  }
  .method-put {
    background: var(--amber-dim);
    color: var(--amber);
  }
  .method-patch {
    background: var(--amber-dim);
    color: var(--amber);
  }

  .auth-badge {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 3px;
    border: 1px solid;
    white-space: nowrap;
  }

  .auth-bearer {
    background: var(--blue-dim);
    color: var(--blue);
    border-color: rgba(91, 156, 246, 0.2);
  }
  .auth-apikey {
    background: var(--green-dim);
    color: var(--green);
    border-color: rgba(61, 214, 140, 0.2);
  }
  .auth-none {
    background: var(--bg3);
    color: var(--text-ghost);
    border-color: var(--border);
  }

  .scope-tag {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 7px;
    border-radius: 3px;
    white-space: nowrap;
  }

  .scope-inline {
    background: var(--bg4);
    color: var(--text-muted);
    border: 1px solid var(--border2);
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 3px;
    min-width: 38px;
    justify-content: center;
    flex-shrink: 0;
  }

  .status-2xx {
    background: var(--green-dim);
    color: var(--green);
  }
  .status-4xx {
    background: var(--amber-dim);
    color: var(--amber);
  }
  .status-5xx {
    background: var(--red-dim);
    color: var(--red);
  }

  .ck {
    color: var(--green);
  }
  .cs {
    color: var(--amber);
  }
  .c-comment {
    color: var(--text-ghost);
    font-style: italic;
  }

  /* ── Access methods grid ── */
  .access-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-top: 24px;
  }

  .access-card {
    padding: 24px 22px;
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    display: flex;
    flex-direction: column;
    gap: 10px;
    transition: border-color 0.15s;
  }

  .access-card:hover {
    border-color: var(--border2);
  }

  .access-card-featured {
    border-color: rgba(61, 214, 140, 0.2);
  }

  .access-card-featured:hover {
    border-color: rgba(61, 214, 140, 0.4);
  }

  .access-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .access-num {
    font-size: 10px;
    font-weight: 700;
    color: var(--green);
    letter-spacing: 0.06em;
  }

  .access-badge {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 2px 7px;
    border-radius: 3px;
    background: var(--bg4);
    color: var(--text-ghost);
    border: 1px solid var(--border);
  }

  .access-badge-green {
    background: var(--green-dim);
    color: var(--green);
    border-color: rgba(61, 214, 140, 0.2);
  }

  .access-title {
    font-size: 14px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.01em;
  }

  .access-desc {
    font-size: 12px;
    color: var(--text-muted);
    line-height: 1.7;
    flex: 1;
  }

  .access-desc code {
    font-size: 11px;
    background: var(--bg3);
    padding: 1px 5px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border2);
    color: var(--text-dim);
  }

  .access-link {
    font-size: 11px;
    color: var(--green);
    text-decoration: none;
    font-weight: 600;
    transition: opacity 0.1s;
  }

  .access-link:hover {
    opacity: 0.7;
  }

  /* ── Callout box ── */
  .callout {
    display: flex;
    gap: 12px;
    padding: 14px 16px;
    border-radius: var(--radius);
    font-size: 12px;
    line-height: 1.7;
  }

  .callout-info {
    background: var(--blue-dim);
    border: 1px solid rgba(91, 156, 246, 0.2);
    color: var(--text-muted);
  }

  .callout strong {
    color: var(--text-dim);
    display: block;
    margin-bottom: 4px;
    font-weight: 600;
  }

  .callout-icon {
    font-size: 13px;
    color: var(--blue);
    flex-shrink: 0;
    margin-top: 1px;
  }

  /* ── SDK method list ── */
  .sdk-method-list {
    display: flex;
    flex-direction: column;
    gap: 32px;
  }

  .sdk-entry {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-bottom: 32px;
    border-bottom: 1px solid var(--border);
  }

  .sdk-entry:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .sdk-entry-header {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .sdk-sig {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text);
    background: var(--bg3);
    border: 1px solid var(--border2);
    padding: 4px 12px;
    border-radius: var(--radius-sm);
    word-break: break-all;
  }

  .sdk-entry-desc {
    font-size: 12px;
    color: var(--text-muted);
    line-height: 1.7;
    max-width: 640px;
  }

  .sdk-entry-desc code {
    font-family: var(--font-mono);
    font-size: 11px;
    background: var(--bg3);
    padding: 1px 5px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border2);
    color: var(--text-dim);
  }

  .sdk-subheading {
    font-size: 14px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.01em;
    margin-bottom: 8px;
  }

  @media (max-width: 860px) {
    .access-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (min-width: 900px) {
    .sidebar {
      position: sticky;
      top: 50px;
      height: calc(100vh - 50px);
      transform: none !important;
      z-index: auto;
    }

    .sidebar-close-row {
      display: none;
    }
    .hamburger {
      display: none;
    }
  }

  @media (max-width: 1100px) {
    .ep-body {
      grid-template-columns: 1fr;
    }

    .ep-left {
      border-right: none;
      border-bottom: 1px solid var(--border);
      padding: 24px var(--content-pad-md);
    }

    .ep-right {
      position: static;
      max-height: none;
      padding: 24px var(--content-pad-md) 32px;
    }

    .ep-header {
      padding: 20px var(--content-pad-md) 16px;
    }

    .doc-section {
      padding: 40px var(--content-pad-md);
    }
  }

  @media (max-width: 640px) {
    .topbar {
      padding: 0 var(--content-pad-xs);
    }

    .topbar-label {
      display: none;
    }

    .doc-section {
      padding: 28px var(--content-pad-xs);
    }

    .ep-header {
      padding: 14px var(--content-pad-xs) 10px;
    }

    .ep-left,
    .ep-right {
      padding: var(--content-pad-xs);
    }

    .section-hero {
      font-size: 24px;
    }

    .info-grid {
      grid-template-columns: 1fr;
    }

    .rate-card {
      width: 100%;
    }

    .step {
      flex-direction: column;
      gap: 10px;
    }

    .sdk-method-header {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
