import { Router, type Response } from 'express';
import { db } from '../db';
import { files, textExtractionJobs, fileMetadata } from '../db/schema';
import { eq, and, isNull, inArray, sql } from 'drizzle-orm';
import { requireScope, resolveUserId, type AuthedRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { saveFile, deleteFile, getFilePath } from '../lib/storage';
import { SUPPORTED_MIME_TYPES_LIST } from '../lib/extractors';
import { runPipeline } from '../lib/pipeline';
import { embedFile } from '../rag/ingest';
import config from '../config';
import fs from 'fs';
import { z } from 'zod';

const router = Router();

const { ragEnabled: RAG_ENABLED } = config;

// ── POST / — upload a file ────────────────────────────────────────────────────

router.post(
  '/',
  requireScope('write'),
  upload.single('file'),
  async (req: AuthedRequest, res: Response) => {
    const orgId = req.orgId!;

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

    // Deployment-wide disk-safety cap from config — not a per-org quota.
    const [storageRow] = await db
      .select({ used: sql`COALESCE(SUM(${files.sizeBytes}), 0)`.mapWith(Number) })
      .from(files)
      .where(isNull(files.deletedAt));
    const usedStorage = storageRow?.used ?? 0;

    if (usedStorage + req.file.size > config.storageLimit) {
      res.status(507).json({
        error:      'Storage limit reached',
        limitBytes: config.storageLimit,
        usedBytes:  usedStorage,
      });
      return;
    }

    const { storageKey } = await saveFile(orgId, {
      originalname: req.file.originalname,
      buffer:       req.file.buffer,
      mimetype:     req.file.mimetype,
      size:         req.file.size,
    });

    const [fileRecord] = await db
      .insert(files)
      .values({
        orgId,
        uploadedBy: userId!,
        name:       req.file.originalname,
        storageKey,
        mimeType:   req.file.mimetype,
        sizeBytes:  req.file.size,
      })
      .returning({
        id:        files.id,
        name:      files.name,
        mimeType:  files.mimeType,
        sizeBytes: files.sizeBytes,
        createdAt: files.createdAt,
      });

    const isExtractable = SUPPORTED_MIME_TYPES_LIST.includes(req.file.mimetype ?? '');

    if (!isExtractable) {
      res.status(201).json({ ...fileRecord, extractionStatus: 'skipped' });
      return;
    }

    const [job] = await db
      .insert(textExtractionJobs)
      .values({ fileId: fileRecord.id, status: 'pending' })
      .returning({ id: textExtractionJobs.id });

    await db
      .update(files)
      .set({ extractionJobId: job.id })
      .where(eq(files.id, fileRecord.id));

    runPipeline({
      fileId:     fileRecord.id,
      storageKey,
      mimeType:   req.file.mimetype ?? '',
      jobId:      job.id,
      orgId,
    });

    res.status(201).json({ ...fileRecord, extractionStatus: 'pending' });
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
      id:              files.id,
      name:            files.name,
      mimeType:        files.mimeType,
      sizeBytes:       files.sizeBytes,
      createdAt:       files.createdAt,
      extractionJobId: files.extractionJobId,
      extractedText:   files.extractedText,
    })
    .from(files)
    .where(and(eq(files.orgId, orgId), isNull(files.deletedAt), cursorCondition))
    .orderBy(sql`${files.createdAt} DESC, ${files.id} DESC`)
    .limit(limit + 1);

  const hasMore = result.length > limit;
  const items   = hasMore ? result.slice(0, limit) : result;

  const jobIds = items.map((f) => f.extractionJobId).filter(Boolean) as string[];

  const jobStatusMap: Record<string, string> = {};
  if (jobIds.length > 0) {
    const jobRows = await db
      .select({ id: textExtractionJobs.id, status: textExtractionJobs.status })
      .from(textExtractionJobs)
      .where(inArray(textExtractionJobs.id, jobIds));
    for (const row of jobRows) {
      jobStatusMap[row.id] = row.status;
    }
  }

  const data = items.map(({ extractionJobId, extractedText, ...f }) => {
    let extractionStatus: string;
    if (extractionJobId) {
      extractionStatus = jobStatusMap[extractionJobId] ?? 'pending';
    } else if (extractedText) {
      extractionStatus = 'completed';
    } else if (SUPPORTED_MIME_TYPES_LIST.includes(f.mimeType ?? '')) {
      extractionStatus = 'failed';
    } else {
      extractionStatus = 'skipped';
    }
    return { ...f, extractionStatus };
  });

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
      id:              files.id,
      mimeType:        files.mimeType,
      extractedText:   files.extractedText,
      extractionJobId: files.extractionJobId,
    })
    .from(files)
    .where(and(eq(files.id, id), eq(files.orgId, orgId), isNull(files.deletedAt)));

  if (!file) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  if (file.extractedText) {
    res.json({ fileId: file.id, extractionStatus: 'completed', extractedText: file.extractedText });
    return;
  }

  if (!file.extractionJobId) {
    const isExtractable = SUPPORTED_MIME_TYPES_LIST.includes(file.mimeType ?? '');
    res.json({
      fileId:          file.id,
      extractionStatus: isExtractable ? 'failed' : 'skipped',
      extractedText:   null,
    });
    return;
  }

  const [job] = await db
    .select({ status: textExtractionJobs.status, error: textExtractionJobs.error })
    .from(textExtractionJobs)
    .where(eq(textExtractionJobs.id, file.extractionJobId));

  res.json({
    fileId:          file.id,
    extractionStatus: job?.status ?? 'pending',
    extractedText:   null,
    ...(job?.status === 'failed' && { error: job.error }),
  });
});

