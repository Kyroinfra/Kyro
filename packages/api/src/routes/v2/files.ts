import { Router, Response } from 'express';
import { db } from '../../db';
import { apiKeys, organisations, files, textExtractionJobs } from '../../db/schema';
import { eq, and, isNull, inArray, sql } from 'drizzle-orm';
import { apiKeyAuthMiddleware, ApiKeyRequest, requireScope } from '../../middleware/apiKeyAuth';
import { upload } from '../../middleware/upload';
import { saveFile, deleteFile, getFilePath } from '../../lib/storage';
import { textExtractionQueue } from '../../lib/queue';
import { extractText, SUPPORTED_MIME_TYPES_LIST } from '../../lib/extractors';
import { isRedisAvailable } from '../../db/redis';
import fs from 'fs';

const router = Router();

router.use(apiKeyAuthMiddleware);

// ─── POST /files ─────────────────────────────────────────────────────────────
// Upload a file. Auto-queues text extraction for supported MIME types.
// Falls back to synchronous extraction if Redis is unavailable.

/**
 * @swagger
 * /files:
 *   post:
 *     tags: [Files]
 *     summary: Upload file (v2 — includes auto text extraction)
 *     security:
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     x-scope: write
 *     responses:
 *       201:
 *         description: File uploaded. extractionStatus is "queued", "completed", "skipped", or "failed".
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/File'
 *                 - type: object
 *                   properties:
 *                     extractionStatus:
 *                       type: string
 *                       enum: [queued, completed, skipped, failed]
 *                     extractedText:
 *                       type: string
 *                       nullable: true
 *                       description: Present only when extraction ran synchronously
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       413:
 *         $ref: '#/components/responses/PayloadTooLarge'
 */
router.post(
    '/',
    requireScope('write'),
    upload.single('file'),
    async (req: ApiKeyRequest, res: Response) => {
        try {
            const orgId = req.orgId!;
            const apiKeyId = req.apiKeyId!;

            if (!req.file) {
                res.status(400).json({ error: 'No file uploaded' });
                return;
            }

            // Resolve the uploading user from the API key
            const keyResult = await db
                .select({ userId: apiKeys.userId })
                .from(apiKeys)
                .where(eq(apiKeys.id, apiKeyId));
            const userId = keyResult[0]?.userId;

            // Enforce storage quota
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

            // Persist the file to disk
            const { storageKey } = await saveFile(orgId, {
                originalname: req.file.originalname,
                buffer: req.file.buffer,
                mimetype: req.file.mimetype,
                size: req.file.size,
            });

            // Insert file record
            const [fileRecord] = await db
                .insert(files)
                .values({
                    orgId,
                    uploadedBy: userId!,
                    name: req.file.originalname,
                    storageKey,
                    mimeType: req.file.mimetype,
                    sizeBytes: req.file.size,
                })
                .returning({
                    id: files.id,
                    name: files.name,
                    mimeType: files.mimeType,
                    sizeBytes: files.sizeBytes,
                    createdAt: files.createdAt,
                });

            const isExtractable = SUPPORTED_MIME_TYPES_LIST.includes(req.file.mimetype ?? '');

            // ── Not a supported type — skip extraction entirely ────────────────────
            if (!isExtractable) {
                res.status(201).json({ ...fileRecord, extractionStatus: 'skipped' });
                return;
            }

            // ── Redis available — queue async extraction ───────────────────────────
            if (isRedisAvailable()) {
                // Atomically create the job record and link it to the file.
                // The enqueue happens after commit so the worker never picks up a job
                // whose file row hasn't been updated yet.
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

                // Enqueue outside the transaction — DB must be committed first
                await textExtractionQueue.add('extract', {
                    fileId: fileRecord.id,
                    storageKey,
                    mimeType: req.file.mimetype,
                    jobId: job.id,
                    orgId,
                });

                res.status(201).json({ ...fileRecord, extractionStatus: 'pending' });
                return;
            }

            // ── Redis unavailable — extract synchronously ──────────────────────────
            try {
                const filePath = getFilePath(storageKey);
                const extractedText = await extractText(req.file.mimetype ?? '', filePath);

                await db
                    .update(files)
                    .set({ extractedText })
                    .where(eq(files.id, fileRecord.id));

                res.status(201).json({
                    ...fileRecord,
                    extractionStatus: 'completed',
                    extractedText,
                });
            } catch (extractErr) {
                console.error('Synchronous extraction failed:', extractErr);
                // File was saved successfully — still return 201, just note extraction failed
                res.status(201).json({ ...fileRecord, extractionStatus: 'failed' });
            }
        } catch (error) {
            console.error('Error uploading file (v2):', error);
            res.status(500).json({ error: 'Failed to upload file' });
        }
    },
);

