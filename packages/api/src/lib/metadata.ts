// lib/metadata.ts
// ─────────────────────────────────────────────────────────────────────────────
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
// ─────────────────────────────────────────────────────────────────────────────

import { db } from '../db';
import { files, fileMetadata } from '../db/schema';
import { eq, isNull, and, sql, SQL } from 'drizzle-orm';

/**
 * Returns the IDs of all non-deleted files in `orgId` that match every
 * entry in `filters`.
 *
 * @param orgId   The org to scope the search to.
 * @param filters A flat object where each value is either a single string
 *                (exact match) or an array of strings (OR match).
 *                An empty object returns all non-deleted files in the org.
 */
export async function resolveMetadataFilter(
  orgId:   string,
  filters: Record<string, string | string[]>,
): Promise<string[]> {
  const entries = Object.entries(filters);

  // Build one EXISTS clause per key. Multiple values for one key become
  // ANY($values::text[]) which the DB resolves as an OR.
  const existsClauses: SQL[] = entries.map(([key, val]) => {
    const values = Array.isArray(val) ? val : [val];
    return sql`EXISTS (
      SELECT 1
      FROM file_metadata fm
      WHERE fm.file_id = ${files.id}
        AND fm.org_id  = ${orgId}
        AND fm.key     = ${key}
        AND fm.value   = ANY(${values}::text[])
    )`;
  });

  const rows = await db
    .select({ id: files.id })
    .from(files)
    .where(
      and(
        eq(files.orgId, orgId),
        isNull(files.deletedAt),
        // Spread all EXISTS clauses — Drizzle's `and()` accepts rest args
        ...existsClauses,
      ),
    );

  return rows.map(r => r.id);
}