// ── POST /:id/reprocess ───────────────────────────────────────────────────────
// Queues extraction (and the pipeline continues into embedding) again for an
// already-uploaded file. Fine-grained scoping (e.g. embed-only) is #33's job.

router.post('/:id/reprocess', requireScope('write'), async (req: AuthedRequest, res: Response) => {
  const orgId = req.orgId!;
  const id    = req.params.id as string;

  const [file] = await db
    .select({
      id:              files.id,
      storageKey:      files.storageKey,
      mimeType:        files.mimeType,
      extractionJobId: files.extractionJobId,
    })
    .from(files)
    .where(and(eq(files.id, id), eq(files.orgId, orgId), isNull(files.deletedAt)));

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

  if (file.extractionJobId) {
    const [existing] = await db
      .select({ status: textExtractionJobs.status })
      .from(textExtractionJobs)
      .where(eq(textExtractionJobs.id, file.extractionJobId));

    if (existing && ['pending', 'processing'].includes(existing.status)) {
      res.status(409).json({ error: 'Extraction already in progress', extractionStatus: existing.status });
      return;
    }
  }

  const job = await db.transaction(async (tx) => {
    const [newJob] = await tx
      .insert(textExtractionJobs)
      .values({ fileId: file.id, status: 'pending' })
      .onConflictDoUpdate({
        target: textExtractionJobs.fileId,
        set: {
          status:      'pending',
          attempts:    0,
          error:       null,
          startedAt:   null,
          completedAt: null,
          createdAt:   new Date(),
        },
      })
      .returning({ id: textExtractionJobs.id });

    await tx
      .update(files)
      .set({ extractionJobId: newJob.id })
      .where(eq(files.id, file.id));

    return newJob;
  });

  runPipeline({
    fileId:     file.id,
    storageKey: file.storageKey,
    mimeType:   file.mimeType ?? '',
    jobId:      job.id,
    orgId,
  });

  res.status(202).json({
    fileId:           file.id,
    extractionStatus: 'pending',
    message:          'Reprocessing queued. Poll GET /files/:id/text for status.',
  });
});

// ── GET /:id/metadata ─────────────────────────────────────────────────────────

