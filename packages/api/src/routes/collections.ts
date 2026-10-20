// routes/v2/collections.ts

import { Router, type Response } from 'express';
import { db } from '../db';
import { collections, collectionFiles, files } from '../db/schema';
import { eq, and, isNull, inArray, sql, desc } from 'drizzle-orm';
import { requireScope, resolveUserId, type AuthedRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

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

async function uniqueSlug(orgId: string, base: string, _excludeId?: string): Promise<string> {
  const existing = await db
    .select({ slug: collections.slug })
    .from(collections)
    .where(eq(collections.orgId, orgId));

  const taken = new Set(existing.map(r => r.slug));
  let slug = base;
  let i = 2;
  while (taken.has(slug)) {slug = `${base}-${i++}`;}
  return slug;
}


// ── GET / — list collections ──────────────────────────────────────────────────

router.get('/', requireScope('read'), async (req: AuthedRequest, res: Response) => {
  const orgId = req.orgId!;

  const rows = await db
    .select({
      id:            collections.id,
      name:          collections.name,
      description:   collections.description,
      slug:          collections.slug,
      createdAt:     collections.createdAt,
      updatedAt:     collections.updatedAt,
      fileCount:     sql<number>`COUNT(${collectionFiles.fileId})::int`.mapWith(Number),
      embeddedCount: sql<number>`COUNT(CASE WHEN ${files.embeddingStatus} = 'completed' THEN 1 END)::int`.mapWith(Number),
      pendingCount:  sql<number>`COUNT(CASE WHEN ${files.embeddingStatus} = 'pending' THEN 1 END)::int`.mapWith(Number),
      failedCount:   sql<number>`COUNT(CASE WHEN ${files.embeddingStatus} = 'failed' THEN 1 END)::int`.mapWith(Number),
    })
    .from(collections)
    .leftJoin(collectionFiles, eq(collectionFiles.collectionId, collections.id))
    .leftJoin(files, and(eq(files.id, collectionFiles.fileId), isNull(files.deletedAt)))
    .where(eq(collections.orgId, orgId))
    .groupBy(collections.id)
    .orderBy(desc(collections.createdAt));

  res.json(rows);
});

// ── POST / — create collection ────────────────────────────────────────────────

router.post('/', requireScope('write'), async (req: AuthedRequest, res: Response) => {
  const orgId = req.orgId!;

  const parsed = createCollectionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
    return;
  }

  const userId = await resolveUserId(req);

  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
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
});

// ── GET /:id — get collection with status summary ─────────────────────────────

router.get('/:id', requireScope('read'), async (req: AuthedRequest, res: Response) => {
  const orgId = req.orgId!;
  const id = req.params.id as string;

  const [row] = await db
    .select({
      id:           collections.id,
      name:         collections.name,
      description:  collections.description,
      slug:         collections.slug,
      createdAt:    collections.createdAt,
      updatedAt:    collections.updatedAt,
      fileCount:    sql<number>`COUNT(${collectionFiles.fileId})::int`.mapWith(Number),
      embeddedCount: sql<number>`COUNT(CASE WHEN ${files.embeddingStatus} = 'completed' THEN 1 END)::int`.mapWith(Number),
      pendingCount:  sql<number>`COUNT(CASE WHEN ${files.embeddingStatus} = 'pending' THEN 1 END)::int`.mapWith(Number),
      failedCount:   sql<number>`COUNT(CASE WHEN ${files.embeddingStatus} = 'failed' THEN 1 END)::int`.mapWith(Number),
      skippedCount:  sql<number>`COUNT(CASE WHEN ${files.embeddingStatus} = 'skipped' THEN 1 END)::int`.mapWith(Number),
      queryReady: sql<boolean>`
        COUNT(${collectionFiles.fileId}) > 0 AND
        COUNT(CASE WHEN ${files.embeddingStatus} IN ('pending', 'embedding', 'failed') THEN 1 END) = 0
      `.mapWith(Boolean),
    })
    .from(collections)
    .leftJoin(collectionFiles, eq(collectionFiles.collectionId, collections.id))
    .leftJoin(files, and(eq(files.id, collectionFiles.fileId), isNull(files.deletedAt)))
    .where(and(eq(collections.id, id), eq(collections.orgId, orgId)))
    .groupBy(collections.id);

  if (!row) {
    res.status(404).json({ error: 'Collection not found' });
    return;
  }

  res.json(row);
});

