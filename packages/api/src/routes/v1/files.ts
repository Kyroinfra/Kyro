import { Router, Response, Request } from 'express';
import { db } from '../../db';
import { apiKeys, organisations, files } from '../../db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { apiKeyAuthMiddleware, ApiKeyRequest, requireScope } from '../../middleware/apiKeyAuth';
import { upload } from '../../middleware/upload';
import { saveFile, deleteFile, getFilePath } from '../../lib/storage';

const router = Router();

router.use(apiKeyAuthMiddleware);

// POST / - upload a file

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

// GET / - get list of files

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

// GET /:id - download a file

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

// DELETE /:id - delete a file

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