router.get('/:id/metadata', requireScope('read'), async (req: AuthedRequest, res: Response) => {
  const orgId = req.orgId!;
  const id    = req.params.id as string;

  // Verify ownership
  const [file] = await db
    .select({ id: files.id })
    .from(files)
    .where(and(eq(files.id, id), eq(files.orgId, orgId), isNull(files.deletedAt)));

  if (!file) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  const rows = await db
    .select({ key: fileMetadata.key, value: fileMetadata.value })
    .from(fileMetadata)
    .where(and(eq(fileMetadata.fileId, id), eq(fileMetadata.orgId, orgId)));

  // Return as a flat object — easier to work with than an array of pairs
  res.json(Object.fromEntries(rows.map(r => [r.key, r.value])));
});

// ── PUT /:id/metadata ─────────────────────────────────────────────────────────
// Upserts metadata keys. Non-destructive: keys not present in the body are
// left untouched. Send { "key": null } via DELETE /:id/metadata/:key to remove.

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
    .where(and(eq(files.id, id), eq(files.orgId, orgId), isNull(files.deletedAt)));

  if (!file) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  const entries = Object.entries(parsed.data);
  if (entries.length === 0) {
    res.json({});
    return;
  }

  await db
    .insert(fileMetadata)
    .values(
      entries.map(([key, value]) => ({ fileId: id, orgId, key, value })),
    )
    // Drizzle emits `ON CONFLICT (file_id, key)` — Postgres infers the
    // composite uniqueIndex, which is exactly the target we want.
    .onConflictDoUpdate({
      target: [fileMetadata.fileId, fileMetadata.key],
      set:    { value: sql`excluded.value` },
    });

  res.json(parsed.data);
});

// ── DELETE /:id/metadata/:key ─────────────────────────────────────────────────

router.delete('/:id/metadata/:key', requireScope('write'), async (req: AuthedRequest, res: Response) => {
  const orgId = req.orgId!;
  const { id, key } = req.params as { id: string; key: string };

  // Verify ownership
  const [file] = await db
    .select({ id: files.id })
    .from(files)
    .where(and(eq(files.id, id), eq(files.orgId, orgId), isNull(files.deletedAt)));

  if (!file) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  await db
    .delete(fileMetadata)
    .where(
      and(
        eq(fileMetadata.fileId, id),
        eq(fileMetadata.orgId, orgId),
        eq(fileMetadata.key, key),
      ),
    );

  res.status(204).send();
});

// ── POST /:id/embed ───────────────────────────────────────────────────────────

router.post('/:id/embed', requireScope('write'), async (req: AuthedRequest, res: Response) => {
  const orgId = req.orgId!;
  const id    = req.params.id as string;

  if (!RAG_ENABLED) {
    res.status(400).json({ error: 'OLLAMA_URL must be configured to use embeddings' });
    return;
  }

  const [file] = await db
    .select({ id: files.id, extractedText: files.extractedText, embeddingStatus: files.embeddingStatus })
    .from(files)
    .where(and(eq(files.id, id), eq(files.orgId, orgId), isNull(files.deletedAt)));

  if (!file) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  if (!file.extractedText) {
    res.status(400).json({
      error: 'No extracted text available. Run text extraction first via POST /files/:id/reprocess.',
    });
    return;
  }

  const result = await embedFile({
    fileId:        file.id,
    orgId,
    extractedText: file.extractedText,
    replace:       true,
  });

  res.json({
    fileId:          file.id,
    embeddingStatus: result.skipped ? 'skipped' : 'completed',
    chunksCreated:   result.chunksCreated,
  });
});

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
    .where(and(eq(files.id, id), eq(files.orgId, orgId), isNull(files.deletedAt)));

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
    .select({ storageKey: files.storageKey })
    .from(files)
    .where(and(eq(files.id, id), eq(files.orgId, orgId), isNull(files.deletedAt)));

  if (!file) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  await db.update(files).set({ deletedAt: new Date() }).where(eq(files.id, id));
  await deleteFile(file.storageKey);

  res.json({ message: 'File deleted', id });
});

export default router;
