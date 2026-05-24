import { Router, Request, Response } from 'express';
import { query, getClient } from '../../db';
import { hashPassword } from '../../lib/password';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { inviteSchema, InviteInput } from '../../validations/auth';

const router = Router();

// GET / - get org details

router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const orgs = await query<{
      id: string;
      name: string;
      slug: string;
      plan: string;
      created_at: string;
    }>(
      `SELECT id, name, slug, plan, created_at FROM organisations WHERE id = $1`,
      [req.user!.orgId]
    );

    if (orgs.length === 0) {
      return res.status(404).json({ error: 'Organisation not found' });
    }

    const org = orgs[0];
    res.json({
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      createdAt: org.created_at,
    });
  } catch (error) {
    console.error('Get org error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /members - get org members

router.get('/members', authMiddleware, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string || '50', 10), 100);
    const offset = Math.max(parseInt(req.query.offset as string || '0', 10), 0);

    const [rows, countRows] = await Promise.all([
      query<{ id: string; email: string; role: string; created_at: string }>(
        `SELECT id, email, role, created_at FROM users
         WHERE org_id = $1 ORDER BY created_at LIMIT $2 OFFSET $3`,
        [req.user!.orgId, limit, offset]
      ),
      query<{ count: string }>(`SELECT COUNT(*) as count FROM users WHERE org_id = $1`, [req.user!.orgId]),
    ]);

    res.json({
      data: rows.map(u => ({ id: u.id, email: u.email, role: u.role, createdAt: u.created_at })),
      pagination: {
        total: parseInt(countRows[0]?.count || '0', 10),
        limit,
        offset,
        hasMore: offset + rows.length < parseInt(countRows[0]?.count || '0', 10),
      },
    });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /members - invites/creates a member with a password 

router.post('/members', authMiddleware, requireRole('owner'), async (req: Request, res: Response) => {
  try {
    const input = inviteSchema.parse(req.body) as InviteInput;

    const existing = await query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1',
      [input.email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const passwordHash = await hashPassword(input.password);

    const result = await query<{ id: string; email: string; role: string }>(
      `INSERT INTO users (org_id, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, email, role`,
      [req.user!.orgId, input.email, passwordHash, input.role]
    );

    const user = result[0];
    res.status(201).json({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Invite member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /members/:id - delete a member

router.delete('/members/:id', authMiddleware, requireRole('owner', 'admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const members = await query<{ id: string; role: string }>(
      'SELECT id, role FROM users WHERE id = $1 AND org_id = $2',
      [id, req.user!.orgId]
    );

    if (members.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const member = members[0];

    if (member.role === 'owner') {
      return res.status(403).json({ error: 'Cannot remove owner' });
    }

    if (req.user!.role === 'admin' && member.role === 'admin') {
      return res.status(403).json({ error: 'Cannot remove admin' });
    }

    await query('DELETE FROM users WHERE id = $1', [id]);

    res.status(204).send();
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