// ── PATCH /:id — update collection ───────────────────────────────────────────

router.patch('/:id', requireScope('write'), async (req: AuthedRequest, res: Response) => {
  const orgId = req.orgId!;
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
});

// ── DELETE /:id ───────────────────────────────────────────────────────────────

router.delete('/:id', requireScope('write'), async (req: AuthedRequest, res: Response) => {
  const orgId = req.orgId!;
  const id = req.params.id as string;

  const [deleted] = await db
    .delete(collections)
    .where(and(eq(collections.id, id), eq(collections.orgId, orgId)))
    .returning({ id: collections.id });

  if (!deleted) {
    res.status(404).json({ error: 'Collection not found' });
    return;
  }

  res.status(204).send();
});

// ── GET /:id/files ────────────────────────────────────────────────────────────

router.get('/:id/files', requireScope('read'), async (req: AuthedRequest, res: Response) => {
  const orgId = req.orgId!;
  const id = req.params.id as string;

  const [collection] = await db
    .select({ id: collections.id })
    .from(collections)
    .where(and(eq(collections.id, id), eq(collections.orgId, orgId)));

  if (!collection) {
    res.status(404).json({ error: 'Collection not found' });
    return;
  }

  const limit  = Math.min(parseInt(req.query.limit  as string || '100', 10), 100);
  const offset = Math.max(parseInt(req.query.offset as string || '0',   10), 0);

  const [filesRow, [countRow]] = await Promise.all([
    db
      .select({
        id:              files.id,
        name:            files.name,
        mimeType:        files.mimeType,
        sizeBytes:       files.sizeBytes,
        embeddingStatus: files.embeddingStatus,
        createdAt:       files.createdAt,
        addedAt:         collectionFiles.addedAt,
      })
      .from(collectionFiles)
      .innerJoin(files, eq(files.id, collectionFiles.fileId))
      .where(and(eq(collectionFiles.collectionId, id), isNull(files.deletedAt)))
      .orderBy(desc(collectionFiles.addedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: sql<number>`COUNT(*)::int`.mapWith(Number) })
      .from(collectionFiles)
      .innerJoin(files, eq(files.id, collectionFiles.fileId))
      .where(and(eq(collectionFiles.collectionId, id), isNull(files.deletedAt))),
  ]);

  const total = countRow?.total ?? 0;

  res.json({
    data: filesRow,
    pagination: { total, limit, offset, hasMore: offset + filesRow.length < total },
  });
});

// ── POST /:id/files ───────────────────────────────────────────────────────────

router.post('/:id/files', requireScope('write'), async (req: AuthedRequest, res: Response) => {
  const orgId  = req.orgId!;
  const id     = req.params.id as string;

  const parsed = addFilesSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
    return;
  }

  const [collection] = await db
    .select({ id: collections.id })
    .from(collections)
    .where(and(eq(collections.id, id), eq(collections.orgId, orgId)));

  if (!collection) {
    res.status(404).json({ error: 'Collection not found' });
    return;
  }

  const ownedFiles = await db
    .select({ id: files.id })
    .from(files)
    .where(and(eq(files.orgId, orgId), inArray(files.id, parsed.data.fileIds), isNull(files.deletedAt)));

  const ownedIds = new Set(ownedFiles.map(f => f.id));
  const unowned  = parsed.data.fileIds.filter(fid => !ownedIds.has(fid));

  if (unowned.length > 0) {
    res.status(400).json({
      error: 'Some files not found or do not belong to your organisation',
      invalidFileIds: unowned,
    });
    return;
  }

  const userId = await resolveUserId(req);

  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  await db
    .insert(collectionFiles)
    .values(parsed.data.fileIds.map(fileId => ({ collectionId: id, fileId, addedBy: userId })))
    .onConflictDoNothing();

  await db
    .update(collections)
    .set({ updatedAt: new Date() })
    .where(eq(collections.id, id));

  res.status(200).json({ added: ownedIds.size, collectionId: id });
});

// ── DELETE /:id/files/:fileId ─────────────────────────────────────────────────

router.delete('/:id/files/:fileId', requireScope('write'), async (req: AuthedRequest, res: Response) => {
  const orgId              = req.orgId!;
  const { id, fileId } = req.params as { id: string; fileId: string };

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
    .where(and(eq(collectionFiles.collectionId, id), eq(collectionFiles.fileId, fileId)))
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
});

export default router;