// ─── GET /files ───────────────────────────────────────────────────────────────
// Cursor-paginated list — identical to v1 but also returns extractionStatus.

/**
 * @swagger
 * /files:
 *   get:
 *     tags: [Files]
 *     summary: List files (v2 — includes extractionStatus per file)
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 100, maximum: 100 }
 *       - name: cursor
 *         in: query
 *         schema: { type: string }
 *     x-scope: read
 *     responses:
 *       200:
 *         description: Paginated list of files with extraction status
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/', requireScope('read'), async (req: ApiKeyRequest, res: Response) => {
    try {
        const orgId = req.orgId!;
        const limit = Math.min(parseInt((req.query.limit as string) || '100', 10), 100);
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
                id: files.id,
                name: files.name,
                mimeType: files.mimeType,
                sizeBytes: files.sizeBytes,
                createdAt: files.createdAt,
                extractionJobId: files.extractionJobId,
                extractedText: files.extractedText,
            })
            .from(files)
            .where(and(eq(files.orgId, orgId), isNull(files.deletedAt), cursorCondition))
            .orderBy(sql`${files.createdAt} DESC, ${files.id} DESC`)
            .limit(limit + 1);

        const hasMore = result.length > limit;
        const items = hasMore ? result.slice(0, limit) : result;

        // Batch-fetch job statuses for files that have a linked job
        const jobIds = items
            .map((f) => f.extractionJobId)
            .filter(Boolean) as string[];

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
                // Job exists — use its status (default pending if not found, shouldn't happen)
                extractionStatus = jobStatusMap[extractionJobId] ?? 'pending';
            } else if (extractedText) {
                // No job but text present — came from sync extraction path
                extractionStatus = 'completed';
            } else if (SUPPORTED_MIME_TYPES_LIST.includes(f.mimeType ?? '')) {
                // Extractable type but no job and no text — sync extraction failed silently
                extractionStatus = 'failed';
            } else {
                // Not an extractable type
                extractionStatus = 'skipped';
            }
            return { ...f, extractionStatus };
        });

        const nextCursor = hasMore
            ? Buffer.from(
                JSON.stringify({
                    createdAt: items[items.length - 1].createdAt,
                    id: items[items.length - 1].id,
                }),
            ).toString('base64url')
            : null;

        res.json({ data, pagination: { limit, hasMore, nextCursor } });
    } catch (error) {
        console.error('Error listing files (v2):', error);
        res.status(500).json({ error: 'Failed to list files' });
    }
});

// ─── GET /files/search ────────────────────────────────────────────────────────

/**
 * @swagger
 * /files/search:
 *   get:
 *     tags: [Files]
 *     summary: Full-text search over extracted file content
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - name: q
 *         in: query
 *         required: true
 *         schema: { type: string }
 *         description: Search query (supports phrases with quotes, e.g. "invoice total")
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - name: cursor
 *         in: query
 *         schema: { type: string }
 *         description: Pagination cursor from previous response
 *     x-scope: read
 *     responses:
 *       200:
 *         description: Ranked search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/File'
 *                       - type: object
 *                         properties:
 *                           rank:
 *                             type: number
 *                             description: Relevance score (higher = more relevant)
 *                           headline:
 *                             type: string
 *                             description: Snippet with matched terms highlighted in <mark> tags
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     limit: { type: integer }
 *                     hasMore: { type: boolean }
 *                     nextCursor: { type: string, nullable: true }
 *       400:
 *         description: Missing or empty search query
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/search', requireScope('read'), async (req: ApiKeyRequest, res: Response) => {
  try {
    const orgId = req.orgId!;
    const q = (req.query.q as string | undefined)?.trim();

    if (!q) {
      res.status(400).json({ error: 'Query parameter "q" is required' });
      return;
    }

    const limit = Math.min(parseInt((req.query.limit as string) || '20', 10), 100);
    const cursor = req.query.cursor as string | undefined;

    // Convert free-text query into a tsquery.
    // plainto_tsquery handles arbitrary user input safely (no special chars needed).
    // websearch_to_tsquery (Postgres 11+) also supports quoted phrases and OR — use
    // that if you want more power without teaching users tsquery syntax.
    const tsQuery = sql`websearch_to_tsquery('english', ${q})`;

    // Cursor is base64url-encoded JSON: { rank: number, id: string }
    // We sort by rank DESC, then id DESC for stable pagination.
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
        ts_rank(f.text_search_vector, ${tsQuery})                    AS rank,
        ts_headline(
          'english',
          f.extracted_text,
          ${tsQuery},
          'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15, ShortWord=3, HighlightAll=false, MaxFragments=2, FragmentDelimiter=" … "'
        )                                                             AS headline
      FROM files f
      WHERE
        f.org_id    = ${orgId}
        AND f.deleted_at IS NULL
        AND f.text_search_vector @@ ${tsQuery}
        AND ${cursorCondition}
      ORDER BY rank DESC, f.id DESC
      LIMIT ${limit + 1}
    `);

    const results = rows.rows as Array<{
      id: string;
      name: string;
      mimeType: string;
      sizeBytes: number;
      createdAt: Date;
      rank: number;
      headline: string;
    }>;

    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, limit) : results;

    const nextCursor = hasMore
      ? Buffer.from(
          JSON.stringify({
            rank: items[items.length - 1].rank,
            id:   items[items.length - 1].id,
          }),
        ).toString('base64url')
      : null;

    res.json({
      data: items,
      pagination: { limit, hasMore, nextCursor },
    });
  } catch (error) {
    console.error('Error searching files (v2):', error);
    res.status(500).json({ error: 'Failed to search files' });
  }
});

// ─── GET /files/:id ───────────────────────────────────────────────────────────
// Download file binary — same as v1.

router.get('/:id', requireScope('read'), async (req: ApiKeyRequest, res: Response) => {
    try {
        const orgId = req.orgId!;
        const id = req.params.id as string;

        const [file] = await db
            .select({
                id: files.id,
                name: files.name,
                storageKey: files.storageKey,
                mimeType: files.mimeType,
                sizeBytes: files.sizeBytes,
            })
            .from(files)
            .where(and(eq(files.id, id), eq(files.orgId, orgId), isNull(files.deletedAt)));

        if (!file) {
            res.status(404).json({ error: 'File not found' });
            return;
        }

        const filePath = getFilePath(file.storageKey);

        // Guard against missing file on disk
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

// ─── GET /files/:id/text ──────────────────────────────────────────────────────
// Returns the extracted text for a file, or the current job status if pending.

/**
 * @swagger
 * /files/{id}/text:
 *   get:
 *     tags: [Files]
 *     summary: Get extracted text for a file
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     x-scope: read
 *     responses:
 *       200:
 *         description: Extracted text or job status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 fileId:
 *                   type: string
 *                 extractionStatus:
 *                   type: string
 *                   enum: [completed, pending, processing, failed, skipped]
 *                 extractedText:
 *                   type: string
 *                   nullable: true
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id/text', requireScope('read'), async (req: ApiKeyRequest, res: Response) => {
    try {
        const orgId = req.orgId!;
        const id = req.params.id as string;

        const [file] = await db
            .select({
                id: files.id,
                mimeType: files.mimeType,
                extractedText: files.extractedText,
                extractionJobId: files.extractionJobId,
            })
            .from(files)
            .where(and(eq(files.id, id), eq(files.orgId, orgId), isNull(files.deletedAt)));

        if (!file) {
            res.status(404).json({ error: 'File not found' });
            return;
        }

        // Already extracted (synchronous path or previously completed async job)
        if (file.extractedText) {
            res.json({
                fileId: file.id,
                extractionStatus: 'completed',
                extractedText: file.extractedText,
            });
            return;
        }

        // No job and no text
        if (!file.extractionJobId) {
            const isExtractable = SUPPORTED_MIME_TYPES_LIST.includes(file.mimeType ?? '');
            res.json({
                fileId: file.id,
                // If it's an extractable type but has no job and no text, sync extraction
                // failed silently — surface that honestly rather than saying 'pending'
                extractionStatus: isExtractable ? 'failed' : 'skipped',
                extractedText: null,
            });
            return;
        }

        // Look up the job for status
        const [job] = await db
            .select({
                status: textExtractionJobs.status,
                error: textExtractionJobs.error,
            })
            .from(textExtractionJobs)
            .where(eq(textExtractionJobs.id, file.extractionJobId));

        res.json({
            fileId: file.id,
            extractionStatus: job?.status ?? 'pending',
            extractedText: null,
            ...(job?.status === 'failed' && { error: job.error }),
        });
    } catch (error) {
        console.error('Error fetching extracted text (v2):', error);
        res.status(500).json({ error: 'Failed to fetch extracted text' });
    }
});

// ─── POST /files/:id/extract ──────────────────────────────────────────────────
// Manually trigger (or re-trigger) extraction on an existing file.

/**
 * @swagger
 * /files/{id}/extract:
 *   post:
 *     tags: [Files]
 *     summary: Trigger text extraction for a file
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     x-scope: write
 *     responses:
 *       202:
 *         description: Extraction queued (async) or completed (sync fallback)
 *       400:
 *         description: File type not supported for extraction
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         description: Extraction already in progress
 */
