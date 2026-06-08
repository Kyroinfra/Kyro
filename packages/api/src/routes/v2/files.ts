import { Router, Response } from 'express';
import { db } from '../../db';
import { apiKeys, organisations, files, textExtractionJobs, fileMetadata } from '../../db/schema';
import { eq, and, isNull, inArray, sql } from 'drizzle-orm';
import { apiKeyAuthMiddleware, ApiKeyRequest, requireScope } from '../../middleware/apiKeyAuth';
import { upload } from '../../middleware/upload';
import { saveFile, deleteFile, getFilePath } from '../../lib/storage';
import { textExtractionQueue } from '../../lib/queue';
import { extractText, SUPPORTED_MIME_TYPES_LIST } from '../../lib/extractors';
import { isRedisAvailable } from '../../db/redis';
import fs from 'fs';
import { z } from 'zod';

const router = Router();

// ── POST / — upload a file ────────────────────────────────────────────────────

router.post(
  '/',
  requireScope('write'),
  upload.single('file'),
  async (req: ApiKeyRequest, res: Response) => {
    try {
      const orgId    = req.orgId!;
      const apiKeyId = req.apiKeyId!;

      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const keyResult = await db
        .select({ userId: apiKeys.userId })
        .from(apiKeys)
        .where(eq(apiKeys.id, apiKeyId));
      const userId = keyResult[0]?.userId;

      const orgResult = await db
        .select({ storageLimit: organisations.storageLimit })
        .from(organisations)
        .where(eq(organisations.id, orgId));
      const storageLimit = orgResult[0]?.storageLimit ?? 1073741824;

      const usageResult = await db
        .select({ used: sql`COALESCE(SUM(${files.sizeBytes}), 0)`.mapWith(Number) })
        .from(files)
        .where(and(eq(files.orgId, orgId), isNull(files.deletedAt)));
      const usedStorage = usageResult[0]?.used ?? 0;

      if (usedStorage + req.file.size > storageLimit) {
        res.status(403).json({ error: 'Storage quota exceeded' });
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

      if (isRedisAvailable()) {
        const job = await db.transaction(async (tx) => {
          const [newJob] = await tx
            .insert(textExtractionJobs)
            .values({ fileId: fileRecord.id, status: 'pending' })
            .returning({ id: textExtractionJobs.id });

          await tx
            .update(files)
            .set({ extractionJobId: newJob.id })
            .where(eq(files.id, fileRecord.id));

          return newJob;
        });

        await textExtractionQueue.add('extract', {
          fileId:     fileRecord.id,
          storageKey,
          mimeType:   req.file.mimetype,
          jobId:      job.id,
          orgId,
        });

        res.status(201).json({ ...fileRecord, extractionStatus: 'pending' });
        return;
      }

      try {
        const filePath      = getFilePath(storageKey);
        const extractedText = await extractText(req.file.mimetype ?? '', filePath);

        await db
          .update(files)
          .set({ extractedText })
          .where(eq(files.id, fileRecord.id));

        res.status(201).json({ ...fileRecord, extractionStatus: 'completed', extractedText });
      } catch (extractErr) {
        console.error('Synchronous extraction failed:', extractErr);
        res.status(201).json({ ...fileRecord, extractionStatus: 'failed' });
      }
    } catch (error) {
      console.error('Error uploading file (v2):', error);
      res.status(500).json({ error: 'Failed to upload file' });
    }
  },
);

// ── GET / — list files ────────────────────────────────────────────────────────

router.get('/', requireScope('read'), async (req: ApiKeyRequest, res: Response) => {
  try {
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
  } catch (error) {
    console.error('Error listing files (v2):', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// ── GET /search ───────────────────────────────────────────────────────────────
// IMPORTANT: must be registered BEFORE /:id so Express doesn't swallow it.

router.get('/search', requireScope('read'), async (req: ApiKeyRequest, res: Response) => {
  try {
    const orgId = req.orgId!;
    const q     = (req.query.q as string | undefined)?.trim();

    if (!q) {
      res.status(400).json({ error: 'Query parameter "q" is required' });
      return;
    }

    const limit  = Math.min(parseInt((req.query.limit as string) || '20', 10), 100);
    const cursor = req.query.cursor as string | undefined;

    const tsQuery = sql`websearch_to_tsquery('english', ${q})`;

    let cursorCondition = sql`TRUE`;
    if (cursor) {
      try {
        const { rank, id } = JSON.parse(Buffer.from(cursor, 'base64url').toString());
        cursorCondition = sql`
          (ts_rank(${files.textSearchVector}, ${tsQuery}), ${files.id})
          < (${rank}::float4, ${id}::uuid)
        `;
      } catch {
        res.status(400).json({ error: 'Invalid cursor' });
        return;
      }
    }

    const rows = await db.execute(sql`
      SELECT
        f.id,
        f.name,
        f.mime_type   AS "mimeType",
        f.size_bytes  AS "sizeBytes",
        f.created_at  AS "createdAt",
        ts_rank(f.text_search_vector, ${tsQuery}) AS rank,
        ts_headline(
          'english',
          f.extracted_text,
          ${tsQuery},
          'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15, ShortWord=3, HighlightAll=false, MaxFragments=2, FragmentDelimiter=" … "'
        ) AS headline
      FROM files f
      WHERE
        f.org_id     = ${orgId}
        AND f.deleted_at IS NULL
        AND f.text_search_vector @@ ${tsQuery}
        AND ${cursorCondition}
      ORDER BY rank DESC, f.id DESC
      LIMIT ${limit + 1}
    `);

    const results = rows.rows as Array<{
      id: string; name: string; mimeType: string;
      sizeBytes: number; createdAt: Date; rank: number; headline: string;
    }>;

    const hasMore = results.length > limit;
    const items   = hasMore ? results.slice(0, limit) : results;

    const nextCursor = hasMore
      ? Buffer.from(
          JSON.stringify({ rank: items[items.length - 1].rank, id: items[items.length - 1].id }),
        ).toString('base64url')
      : null;

    res.json({ data: items, pagination: { limit, hasMore, nextCursor } });
  } catch (error) {
    console.error('Error searching files (v2):', error);
    res.status(500).json({ error: 'Failed to search files' });
  }
});

// ── GET /:id/text ─────────────────────────────────────────────────────────────
// IMPORTANT: /:id/text, /:id/extract, and /:id/metadata must all be registered
// BEFORE /:id, otherwise Express matches /:id first and never reaches them.

router.get('/:id/text', requireScope('read'), async (req: ApiKeyRequest, res: Response) => {
  try {
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
  } catch (error) {
    console.error('Error fetching extracted text (v2):', error);
    res.status(500).json({ error: 'Failed to fetch extracted text' });
  }
});

// ── POST /:id/extract ─────────────────────────────────────────────────────────

router.post('/:id/extract', requireScope('write'), async (req: ApiKeyRequest, res: Response) => {
  try {
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

    if (isRedisAvailable()) {
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

      await textExtractionQueue.add('extract', {
        fileId:     file.id,
        storageKey: file.storageKey,
        mimeType:   file.mimeType,
        jobId:      job.id,
        orgId,
      });

      res.status(202).json({
        fileId:           file.id,
        extractionStatus: 'pending',
        message:          'Extraction queued. Poll GET /files/:id/text for status.',
      });
      return;
    }

    try {
      const filePath      = getFilePath(file.storageKey);
      const extractedText = await extractText(file.mimeType ?? '', filePath);

      await db.update(files).set({ extractedText }).where(eq(files.id, file.id));

      res.json({ fileId: file.id, extractionStatus: 'completed', extractedText });
    } catch (extractErr) {
      console.error('Synchronous extraction failed:', extractErr);
      res.status(500).json({ error: 'Extraction failed', extractionStatus: 'failed' });
    }
  } catch (error) {
    console.error('Error triggering extraction (v2):', error);
    res.status(500).json({ error: 'Failed to trigger extraction' });
  }
});

// ── GET /:id/metadata ─────────────────────────────────────────────────────────

router.get('/:id/metadata', requireScope('read'), async (req: ApiKeyRequest, res: Response) => {
  try {
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
  } catch (error) {
    console.error('Error fetching metadata (v2):', error);
    res.status(500).json({ error: 'Failed to fetch metadata' });
  }
});

// ── PUT /:id/metadata ─────────────────────────────────────────────────────────
// Upserts metadata keys. Non-destructive: keys not present in the body are
// left untouched. Send { "key": null } via DELETE /:id/metadata/:key to remove.

router.put('/:id/metadata', requireScope('write'), async (req: ApiKeyRequest, res: Response) => {
  try {
    const orgId = req.orgId!;
    const id    = req.params.id as string;

    const parsed = z.record(z.string(), z.string()).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Body must be a flat key/value object of strings' });
      return;
    }

    // Verify ownership
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
      .values(entries.map(([key, value]) => ({ fileId: id, orgId, key, value })))
      .onConflictDoUpdate({
        // Requires the unique index idx_file_metadata_file_key on (file_id, key)
        target: [fileMetadata.fileId, fileMetadata.key],
        set:    { value: sql`EXCLUDED.value` },
      });

    res.json(parsed.data);
  } catch (error) {
    console.error('Error setting metadata (v2):', error);
    res.status(500).json({ error: 'Failed to set metadata' });
  }
});

// ── DELETE /:id/metadata/:key ─────────────────────────────────────────────────

router.delete('/:id/metadata/:key', requireScope('write'), async (req: ApiKeyRequest, res: Response) => {
  try {
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
  } catch (error) {
    console.error('Error deleting metadata key (v2):', error);
    res.status(500).json({ error: 'Failed to delete metadata key' });
  }
});

// ── GET /:id ──────────────────────────────────────────────────────────────────

router.get('/:id', requireScope('read'), async (req: ApiKeyRequest, res: Response) => {
  try {
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
  } catch (error) {
    console.error('Error downloading file (v2):', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// ── DELETE /:id ───────────────────────────────────────────────────────────────

router.delete('/:id', requireScope('write'), async (req: ApiKeyRequest, res: Response) => {
  try {
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
  } catch (error) {
    console.error('Error deleting file (v2):', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

export default router;
