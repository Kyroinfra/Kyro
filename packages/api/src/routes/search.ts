// routes/search.ts — GET /search (hybrid retrieval, chunk-level)
//
// Replaces the v2 endpoints GET /files/semantic-search and GET /files/search:
// rrfSearch() already fuses the full-text arm (ts_rank over chunk text) with
// the dense vector arm, so this chunk-level endpoint subsumes both; the
// file-level ts_rank + ts_headline route was deleted with #28 (semantics
// per #34).
//
// No client-side score threshold (#35): ?min_score on an RRF scale whose
// maximum is ~0.033 was opaque to consumers, and the vector arm's distance
// threshold (config) already bounds noise. RRF score reference:
//   ~0.016  chunk ranked #1 in one arm only   (1 / (60+1))
//   ~0.008  chunk ranked #60 in one arm only  (1 / (60+60))
//   ~0.032  chunk ranked #1 in BOTH arms      (two contributions)
//
// Scope handling is the one resolver shared with /ask (#37): uniform status
// codes (404 unknown collection / no owned file ids, 422 empty collection /
// no filter match / empty intersection), client file_ids narrowed to org-
// owned files, and metadata filters intersecting the rest. collection_id and
// file_ids stay mutually exclusive (client-side convenience distinction, not
// a scope rule the resolver needs).

import { Router, type Response } from 'express';
import { requireScope, type AuthedRequest } from '../middleware/auth';
import { hybridSearch } from '../rag/retrieve';
import { resolveScope, isScopeError } from '../rag/scope';
import { z } from 'zod';

const router = Router();

// Metadata filters ride one query param as a URL-encoded JSON object with the
// same shape POST /ask accepts in its body:
//   ?filters=%7B%22document_type%22%3A%5B%22contract%22%2C%22amendment%22%5D%7D
const filtersSchema = z.record(z.string(), z.union([z.string(), z.array(z.string())]));

// ── GET / — hybrid search across chunks ──────────────────────────────────────

router.get('/', requireScope('read'), async (req: AuthedRequest, res: Response) => {
  const orgId = req.orgId!;
  const q     = (req.query.q as string | undefined)?.trim();

  if (!q) {
    res.status(400).json({ error: 'Query parameter "q" is required' });
    return;
  }

  const limit = Math.min(parseInt((req.query.limit as string) || '10', 10), 50);

  const hasCollectionId = !!req.query.collection_id;
  const hasFileIds      = !!req.query.file_ids;

  if (hasCollectionId && hasFileIds) {
    res.status(400).json({ error: 'Provide either collection_id or file_ids, not both' });
    return;
  }

  const fileIds = hasFileIds
    ? (req.query.file_ids as string).split(',').map(s => s.trim()).filter(Boolean)
    : undefined;

  // ── Metadata filters (?filters=<URL-encoded JSON>, optional) ───────────
  let filters: Record<string, string | string[]> | undefined;
  const rawFilters = req.query.filters as string | undefined;

  if (rawFilters !== undefined && rawFilters.length > 0) {
    try {
      const parsed = filtersSchema.safeParse(JSON.parse(rawFilters));
      if (!parsed.success) {
        res.status(400).json({ error: 'filters must be a JSON object of string or string[] values' });
        return;
      }
      filters = parsed.data;
    } catch {
      res.status(400).json({ error: 'filters must be a URL-encoded JSON object' });
      return;
    }
  }

  // ── Scope: the one resolver (#37) ──────────────────────────────────────
  // `fileIds: undefined` means org-wide; every scope failure answers with
  // the same status/message /ask would give for the same input. Empty
  // filter lists (e.g. `?file_ids=,,`) stay org-wide — as before #37.
  const scope = await resolveScope(orgId, {
    collectionId: hasCollectionId ? (req.query.collection_id as string) : undefined,
    fileIds:      fileIds && fileIds.length > 0 ? fileIds : undefined,
    filters,
  });

  if (isScopeError(scope)) {
    res.status(scope.status).json({ error: scope.error });
    return;
  }

  // ── Run hybrid retrieval ───────────────────────────────────────────────
  const results = await hybridSearch({
    orgId,
    query:   q,
    fileIds: scope.fileIds,
    limit,
  });

  res.json({
    data:  results,
    query: q,
    limit,
  });
});

export default router;
