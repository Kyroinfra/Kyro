import { Router, Response, Request } from 'express';
import pool from '../db';
import { apiKeyAuthMiddleware, ApiKeyRequest, requireScope } from '../middleware/apiKeyAuth';
import { upload } from '../middleware/upload';
import { saveFile, deleteFile, getFilePath } from '../lib/storage';
import { z } from 'zod';

const router = Router();

router.use(apiKeyAuthMiddleware);

router.post('/', requireScope('write'), upload.single('file'), async (req: ApiKeyRequest, res: Response) => {
  try {
    const orgId = req.orgId;
    const apiKeyId = req.apiKeyId;

    if (!orgId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const userResult = await pool.query(
      'SELECT user_id FROM api_keys WHERE id = $1',
      [apiKeyId]
    );
    const userId = userResult.rows[0]?.user_id;

    const orgResult = await pool.query(
      'SELECT storage_limit FROM organisations WHERE id = $1',
      [orgId]
    );

    const storageLimit = orgResult.rows[0]?.storage_limit || 1073741824;

    const usageResult = await pool.query(
      'SELECT COALESCE(SUM(size_bytes), 0) as used FROM files WHERE org_id = $1 AND deleted_at IS NULL',
      [orgId]
    );

    const usedStorage = parseInt(usageResult.rows[0]?.used || '0', 10);

    if (usedStorage + req.file.size > storageLimit) {
      res.status(403).json({ error: 'Storage quota exceeded' });
      return;
    }

    const { storageKey, fileId } = await saveFile(orgId, {
      originalname: req.file.originalname,
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    const result = await pool.query(
      `INSERT INTO files (org_id, uploaded_by, name, storage_key, mime_type, size_bytes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, mime_type, size_bytes, created_at`,
      [orgId, userId, req.file.originalname, storageKey, req.file.mimetype, req.file.size]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

router.get('/', requireScope('read'), async (req: ApiKeyRequest, res: Response) => {
  try {
    const orgId = req.orgId;

    if (!orgId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const result = await pool.query(
      `SELECT id, name, mime_type, size_bytes, created_at
       FROM files
       WHERE org_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [orgId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

router.get('/:id', requireScope('read'), async (req: ApiKeyRequest, res: Response) => {
  try {
    const orgId = req.orgId;
    const { id } = req.params;

    if (!orgId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const fileResult = await pool.query(
      `SELECT id, name, storage_key, mime_type, size_bytes
       FROM files
       WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL`,
      [id, orgId]
    );

    if (fileResult.rows.length === 0) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const file = fileResult.rows[0];
    const filePath = getFilePath(file.storage_key);

    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    res.setHeader('Content-Length', file.size_bytes);

    const stream = require('fs').createReadStream(filePath);
    stream.pipe(res);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

router.delete('/:id', requireScope('write'), async (req: ApiKeyRequest, res: Response) => {
  try {
    const orgId = req.orgId;
    const { id } = req.params;

    if (!orgId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const fileResult = await pool.query(
      `SELECT storage_key FROM files
       WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL`,
      [id, orgId]
    );

    if (fileResult.rows.length === 0) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    await pool.query(
      'UPDATE files SET deleted_at = NOW() WHERE id = $1',
      [id]
    );

    await deleteFile(fileResult.rows[0].storage_key);

    res.json({ message: 'File deleted', id });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

export default router;
