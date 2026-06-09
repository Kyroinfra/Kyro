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
// NOTE on ANY() binding:
// Drizzle's sql`` tag binds array values as scalar parameters, which causes
// Postgres to reject ANY(($N)::text[]) when $N arrives as a plain string.
// The fix is to inline the array as a literal ARRAY['v1','v2'] directly in
// the SQL string rather than binding it as a parameter. Values are sanitised
// by escaping single quotes (doubling them) before inlining — the standard
// SQL escaping approach. Keys are always bound as parameters.
// ─────────────────────────────────────────────────────────────────────────────

import pool from '../db';

/**
 * Returns the IDs of all non-deleted files in `orgId` that match every
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

  // $1 is always orgId. Keys are bound as subsequent parameters so they are
  // never interpolated into the SQL string. Values are inlined as ARRAY
  // literals because pg's wire protocol does not have a native array binding
  // that works with ANY() when the client sends a plain string scalar.
  const params: unknown[] = [orgId];

  const existsClauses = entries.map(([key, val]) => {
    const values = Array.isArray(val) ? val : [val];

    // Escape single quotes in each value by doubling them — this is the
    // standard SQL string literal escaping rule and is safe here because
    // the value is always wrapped in single quotes in the ARRAY literal.
    const arrayLiteral = `ARRAY[${
      values.map(v => `'${String(v).replace(/'/g, "''")}'`).join(', ')
    }]`;

    // Bind the key as a parameter — never interpolate user-supplied key names.
    params.push(key);
    const P_KEY = params.length;

    return `EXISTS (
      SELECT 1
      FROM   file_metadata fm
      WHERE  fm.file_id = f.id
        AND  fm.org_id  = $1
        AND  fm.key     = $${P_KEY}
        AND  fm.value   = ANY(${arrayLiteral})
    )`;
  });

  const querySql = `
    SELECT f.id
    FROM   files f
    WHERE  f.org_id     = $1
      AND  f.deleted_at IS NULL
      AND  ${existsClauses.join('\n      AND  ')}
  `;

  const result = await pool.query<{ id: string }>(querySql, params);
  return result.rows.map(r => r.id);
}
