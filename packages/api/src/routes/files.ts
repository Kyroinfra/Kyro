import { Router, Response, Request } from 'express';
import { db } from '../db';
import { apiKeys, organisations, files } from '../db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { apiKeyAuthMiddleware, ApiKeyRequest, requireScope } from '../middleware/apiKeyAuth';
import { upload } from '../middleware/upload';
import { saveFile, deleteFile, getFilePath } from '../lib/storage';

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
 *       - name: cursor
 *         in: query
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of files
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

    const result = await db.select({
      id: files.id,
      name: files.name,
      mimeType: files.mimeType,
      sizeBytes: files.sizeBytes,
      createdAt: files.createdAt,
    })
      .from(files)
      .where(and(eq(files.orgId, orgId), isNull(files.deletedAt)))
      .orderBy(sql`${files.createdAt} DESC`);

    res.json(result);
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
