// lib/metadata.ts
// ────────────────────────────────────────────────────────────────────────────
// Resolves a metadata filter map to a list of file IDs that match ALL of the
// given key-value conditions (AND across keys, OR across multiple values for
// the same key).
//
// Example:
//   { matter_number: "M-2024-001", document_type: ["contract", "amendment"] }
//
// Translates to:
//   Files that have matter_number = "M-2024-001"
//   AND (document_type = "contract" OR document_type = "amendment")
//
// Each key becomes a correlated EXISTS sub-select, which Postgres can satisfy
// using the idx_file_metadata_org_key_value covering index.
//
// Fully Drizzle: keys and values are bound as parameters (inArray generates a
// param list — the old hand-rolled `ARRAY['...']` literal + quote-escaping
// hack is gone). Slated for deletion in #38 anyway, which moves metadata to a
// jsonb column on files.
// ────────────────────────────────────────────────────────────────────────────

import { db } from '../db';
import { files, fileMetadata } from '../db/schema';
import { eq, and, exists, inArray, sql, type SQL } from 'drizzle-orm';

/**
 * Returns the IDs of all files in `orgId` that match every
 * entry in `filters`.
 *
 * @param orgId   The org to scope the search to.
 * @param filters A flat object where each value is either a single string
 *                (exact match) or an array of strings (OR match).
 *                An empty object — caller receives [] and should skip filtering.
 */
export async function resolveMetadataFilter(
  orgId:   string,
  filters: Record<string, string | string[]>,
): Promise<string[]> {
  const entries = Object.entries(filters);

  if (entries.length === 0) {
    return [];
  }

  // One EXISTS per key — ANDed at the top level; multiple values per key are
  // matched with an IN list (values are bound as parameters, never inlined).
  const keyConditions: SQL[] = entries.map(([key, val]) => {
    const values = Array.isArray(val) ? val : [val];

    return exists(
      db
        .select({ one: sql`1` })
        .from(fileMetadata)
        .where(
          and(
            eq(fileMetadata.fileId, files.id),
            eq(fileMetadata.orgId, orgId),
            eq(fileMetadata.key, key),
            inArray(fileMetadata.value, values),
          ),
        ),
    );
  });

  const rows = await db
    .select({ id: files.id })
    .from(files)
    .where(and(eq(files.orgId, orgId), ...keyConditions));

  return rows.map(r => r.id);
}
