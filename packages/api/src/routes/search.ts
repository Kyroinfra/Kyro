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

import { Router, type Response } from 'express';
import { requireScope, type AuthedRequest } from '../middleware/auth';
import { hybridSearch } from '../rag/retrieve';
import { resolveCollectionToFileIds } from '../rag/scope';

const router = Router();

// ── GET / — hybrid search across chunks ──────────────────────────────────────

router.get('/', requireScope('read'), async (req: AuthedRequest, res: Response) => {
  const orgId = req.orgId!;
  const q     = (req.query.q as string | undefined)?.trim();

  if (!q) {
    res.status(400).json({ error: 'Query parameter "q" is required' });
    return;
  }

  const limit = Math.min(parseInt((req.query.limit as string) || '10', 10), 50);

  // ── Resolve file ID filter ─────────────────────────────────────────────
  const hasCollectionId = !!req.query.collection_id;
  const hasFileIds      = !!req.query.file_ids;

  if (hasCollectionId && hasFileIds) {
    res.status(400).json({ error: 'Provide either collection_id or file_ids, not both' });
    return;
  }

  let fileIdFilter: string[] | undefined;

  if (hasCollectionId) {
    const ids = await resolveCollectionToFileIds(req.query.collection_id as string, orgId);
    if (ids === null) {
      res.status(400).json({ error: 'Collection not found' });
      return;
    }
    if (ids.length === 0) {
      res.status(400).json({ error: 'Collection has no files' });
      return;
    }
    fileIdFilter = ids;
  } else if (hasFileIds) {
    const ids = (req.query.file_ids as string)
      .split(',').map(s => s.trim()).filter(Boolean);
    fileIdFilter = ids.length > 0 ? ids : undefined;
  }

  // ── Run hybrid retrieval ───────────────────────────────────────────────
  const results = await hybridSearch({
    orgId,
    query:   q,
    fileIds: fileIdFilter,
    limit,
  });

  res.json({
    data:  results,
    query: q,
    limit,
  });
});

export default router;
