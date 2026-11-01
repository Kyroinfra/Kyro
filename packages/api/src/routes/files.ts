import { Router, type Response } from 'express';
import { db } from '../db';
import { files } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { requireScope, resolveUserId, type AuthedRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { deleteFile, getFilePath } from '../lib/storage';
import { SUPPORTED_MIME_TYPES_LIST } from '../lib/extractors';
import { runPipeline } from '../lib/pipeline';
import fs from 'fs';
import { z } from 'zod';
import { createFileUpload } from '../services/files';

const router = Router();

// ── POST / — upload a file ────────────────────────────────────────────────────

router.post(
  '/',
  requireScope('write'),
  upload.single('file'),
  async (req: AuthedRequest, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    // Works for both credentials: session JWTs attribute directly, API keys
    // attribute to the key's owning user.
    const userId = await resolveUserId(req);

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const fileRecord = await createFileUpload(req.orgId!, userId, req.file);

    res.status(201).json(fileRecord);
  },
);

// ── GET / — list files ────────────────────────────────────────────────────────

router.get('/', requireScope('read'), async (req: AuthedRequest, res: Response) => {
  const orgId  = req.orgId!;
  const limit  = Math.min(parseInt((req.query.limit as string) || '100', 10), 100);
  const cursor = req.query.cursor as string | undefined;

  let cursorCondition = sql`TRUE`;
  if (cursor) {
    try {
      const { createdAt, id } = JSON.parse(Buffer.from(cursor, 'base64url').toString());
      cursorCondition = sql`(${files.createdAt}, ${files.id}) < (${new Date(createdAt)}, ${id}::uuid)`;
    } catch {
      res.status(400).json({ error: 'Invalid cursor' });
      return;
    }
  }

  const result = await db
    .select({
      id:        files.id,
      name:      files.name,
      mimeType:  files.mimeType,
      sizeBytes: files.sizeBytes,
      createdAt: files.createdAt,
      status:    files.status,
    })
    .from(files)
    .where(and(eq(files.orgId, orgId), cursorCondition))
    .orderBy(sql`${files.createdAt} DESC, ${files.id} DESC`)
    .limit(limit + 1);

  const hasMore = result.length > limit;
  const items   = hasMore ? result.slice(0, limit) : result;

  // Rows already carry files.status — no derived heuristics (#33).
  const data = items;

  const nextCursor = hasMore
    ? Buffer.from(
        JSON.stringify({
          createdAt: items[items.length - 1].createdAt,
          id:        items[items.length - 1].id,
        }),
      ).toString('base64url')
    : null;

  res.json({ data, pagination: { limit, hasMore, nextCursor } });
});

// ── GET /:id/text ─────────────────────────────────────────────────────────────
// IMPORTANT: /:id/text, /:id/metadata*, /:id/reprocess and /:id/embed must all
// be registered BEFORE /:id, otherwise Express matches /:id first.

router.get('/:id/text', requireScope('read'), async (req: AuthedRequest, res: Response) => {
  const orgId = req.orgId!;
  const id    = req.params.id as string;

  const [file] = await db
    .select({
      id:            files.id,
      extractedText: files.extractedText,
      status:        files.status,
      error:         files.error,
    })
    .from(files)
    .where(and(eq(files.id, id), eq(files.orgId, orgId)));

  if (!file) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  res.json({
    fileId:        file.id,
    status:        file.status,
    extractedText: file.extractedText,
    ...(file.status === 'failed' && { error: file.error }),
  });
});

// ── POST /:id/reprocess ───────────────────────────────────────────────────────
// Re-runs the whole pipeline (extract → embed) for an already-uploaded file.
// A real re-run (#33): resets status to 'pending', clears the old error and
// fires the pipeline again — there is no separate extract/embed step anymore.

router.post('/:id/reprocess', requireScope('write'), async (req: AuthedRequest, res: Response) => {
  const orgId = req.orgId!;
  const id    = req.params.id as string;

  const [file] = await db
    .select({
      id:         files.id,
      storageKey: files.storageKey,
      mimeType:   files.mimeType,
      status:     files.status,
    })
    .from(files)
    .where(and(eq(files.id, id), eq(files.orgId, orgId)));

  if (!file) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  if (!SUPPORTED_MIME_TYPES_LIST.includes(file.mimeType ?? '')) {
    res.status(400).json({
      error:          'File type not supported for extraction',
      supportedTypes: SUPPORTED_MIME_TYPES_LIST,
    });
    return;
  }

  if (file.status === 'pending' || file.status === 'processing') {
    res.status(409).json({ error: 'Pipeline already in progress', status: file.status });
    return;
  }

  // Reset: back to 'pending', old failure message gone, pipeline re-fires.
  await db
    .update(files)
    .set({ status: 'pending', error: null })
    .where(eq(files.id, file.id));

  runPipeline({
    fileId:     file.id,
    storageKey: file.storageKey,
    mimeType:   file.mimeType ?? '',
    orgId,
  });

  res.status(202).json({
    fileId:  file.id,
    status:  'pending',
    message: 'Reprocessing queued. Poll GET /files/:id/text for status.',
  });
});

// ── GET /:id/metadata ─────────────────────────────────────────────────────────
// Metadata is the file's own jsonb column (#38) — read it straight through.

router.get('/:id/metadata', requireScope('read'), async (req: AuthedRequest, res: Response) => {
  const orgId = req.orgId!;
  const id    = req.params.id as string;

  // Verify ownership and select the column in the same round-trip
  const [row] = await db
    .select({ metadata: files.metadata })
    .from(files)
    .where(and(eq(files.id, id), eq(files.orgId, orgId)));

  if (!row) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  // Always a flat object (the column is NOT NULL DEFAULT '{}'::jsonb)
  res.json(row.metadata);
});

// ── PUT /:id/metadata ─────────────────────────────────────────────────────────
// Upserts metadata keys. Non-destructive: keys not present in the body are
// left untouched (jsonb `||` merge — the new keys win, existing keys not in
// the body keep their values). Send { "key": null } via DELETE to remove.

router.put('/:id/metadata', requireScope('write'), async (req: AuthedRequest, res: Response) => {
  const orgId = req.orgId!;
  const id    = req.params.id as string;

  const parsed = z.record(z.string(), z.string()).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Body must be a flat key/value object of strings' });
    return;
  }

  const [file] = await db
    .select({ id: files.id })
    .from(files)
    .where(and(eq(files.id, id), eq(files.orgId, orgId)));

  if (!file) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  const entries = Object.entries(parsed.data);
  if (entries.length === 0) {
    res.json({});
    return;
  }

  // `metadata || $1::jsonb` is the whole upsert: one bound JSON parameter
  // (values may contain quotes/backslashes — binding does the work, the
  // cast keeps the driver from guessing a column type).
  await db
    .update(files)
    .set({
      // Drizzle spreads the parameterized JSON as $n — `||` merges on top of
      // the existing object (right side wins per key).
      metadata: sql`${files.metadata} || ${JSON.stringify(parsed.data)}::jsonb`,
    })
    .where(and(eq(files.id, id), eq(files.orgId, orgId)));

  res.json(parsed.data);
});

