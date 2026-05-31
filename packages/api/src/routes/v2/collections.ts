// routes/v2/collections.ts
// Mount at: v2Router.use('/collections', authMiddleware, collectionsRouter)
// Note: collection management uses JWT auth (owner of the collection),
//       not API key auth. The /ask and /semantic-search endpoints use
//       collectionId as a filter — those remain API-key authenticated.

import { Router, Request, Response } from 'express';
import { db } from '../../db';
import { collections, collectionFiles, files } from '../../db/schema';
import { eq, and, sql, count } from 'drizzle-orm';
import { authMiddleware } from '../../middleware/auth';
import { z } from 'zod';

const router = Router();

// All collection management requires JWT auth
router.use(authMiddleware);

// ── Validation ─────────────────────────────────────────────────────────────────

const createCollectionSchema = z.object({
  name:        z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
});

const updateCollectionSchema = createCollectionSchema.partial();

const addFilesSchema = z.object({
  fileIds: z.array(z.string().uuid()).min(1).max(100),
});

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

async function uniqueSlug(orgId: string, base: string, excludeId?: string): Promise<string> {
  const existing = await db
    .select({ slug: collections.slug })
    .from(collections)
    .where(eq(collections.orgId, orgId));

  const taken = new Set(existing.filter(r => r.slug !== undefined ? r : null).map(r => r.slug));
  let slug = base;
  let i = 2;
  while (taken.has(slug)) slug = `${base}-${i++}`;
  return slug;
}

// ── GET / — list collections ───────────────────────────────────────────────────

