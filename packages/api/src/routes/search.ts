// routes/search.ts — GET /search (hybrid retrieval, chunk-level)
//
// Replaces the v2 endpoints GET /files/semantic-search and GET /files/search:
// rrfSearch() already fuses the lexical arm (ts_rank over chunk text) with the
// dense vector arm, so this chunk-level endpoint subsumes both; the file-level
// ts_rank + ts_headline route was deleted with #28 (semantics per #34).
//
// min_score defaults to 0.01 — enough to filter chunks that appear in neither
// retrieval arm while still returning anything with a genuine signal.
// RRF score reference:
//   ~0.016  chunk ranked #1 in one arm only   (1 / (60+1))
//   ~0.008  chunk ranked #60 in one arm only  (1 / (60+60))
//   ~0.032  chunk ranked #1 in BOTH arms      (two contributions)
// Consumers can pass ?min_score=0 to disable filtering entirely.

import { Router, type Response } from 'express';
import { db } from '../db';
import { collections, collectionFiles } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { requireScope, type AuthedRequest } from '../middleware/auth';
import { hybridSearch } from '../lib/retrieval';

const router = Router();

// ── Shared helper: resolve a collection to its file IDs ──────────────────────

export async function resolveCollectionToFileIds(
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

// ── GET / — hybrid search across chunks ──────────────────────────────────────

router.get('/', requireScope('read'), async (req: AuthedRequest, res: Response) => {
  const orgId = req.orgId!;
  const q     = (req.query.q as string | undefined)?.trim();

  if (!q) {
    res.status(400).json({ error: 'Query parameter "q" is required' });
    return;
  }

  const limit    = Math.min(parseInt((req.query.limit as string) || '10', 10), 50);
  // Default 0.01 filters noise; pass ?min_score=0 to get all results
  const minScore = parseFloat((req.query.min_score as string) || '0.01');

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
    query:       q,
    fileIds:     fileIdFilter,
    limit,
    minRrfScore: minScore,
  });

  res.json({
    data:     results,
    query:    q,
    limit,
    minScore, // expose so consumers know what threshold was applied
  });
});

export default router;
