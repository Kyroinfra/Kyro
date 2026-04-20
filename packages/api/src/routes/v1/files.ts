import { Router, Response, Request } from 'express';
import { db } from '../../db';
import { apiKeys, organisations, files } from '../../db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { apiKeyAuthMiddleware, ApiKeyRequest, requireScope } from '../../middleware/apiKeyAuth';
import { upload } from '../../middleware/upload';
import { saveFile, deleteFile, getFilePath } from '../../lib/storage';

const router = Router();

/**
 * @swagger
 * /files:
 *   get:
 *     tags: [Files]
 *     summary: List files
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 100
 *           maximum: 100
 *         description: Number of files to return (max 100)
 *       - name: cursor
 *         in: query
 *         schema:
 *           type: string
 *         description: Pagination cursor from previous response's nextCursor
 *     x-scope: read
 *     x-body-description: null
 *     x-response-example: '{"data":[{"id":"550e8400-e29b-41d4-a716-446655440000","name":"document.pdf","mimeType":"application/pdf","sizeBytes":1024000,"createdAt":"2026-04-10T12:00:00Z"}],"pagination":{"limit":100,"hasMore":false,"nextCursor":null}}'
 *     responses:
 *       200:
 *         description: Paginated list of files
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/File'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     limit:
 *                       type: integer
 *                     hasMore:
 *                       type: boolean
 *                     nextCursor:
 *                       type: string
 *                       nullable: true
 *                       description: Pass this as the cursor param in your next request
 *       400:
 *         description: Invalid cursor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *   post:
 *     tags: [Files]
 *     summary: Upload file
 *     security:
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File to upload
 *     x-scope: write
 *     x-body-description: file — File (multipart/form-data)
 *     x-response-example: '{"id":"550e8400-e29b-41d4-a716-446655440000","name":"document.pdf","mimeType":"application/pdf","sizeBytes":1024000,"createdAt":"2026-04-10T12:00:00Z"}'
 *     responses:
 *       201:
 *         description: File uploaded
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       413:
 *         $ref: '#/components/responses/PayloadTooLarge'
 */
router.use(apiKeyAuthMiddleware);

router.post('/', requireScope('write'), upload.single('file'), async (req: ApiKeyRequest, res: Response) => {
  try {
    const orgId = req.orgId!;
    const apiKeyId = req.apiKeyId!;

    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const keyResult = await db.select({ userId: apiKeys.userId })
      .from(apiKeys)
      .where(eq(apiKeys.id, apiKeyId));
    const userId = keyResult[0]?.userId;

    const orgResult = await db.select({ storageLimit: organisations.storageLimit })
      .from(organisations)
      .where(eq(organisations.id, orgId));
    const storageLimit = orgResult[0]?.storageLimit || 1073741824;

    const usageResult = await db.select({
      used: sql`COALESCE(SUM(${files.sizeBytes}), 0)`.mapWith(Number)
    })
      .from(files)
      .where(and(eq(files.orgId, orgId), isNull(files.deletedAt)));
    const usedStorage = usageResult[0]?.used || 0;

    if (usedStorage + req.file.size > storageLimit) {
      res.status(403).json({ error: 'Storage quota exceeded' });
      return;
    }

    const { storageKey } = await saveFile(orgId, {
      originalname: req.file.originalname,
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    const result = await db.insert(files).values({
      orgId,
      uploadedBy: userId!,
      name: req.file.originalname,
      storageKey,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
    }).returning({
      id: files.id,
      name: files.name,
      mimeType: files.mimeType,
      sizeBytes: files.sizeBytes,
      createdAt: files.createdAt,
    });

    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

/**
 * @swagger
 * /files/{id}:
 *   get:
 *     tags: [Files]
 *     summary: Download file
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     x-scope: read
 *     x-body-description: null
 *     x-response-example: 'Binary file data with appropriate Content-Type header.'
 *     responses:
 *       200:
 *         description: File content
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   delete:
 *     tags: [Files]
 *     summary: Delete file
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: File UUID
 *     x-scope: write
 *     x-body-description: null
 *     x-response-example: '{"message":"File deleted","id":"550e8400-e29b-41d4-a716-446655440000"}'
 *     responses:
 *       200:
 *         description: File deleted
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/', requireScope('read'), async (req: ApiKeyRequest, res: Response) => {
  try {
    const orgId = req.orgId!;
    const limit = Math.min(parseInt(req.query.limit as string || '100', 10), 100);
    const cursor = req.query.cursor as string | undefined;

    // Cursor is base64-encoded JSON: { createdAt: string, id: string }
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

    const result = await db.select({
      id: files.id,
      name: files.name,
      mimeType: files.mimeType,
      sizeBytes: files.sizeBytes,
      createdAt: files.createdAt,
    })
      .from(files)
      .where(and(eq(files.orgId, orgId), isNull(files.deletedAt), cursorCondition))
      .orderBy(sql`${files.createdAt} DESC, ${files.id} DESC`)
      .limit(limit + 1); // fetch one extra to detect if there's a next page

    const hasMore = result.length > limit;
    const items = hasMore ? result.slice(0, limit) : result;

    const nextCursor = hasMore
      ? Buffer.from(JSON.stringify({
          createdAt: items[items.length - 1].createdAt,
          id: items[items.length - 1].id,
        })).toString('base64url')
      : null;

    res.json({
      data: items,
      pagination: {
        limit,
        hasMore,
        nextCursor,
      },
    });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

router.get('/:id', requireScope('read'), async (req: ApiKeyRequest, res: Response) => {
  try {
    const orgId = req.orgId!;
    const { id } = req.params;

    const fileResult = await db.select({
      id: files.id,
      name: files.name,
      storageKey: files.storageKey,
      mimeType: files.mimeType,
      sizeBytes: files.sizeBytes,
    })
      .from(files)
      .where(and(eq(files.id, id as string), eq(files.orgId, orgId), isNull(files.deletedAt)));

    if (fileResult.length === 0) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const file = fileResult[0];
    const filePath = getFilePath(file.storageKey);

    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    res.setHeader('Content-Length', file.sizeBytes);

    const stream = require('fs').createReadStream(filePath);
    stream.pipe(res);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

router.delete('/:id', requireScope('write'), async (req: ApiKeyRequest, res: Response) => {
  try {
    const orgId = req.orgId!;
    const { id } = req.params;

    const fileResult = await db.select({ storageKey: files.storageKey })
      .from(files)
      .where(and(eq(files.id, id as string), eq(files.orgId, orgId), isNull(files.deletedAt)));

    if (fileResult.length === 0) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    await db.update(files)
      .set({ deletedAt: new Date() })
      .where(eq(files.id, id as string));

    await deleteFile(fileResult[0].storageKey);

    res.json({ message: 'File deleted', id });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

export default router;