router.get('/', async (req: Request, res: Response) => {
  try {
    const orgId = req.user!.orgId;

    // Return collections with a file count and embedding readiness summary
    const rows = await db.execute(sql`
      SELECT
        c.id,
        c.name,
        c.description,
        c.slug,
        c.created_at   AS "createdAt",
        c.updated_at   AS "updatedAt",
        COUNT(cf.file_id)::int                                          AS "fileCount",
        COUNT(CASE WHEN f.embedding_status = 'completed' THEN 1 END)::int AS "embeddedCount",
        COUNT(CASE WHEN f.embedding_status = 'pending'   THEN 1 END)::int AS "pendingCount",
        COUNT(CASE WHEN f.embedding_status = 'failed'    THEN 1 END)::int AS "failedCount"
      FROM collections c
      LEFT JOIN collection_files cf ON cf.collection_id = c.id
      LEFT JOIN files f ON f.id = cf.file_id AND f.deleted_at IS NULL
      WHERE c.org_id = ${orgId}
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);

    res.json(rows.rows);
  } catch (error) {
    console.error('Error listing collections:', error);
    res.status(500).json({ error: 'Failed to list collections' });
  }
});

// ── POST / — create collection ─────────────────────────────────────────────────

router.post('/', async (req: Request, res: Response) => {
  try {
    const orgId = req.user!.orgId;
    const userId = req.user!.userId;

    const parsed = createCollectionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
      return;
    }

    const { name, description } = parsed.data;
    const slug = await uniqueSlug(orgId, toSlug(name));

    const [collection] = await db
      .insert(collections)
      .values({ orgId, createdBy: userId, name, description, slug })
      .returning({
        id:          collections.id,
        name:        collections.name,
        description: collections.description,
        slug:        collections.slug,
        createdAt:   collections.createdAt,
      });

    res.status(201).json(collection);
  } catch (error) {
    console.error('Error creating collection:', error);
    res.status(500).json({ error: 'Failed to create collection' });
  }
});

// ── GET /:id — get collection with status summary ──────────────────────────────

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const orgId = req.user!.orgId;
    const id = req.params.id as string;

    const rows = await db.execute(sql`
      SELECT
        c.id,
        c.name,
        c.description,
        c.slug,
        c.created_at   AS "createdAt",
        c.updated_at   AS "updatedAt",
        COUNT(cf.file_id)::int                                          AS "fileCount",
        COUNT(CASE WHEN f.embedding_status = 'completed' THEN 1 END)::int AS "embeddedCount",
        COUNT(CASE WHEN f.embedding_status = 'pending'   THEN 1 END)::int AS "pendingCount",
        COUNT(CASE WHEN f.embedding_status = 'failed'    THEN 1 END)::int AS "failedCount",
        COUNT(CASE WHEN f.embedding_status = 'skipped'   THEN 1 END)::int AS "skippedCount",
        -- ready = all files with text are embedded (skipped files don't block readiness)
        (
          COUNT(cf.file_id) > 0 AND
          COUNT(CASE WHEN f.embedding_status IN ('pending', 'embedding', 'failed') THEN 1 END) = 0
        ) AS "queryReady"
      FROM collections c
      LEFT JOIN collection_files cf ON cf.collection_id = c.id
      LEFT JOIN files f ON f.id = cf.file_id AND f.deleted_at IS NULL
      WHERE c.id = ${id} AND c.org_id = ${orgId}
      GROUP BY c.id
    `);

    if (rows.rows.length === 0) {
      res.status(404).json({ error: 'Collection not found' });
      return;
    }

    res.json(rows.rows[0]);
  } catch (error) {
    console.error('Error getting collection:', error);
    res.status(500).json({ error: 'Failed to get collection' });
  }
});

// ── PATCH /:id — update collection name/description ───────────────────────────

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const orgId = req.user!.orgId;
    const id = req.params.id as string;

    const parsed = updateCollectionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
      return;
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.name !== undefined) {
      updates.name = parsed.data.name;
      updates.slug = await uniqueSlug(orgId, toSlug(parsed.data.name), id);
    }
    if (parsed.data.description !== undefined) {
      updates.description = parsed.data.description;
    }

    const [updated] = await db
      .update(collections)
      .set(updates)
      .where(and(eq(collections.id, id), eq(collections.orgId, orgId)))
      .returning({
        id:          collections.id,
        name:        collections.name,
        description: collections.description,
        slug:        collections.slug,
        updatedAt:   collections.updatedAt,
      });

    if (!updated) {
      res.status(404).json({ error: 'Collection not found' });
      return;
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating collection:', error);
    res.status(500).json({ error: 'Failed to update collection' });
  }
});

// ── DELETE /:id — delete collection (does NOT delete files) ───────────────────

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const orgId = req.user!.orgId;
    const id = req.params.id as string;

    const [deleted] = await db
      .delete(collections)
      .where(and(eq(collections.id, id), eq(collections.orgId, orgId)))
      .returning({ id: collections.id });

    if (!deleted) {
      res.status(404).json({ error: 'Collection not found' });
      return;
    }

    // collectionFiles rows cascade-delete automatically via FK
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting collection:', error);
    res.status(500).json({ error: 'Failed to delete collection' });
  }
});

// ── GET /:id/files — list files in collection ──────────────────────────────────

router.get('/:id/files', async (req: Request, res: Response) => {
  try {
    const orgId = req.user!.orgId;
    const id = req.params.id as string;

    // Verify collection belongs to org first
    const [collection] = await db
      .select({ id: collections.id })
      .from(collections)
      .where(and(eq(collections.id, id), eq(collections.orgId, orgId)));

    if (!collection) {
      res.status(404).json({ error: 'Collection not found' });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit as string || '100', 10), 100);
    const offset = Math.max(parseInt(req.query.offset as string || '0', 10), 0);

    const rows = await db.execute(sql`
      SELECT
        f.id,
        f.name,
        f.mime_type         AS "mimeType",
        f.size_bytes        AS "sizeBytes",
        f.embedding_status  AS "embeddingStatus",
        f.created_at        AS "createdAt",
        cf.added_at         AS "addedAt"
      FROM collection_files cf
      JOIN files f ON f.id = cf.file_id
      WHERE
        cf.collection_id = ${id}
        AND f.deleted_at IS NULL
      ORDER BY cf.added_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const countResult = await db.execute(sql`
      SELECT COUNT(*)::int AS total
      FROM collection_files cf
      JOIN files f ON f.id = cf.file_id
      WHERE cf.collection_id = ${id} AND f.deleted_at IS NULL
    `);
    const countRow = countResult.rows[0];

    res.json({
      data: rows.rows,
      pagination: {
        total: (countRow as any)?.total ?? 0,
        limit,
        offset,
        hasMore: offset + rows.rows.length < ((countRow as any)?.total ?? 0),
      },
    });
  } catch (error) {
    console.error('Error listing collection files:', error);
    res.status(500).json({ error: 'Failed to list collection files' });
  }
});

// ── POST /:id/files — add files to collection ──────────────────────────────────

router.post('/:id/files', async (req: Request, res: Response) => {
  try {
    const orgId = req.user!.orgId;
    const userId = req.user!.userId;
    const id = req.params.id as string;

    const parsed = addFilesSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
      return;
    }

    // Verify collection ownership
    const [collection] = await db
      .select({ id: collections.id })
      .from(collections)
      .where(and(eq(collections.id, id), eq(collections.orgId, orgId)));

    if (!collection) {
      res.status(404).json({ error: 'Collection not found' });
      return;
    }

    // Verify all files belong to this org and are not deleted
    const ownedFiles = await db
      .select({ id: files.id })
      .from(files)
      .where(
        and(
          eq(files.orgId, orgId),
          sql`${files.id} = ANY(${parsed.data.fileIds}::uuid[])`,
          sql`${files.deletedAt} IS NULL`,
        )
      );

    const ownedIds = new Set(ownedFiles.map(f => f.id));
    const unowned = parsed.data.fileIds.filter(fid => !ownedIds.has(fid));

    if (unowned.length > 0) {
      res.status(400).json({
        error: 'Some files not found or do not belong to your organisation',
        invalidFileIds: unowned,
      });
      return;
    }

    // Insert — ignore conflicts (file already in collection is fine)
    await db
      .insert(collectionFiles)
      .values(
        parsed.data.fileIds.map(fileId => ({
          collectionId: id,
          fileId,
          addedBy: userId,
        }))
      )
      .onConflictDoNothing();

    await db
      .update(collections)
      .set({ updatedAt: new Date() })
      .where(eq(collections.id, id));

    res.status(200).json({ added: ownedIds.size, collectionId: id });
  } catch (error) {
    console.error('Error adding files to collection:', error);
    res.status(500).json({ error: 'Failed to add files to collection' });
  }
});

// ── DELETE /:id/files/:fileId — remove a single file from collection ───────────

router.delete('/:id/files/:fileId', async (req: Request, res: Response) => {
  try {
    const orgId = req.user!.orgId;
    const { id, fileId } = req.params as { id: string; fileId: string };

    // Verify collection ownership
    const [collection] = await db
      .select({ id: collections.id })
      .from(collections)
      .where(and(eq(collections.id, id), eq(collections.orgId, orgId)));

    if (!collection) {
      res.status(404).json({ error: 'Collection not found' });
      return;
    }

    const [removed] = await db
      .delete(collectionFiles)
      .where(
        and(
          eq(collectionFiles.collectionId, id),
          eq(collectionFiles.fileId, fileId),
        )
      )
      .returning({ fileId: collectionFiles.fileId });

    if (!removed) {
      res.status(404).json({ error: 'File not in this collection' });
      return;
    }

    await db
      .update(collections)
      .set({ updatedAt: new Date() })
      .where(eq(collections.id, id));

    res.status(204).send();
  } catch (error) {
    console.error('Error removing file from collection:', error);
    res.status(500).json({ error: 'Failed to remove file from collection' });
  }
});

export default router;