router.post('/:id/extract', requireScope('write'), async (req: ApiKeyRequest, res: Response) => {
    try {
        const orgId = req.orgId!;
        const id = req.params.id as string;

        const [file] = await db
            .select({
                id: files.id,
                storageKey: files.storageKey,
                mimeType: files.mimeType,
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
                error: 'File type not supported for extraction',
                supportedTypes: SUPPORTED_MIME_TYPES_LIST,
            });
            return;
        }

        // Guard: block if an active job already exists
        if (file.extractionJobId) {
            const [existing] = await db
                .select({ status: textExtractionJobs.status })
                .from(textExtractionJobs)
                .where(eq(textExtractionJobs.id, file.extractionJobId));

            if (existing && ['pending', 'processing'].includes(existing.status)) {
                res.status(409).json({
                    error: 'Extraction already in progress',
                    extractionStatus: existing.status,
                });
                return;
            }
        }

        // ── Queue async ────────────────────────────────────────────────────────
        if (isRedisAvailable()) {
            // Atomically upsert the job record and link it back to the file
            const job = await db.transaction(async (tx) => {
                const [newJob] = await tx
                    .insert(textExtractionJobs)
                    .values({ fileId: file.id, status: 'pending' })
                    .onConflictDoUpdate({
                        target: textExtractionJobs.fileId,
                        set: {
                            status: 'pending',
                            attempts: 0,
                            error: null,
                            startedAt: null,
                            completedAt: null,
                            createdAt: new Date(),
                        },
                    })
                    .returning({ id: textExtractionJobs.id });

                await tx
                    .update(files)
                    .set({ extractionJobId: newJob.id })
                    .where(eq(files.id, file.id));

                return newJob;
            });

            // Enqueue outside the transaction — DB must be committed first
            await textExtractionQueue.add('extract', {
                fileId: file.id,
                storageKey: file.storageKey,
                mimeType: file.mimeType,
                jobId: job.id,
                orgId
            });

            res.status(202).json({
                fileId: file.id,
                extractionStatus: 'pending',
                message: 'Extraction queued. Poll GET /files/:id/text for status.',
            });
            return;
        }

        // ── Sync fallback ──────────────────────────────────────────────────────
        try {
            const filePath = getFilePath(file.storageKey);
            const extractedText = await extractText(file.mimeType ?? '', filePath);

            await db
                .update(files)
                .set({ extractedText })
                .where(eq(files.id, file.id));

            res.json({
                fileId: file.id,
                extractionStatus: 'completed',
                extractedText,
            });
        } catch (extractErr) {
            console.error('Synchronous extraction failed:', extractErr);
            res.status(500).json({ error: 'Extraction failed', extractionStatus: 'failed' });
        }
    } catch (error) {
        console.error('Error triggering extraction (v2):', error);
        res.status(500).json({ error: 'Failed to trigger extraction' });
    }
});

// ─── DELETE /files/:id ────────────────────────────────────────────────────────
// Soft-delete — identical to v1.

router.delete('/:id', requireScope('write'), async (req: ApiKeyRequest, res: Response) => {
    try {
        const orgId = req.orgId!;
        const id = req.params.id as string;

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
