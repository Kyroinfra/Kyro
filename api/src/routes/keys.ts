import { Router, Response, Request } from 'express';
import { query } from '../db';
import { generateApiKey } from '../lib/apiKey';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const createKeySchema = z.object({
  name: z.string().min(1).max(255),
  scopes: z.array(z.enum(['read', 'write', 'admin'])).default(['read']),
});

/**
 * @swagger
 * /keys:
 *   get:
 *     tags: [API Keys]
 *     summary: List API keys
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of API keys
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ApiKey'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *   post:
 *     tags: [API Keys]
 *     summary: Create API key
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *                 description: Key name
 *               scopes:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [read, write, admin]
 *                 default: [read]
 *                 description: Key permissions
 *     responses:
 *       201:
 *         description: API key created
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post('/', authMiddleware, requireRole('owner', 'admin'), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const orgId = req.user?.orgId;

    if (!userId || !orgId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parseResult = createKeySchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid input', details: parseResult.error.errors });
      return;
    }

    const { name, scopes } = parseResult.data;
    const { raw, hash, prefix } = generateApiKey();

    const result = await query<{
      id: string;
      name: string;
      key_prefix: string;
      scopes: string[];
      created_at: Date;
    }>(
      `INSERT INTO api_keys (org_id, user_id, name, key_hash, key_prefix, scopes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, key_prefix, scopes, created_at`,
      [orgId, userId, name, hash, prefix, scopes]
    );

    res.status(201).json({
      ...result[0],
      key: raw,
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

router.get('/', authMiddleware, requireRole('owner', 'admin', 'member'), async (req: Request, res: Response) => {
  try {
    const orgId = req.user?.orgId;

    if (!orgId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const result = await query<{
      id: string;
      name: string;
      key_prefix: string;
      scopes: string[];
      last_used_at: Date | null;
      revoked_at: Date | null;
      created_at: Date;
    }>(
      `SELECT id, name, key_prefix, scopes, last_used_at, revoked_at, created_at
       FROM api_keys
       WHERE org_id = $1
       ORDER BY created_at DESC`,
      [orgId]
    );

    res.json(result);
  } catch (error) {
    console.error('Error listing API keys:', error);
    res.status(500).json({ error: 'Failed to list API keys' });
  }
});

/**
 * @swagger
 * /keys/{id}:
 *   delete:
 *     tags: [API Keys]
 *     summary: Revoke API key
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Key revoked
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/:id', authMiddleware, requireRole('owner', 'admin'), async (req: Request, res: Response) => {
  try {
    const orgId = req.user?.orgId;
    const { id } = req.params;

    if (!orgId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const result = await query<{ id: string }>(
      `UPDATE api_keys SET revoked_at = NOW()
       WHERE id = $1 AND org_id = $2 AND revoked_at IS NULL
       RETURNING id`,
      [id, orgId]
    );

    if (result.length === 0) {
      res.status(404).json({ error: 'API key not found or already revoked' });
      return;
    }

    res.json({ message: 'API key revoked', id });
  } catch (error) {
    console.error('Error revoking API key:', error);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

export default router;
