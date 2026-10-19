import { Router, type Request, type Response } from 'express';
import { db } from '../../db';
import { organisations, users } from '../../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { hashPassword } from '../../lib/password';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { inviteSchema, type InviteInput } from '../../validations/auth';

const router = Router();

// GET / - get org details

router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const [org] = await db
    .select({
      id:        organisations.id,
      name:      organisations.name,
      slug:      organisations.slug,
      createdAt: organisations.createdAt,
    })
    .from(organisations)
    .where(eq(organisations.id, req.user!.orgId));

  if (!org) {
    return res.status(404).json({ error: 'Organisation not found' });
  }

  res.json({
    id: org.id,
    name: org.name,
    slug: org.slug,
    createdAt: org.createdAt,
  });
});

// GET /members - get org members

router.get('/members', authMiddleware, async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string || '50', 10), 100);
  const offset = Math.max(parseInt(req.query.offset as string || '0', 10), 0);

  const [rows, [{ count }]] = await Promise.all([
    db
      .select({
        id:        users.id,
        email:     users.email,
        role:      users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.orgId, req.user!.orgId))
      .orderBy(users.createdAt)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`COUNT(*)`.mapWith(Number) })
      .from(users)
      .where(eq(users.orgId, req.user!.orgId)),
  ]);

  res.json({
    data: rows,
    pagination: {
      total: count,
      limit,
      offset,
      hasMore: offset + rows.length < count,
    },
  });
});

// POST /members - invites/creates a member with a password

router.post('/members', authMiddleware, requireRole('owner'), async (req: Request, res: Response) => {
  const parsed = inviteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
    return;
  }
  const input = parsed.data as InviteInput;

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email));

  if (existing) {
    return res.status(400).json({ error: 'Email already in use' });
  }

  const passwordHash = await hashPassword(input.password);

  const [user] = await db
    .insert(users)
    .values({ orgId: req.user!.orgId, email: input.email, passwordHash, role: input.role })
    .returning({ id: users.id, email: users.email, role: users.role });

  res.status(201).json({
    id: user.id,
    email: user.email,
    role: user.role,
  });
});

// DELETE /members/:id - delete a member

router.delete('/members/:id', authMiddleware, requireRole('owner', 'admin'), async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const [member] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(and(eq(users.id, id), eq(users.orgId, req.user!.orgId)));

  if (!member) {
    return res.status(404).json({ error: 'Member not found' });
  }

  if (member.role === 'owner') {
    return res.status(403).json({ error: 'Cannot remove owner' });
  }

  if (req.user!.role === 'admin' && member.role === 'admin') {
    return res.status(403).json({ error: 'Cannot remove admin' });
  }

  await db.delete(users).where(eq(users.id, id));

  res.status(204).send();
});

export default router;
