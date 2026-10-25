// rag/scope.ts — what files does this query see? (#37)
//
// resolveScope() is THE one scope resolver for /search and /ask. It
// intersects every provided constraint (collection membership, explicit
// client file ids, metadata filters) and returns a uniform result shape, so
// the two routes answer identical scope failures with identical status
// codes.
//
// Why it exists (the #37 bug): /ask used to resolve filters, then the
// collectionId/fileIds branches UNCONDITIONALLY overwrote the filter result
// — combined `filters` + `collectionId` silently ignored the filters. One
// resolver, one intersect, one error table; the routes cannot drift again.
//
// Wire contract (both routes reply with exactly these):
//   404  collection not found  ·  no owned files for the client fileIds
//   422  collection empty  ·  no files match the metadata filters  ·
//        the intersection of all provided constraints is empty
//
// { fileIds: undefined } means "org-wide" — the retrieval layer (rag/
// retrieve.ts) enforces org isolation, files.status = 'ready' and embedded
// chunk availability itself, so the caller never needs pre-count queries.

import { db } from '../db';
import { collections, collectionFiles, fileMetadata, files } from '../db/schema';
import { and, eq, exists, inArray, sql, type SQL } from 'drizzle-orm';

export interface ScopeOptions {
  collectionId?: string;
  fileIds?:      string[];
  filters?:      Record<string, string | string[]>;
}

export interface ScopeResult {
  /** File ids the query may see. undefined = org-wide search. */
  fileIds?: string[];
}

export interface ScopeError {
  status: number;
  error:  string;
}

export function isScopeError(r: ScopeResult | ScopeError): r is ScopeError {
  return typeof (r as ScopeError).status === 'number';
}

// ── Metadata filters (absorbed from lib/metadata.ts, deleted) ────────────────
//
// Matches a flat filter map against the file_metadata EAV tables (AND across
// keys, OR across multiple values for one key):
//   { matter_number: "M-2024-001", document_type: ["contract", "amendment"] }
//
// Each key becomes a correlated EXISTS sub-select, which Postgres satisfies
// using the idx_file_metadata_org_key_value covering index. Keys and values
// are bound as parameters — never inlined. #38 replaces this EAV storage
// with jsonb on files; until then this is the single filtering implementation.

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

// ── Single-member resolvers ──────────────────────────────────────────────────

async function collectionFileIds(
  collectionId: string,
  orgId:        string,
): Promise<string[] | null> {
  const [col] = await db
    .select({ id: collections.id })
    .from(collections)
    .where(and(eq(collections.id, collectionId), eq(collections.orgId, orgId)));

  if (!col) {return null;}

  const rows = await db
    .select({ fileId: collectionFiles.fileId })
    .from(collectionFiles)
    .where(eq(collectionFiles.collectionId, collectionId));

  return rows.map(r => r.fileId);
}

/** Client-supplied ids can only ever narrow the org's OWN files. */
async function ownedFileIds(orgId: string, ids: string[]): Promise<string[]> {
  const rows = await db
    .select({ id: files.id })
    .from(files)
    .where(and(eq(files.orgId, orgId), inArray(files.id, ids)));

  return rows.map(r => r.id);
}

// ── The resolver ─────────────────────────────────────────────────────────────

/**
 * Resolves the query scope by intersecting every provided constraint.
 *
 * Returns `{ fileIds: undefined }` (org-wide) when no constraint is given.
 * Client fileIds that the org does not own are silently narrowed (never
 * leaked) — if NOT ONE of the provided ids is owned, the call rejects with
 * 404 instead of searching the whole org by accident.
 */
export async function resolveScope(
  orgId: string,
  opts:  ScopeOptions,
): Promise<ScopeResult | ScopeError> {
  const constraints: string[][] = [];

  // ── Metadata filters ───────────────────────────────────────────────────
  if (opts.filters && Object.keys(opts.filters).length > 0) {
    const filtered = await resolveMetadataFilter(orgId, opts.filters);

    if (filtered.length === 0) {
      return {
        status: 422,
        error:  'No files match the provided metadata filters',
      };
    }
    constraints.push(filtered);
  }

  // ── Collection membership ──────────────────────────────────────────────
  if (opts.collectionId) {
    const colIds = await collectionFileIds(opts.collectionId, orgId);

    if (colIds === null) {
      return { status: 404, error: 'Collection not found' };
    }
    if (colIds.length === 0) {
      return { status: 422, error: 'Collection has no files' };
    }
    constraints.push(colIds);
  }

  // ── Client file ids ────────────────────────────────────────────────────
  // An explicitly-listed but foreign/nonexistent id must never turn the query
  // into an unrestricted org-wide search: narrow to what is owned, and if
  // nothing is owned reject instead.
  if (opts.fileIds && opts.fileIds.length > 0) {
    const owned = await ownedFileIds(orgId, opts.fileIds);

    if (owned.length === 0) {
      return { status: 404, error: 'No matching files found' };
    }
    constraints.push(owned);
  }

  if (constraints.length === 0) {
    return { fileIds: undefined };   // org-wide
  }
  if (constraints.length === 1) {
    return { fileIds: constraints[0] };
  }

  // Intersect every constraint (in place — subsequent sets shrink against the
  // first one without touching the callers' arrays).
  const intersected = constraints.reduce<string[]>(
    (acc, cur) => acc.filter(id => cur.includes(id)),
    constraints[0],
  );

  if (intersected.length === 0) {
    return {
      status: 422,
      error:  'No files match the provided scope filters',
    };
  }

  return { fileIds: intersected };
}
