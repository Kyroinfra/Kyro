import { Router, type Request, type Response } from 'express';
import { db } from '../db';
import { apiKeys } from '../db/schema';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { generateApiKey } from '../lib/apiKey';
import { authMiddleware, requireRole } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const createKeySchema = z.object({
  name: z.string().min(1).max(255),
  scopes: z.array(z.enum(['read', 'write', 'admin'])).default(['read']),
});

// POST / - create and returns a new API key

router.post('/', authMiddleware, requireRole('owner', 'admin'), async (req: Request, res: Response) => {
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

  const [created] = await db
    .insert(apiKeys)
    .values({ orgId, userId, name, keyHash: hash, keyPrefix: prefix, scopes })
    .returning({
      id:        apiKeys.id,
      name:      apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      scopes:    apiKeys.scopes,
      createdAt: apiKeys.createdAt,
    });

  res.status(201).json({
    id:        created.id,
    name:      created.name,
    key_prefix: created.keyPrefix,
    scopes:    created.scopes,
    created_at: created.createdAt,
    key: raw,
  });
});

// GET / - get all keys

router.get('/', authMiddleware, requireRole('owner', 'admin', 'member'), async (req: Request, res: Response) => {
  const orgId = req.user?.orgId;
  if (!orgId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const limit = Math.min(parseInt(req.query.limit as string || '50', 10), 100);
  const offset = Math.max(parseInt(req.query.offset as string || '0', 10), 0);

  const [rows, [{ count }]] = await Promise.all([
    db
      .select({
        id:         apiKeys.id,
        name:       apiKeys.name,
        keyPrefix:  apiKeys.keyPrefix,
        scopes:     apiKeys.scopes,
        lastUsedAt: apiKeys.lastUsedAt,
        revokedAt:  apiKeys.revokedAt,
        createdAt:  apiKeys.createdAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.orgId, orgId))
      .orderBy(desc(apiKeys.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`COUNT(*)`.mapWith(Number) })
      .from(apiKeys)
      .where(eq(apiKeys.orgId, orgId)),
  ]);

  res.json({
    data: rows.map(k => ({
      id:           k.id,
      name:         k.name,
      key_prefix:   k.keyPrefix,
      scopes:       k.scopes,
      last_used_at: k.lastUsedAt,
      revoked_at:   k.revokedAt,
      created_at:   k.createdAt,
    })),
    pagination: {
      total: count,
      limit,
      offset,
      hasMore: offset + rows.length < count,
    },
  });
});

// DELETE /:id - does not hard delete but set's revoked at

router.delete('/:id', authMiddleware, requireRole('owner', 'admin'), async (req: Request, res: Response) => {
  const orgId = req.user?.orgId;
  const id = req.params.id as string;

  if (!orgId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const [revoked] = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, id), eq(apiKeys.orgId, orgId), isNull(apiKeys.revokedAt)))
    .returning({ id: apiKeys.id });

  if (!revoked) {
    res.status(404).json({ error: 'API key not found or already revoked' });
    return;
  }

  res.json({ message: 'API key revoked', id });
});

export default router;