// ── DELETE /:id/metadata/:key ─────────────────────────────────────────────────
// jsonb `-` (text) removes one key at a time; a missing key is a no-op.

router.delete('/:id/metadata/:key', requireScope('write'), async (req: AuthedRequest, res: Response) => {
  const orgId = req.orgId!;
  const { id, key } = req.params as { id: string; key: string };

  // Verify ownership
  const [file] = await db
    .select({ id: files.id })
    .from(files)
    .where(and(eq(files.id, id), eq(files.orgId, orgId)));

  if (!file) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  await db
    .update(files)
    .set({
      // key is bound as a parameter (`metadata - $1`)
      metadata: sql`${files.metadata} - ${key}`,
    })
    .where(and(eq(files.id, id), eq(files.orgId, orgId)));

  res.status(204).send();
});

// ── POST /:id/embed ───────────────────────────────────────────────────────────
// Removed (#33): there is one pipeline and one status. POST /:id/reprocess
// re-runs extract → embed as a single flow.

// ── GET /:id ──────────────────────────────────────────────────────────────────

router.get('/:id', requireScope('read'), async (req: AuthedRequest, res: Response) => {
  const orgId = req.orgId!;
  const id    = req.params.id as string;

  const [file] = await db
    .select({
      id:        files.id,
      name:      files.name,
      storageKey: files.storageKey,
      mimeType:  files.mimeType,
      sizeBytes: files.sizeBytes,
    })
    .from(files)
    .where(and(eq(files.id, id), eq(files.orgId, orgId)));

  if (!file) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  const filePath = getFilePath(file.storageKey);

  if (!fs.existsSync(filePath)) {
    console.error(`File record ${id} exists in DB but not on disk: ${filePath}`);
    res.status(404).json({ error: 'File data not found' });
    return;
  }

  res.setHeader('Content-Type', file.mimeType ?? 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
  res.setHeader('Content-Length', file.sizeBytes);

  fs.createReadStream(filePath).pipe(res);
});

// ── DELETE /:id ───────────────────────────────────────────────────────────────

router.delete('/:id', requireScope('write'), async (req: AuthedRequest, res: Response) => {
  const orgId = req.orgId!;
  const id    = req.params.id as string;

  const [file] = await db
    .select({ id: files.id, storageKey: files.storageKey })
    .from(files)
    .where(and(eq(files.id, id), eq(files.orgId, orgId)));

  if (!file) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  // Hard delete (#34): one delete removes the row; the ON DELETE CASCADE FKs
  // on file_chunks / file_metadata / collection_files remove its children,
  // and the physical blob goes too. Nothing lingers under a deleted_at flag.
  await db.delete(files).where(eq(files.id, file.id));
  await deleteFile(file.storageKey);

  res.json({ message: 'File deleted', id });
});

export default router;
