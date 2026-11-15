  // The single canonical OpenAPI spec lives at packages/api/openapi.yaml
  // (main). This object is the docs-site projection of that file, authored
  // to match it field-for-field (order, tags, paths, scopes, examples).
  // When a route changes, update the yaml and this object in the same PR.
  export const openapiSpec = {
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
      {
        name: "Auth",
        description:
          "Registration, login, session introspection and setup status.",
      },
      {
        name: "Organisation",
        description:
          "Workspace profile and member management (owner/admin actions).",
      },
      {
        name: "API Keys",
        description: "Org-scoped API keys and their scopes.",
      },
      {
        name: "Usage",
        description: "Aggregate and per-day request/byte metrics.",
      },
      {
        name: "Webhooks",
        description: "HTTP webhook subscriptions for file pipeline events.",
      },
      {
        name: "Files",
        description: "Upload, download, delete, text, reprocess and metadata.",
      },
      {
        name: "Collections",
        description: "Named groups of files queried as a unit.",
      },
      {
        name: "Search",
        description: "Hybrid (keyword + embedding) search with RRF scoring.",
      },
      {
        name: "Ask",
        description: "RAG question answering with SSE streaming.",
      },
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
            "201": {
              description: "Organisation and owner created; JWT issued.",
            },
            "400": {
              description: "Invalid input or email already registered.",
            },
            "403": {
              description: "Signup locked after the first organisation.",
            },
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
            "500": {
              description: "Database outage, reported as unconfigured.",
            },
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
          description:
            "Requires the owner role; members join by email + password.",
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
            "403": {
              description:
                "Owners are irremovable; admins cannot remove admins.",
            },
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
            "200": {
              description:
                "The org's keys; the secret value is never returned here.",
            },
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
            "201": {
              description: "Key created; key is the only copy of the secret.",
            },
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
            "404": {
              description: "Key unknown for the org or already revoked.",
            },
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
          description:
            "Defaults to the trailing 30 days when dates are omitted.",
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
                'Opaque cursor from pagination.nextCursor of the previous page (base64url of {"createdAt","id"}).',
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
            'Extractable types (PDF, DOC/DOCX, TXT) start the pipeline immediately: pending → processing → ready (or failed). CSV and JSON are stored without extraction (status "skipped"); any other type is rejected with 415. The deployment-wide storage cap answers 507.',
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
                        'PDF, DOCX and TXT are extracted; CSV and JSON are stored as "skipped"; other types are rejected with 415.',
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
            "403": {
              description: "Not write-scoped (`Required scope: write`).",
            },
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
            "404": {
              description: "Unknown file, or the bytes are missing on disk.",
            },
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
            "200": {
              description: "Extraction state and (where present) the text.",
            },
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
            "400": {
              description:
                "Type with nothing to reprocess; supportedTypes lists accepted MIMEs.",
            },
            "401": { description: "Missing or invalid credentials." },
            "403": { description: "Not write-scoped." },
            "404": { description: "File not found." },
            "409": {
              description:
                "Pipeline already in progress; body carries the current status.",
            },
          },
          "x-response-example": JSON.stringify({
            fileId: "f_1",
            status: "pending",
            message:
              "Reprocessing queued. Poll GET /files/:id/text for status.",
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
            "400": {
              description: "Body is not a flat object of string values.",
            },
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
          description:
            "A missing key is a no-op; only an unknown file is an error.",
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
            "403": { description: "Not write-scoped." },
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
            "403": { description: "Not write-scoped." },
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
            "200": {
              description: "Files in the collection, newest added first.",
            },
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
          description:
            "Adds an org-owned set of files; duplicates are ignored.",
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
            "403": { description: "Not write-scoped." },
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
            "403": { description: "Not write-scoped." },
            "404": {
              description: "Collection unknown, or the file is not a member.",
            },
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
              description:
                "Restrict to one collection's embedded files (mutually exclusive with file_ids).",
              schema: { type: "string", format: "uuid" },
            },
            {
              name: "file_ids",
              in: "query",
              required: false,
              description:
                "Comma-separated org file UUIDs to scope to (mutually exclusive with collection_id).",
              schema: { type: "string" },
            },
            {
              name: "filters",
              in: "query",
              required: false,
              description:
                "URL-encoded JSON object of metadata filters (string or string[] values).",
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": { description: "Ranked chunks for the query." },
            "400": {
              description:
                "Missing q, both scopes given, or malformed filters.",
            },
            "401": { description: "Missing or invalid credentials." },
            "403": { description: "Not read-scoped." },
            "404": {
              description:
                "Unknown collection or no owned files among file_ids.",
            },
            "422": {
              description:
                "Empty collection, no filter match, or empty intersection.",
            },
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
                      description:
                        "Scope to specific files (mutually exclusive with collectionId).",
                    },
                    collectionId: {
                      type: "string",
                      format: "uuid",
                      description:
                        "Scope to one collection (mutually exclusive with fileIds).",
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
                      description:
                        "Chat model override; defaults to the deployment's configured model.",
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
                          content: {
                            type: "string",
                            minLength: 1,
                            maxLength: 2000,
                          },
                        },
                      },
                      description:
                        "Prior user/assistant turns for multi-turn conversations.",
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
            "403": { description: "Not read-scoped." },
            "404": {
              description:
                "Unknown collection or no owned files among file_ids.",
            },
            "422": {
              description:
                "Empty collection, no filter match, or empty intersection.",
            },
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
