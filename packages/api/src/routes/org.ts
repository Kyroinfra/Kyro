import { Router, Request, Response } from 'express';
import { query, getClient } from '../db';
import { hashPassword } from '../lib/password';
import { authMiddleware, requireRole } from '../middleware/auth';
import { inviteSchema, InviteInput } from '../validations/auth';

const router = Router();

/**
 * @swagger
 * /org:
 *   get:
 *     tags: [Organisation]
 *     summary: Get current organisation
 *     security:
 *       - bearerAuth: []
 *     x-scope: null
 *     x-body-description: null
 *     x-response-example: '{"id":"550e8400-e29b-41d4-a716-446655440000","name":"Acme Inc","slug":"acme-inc","plan":"free","createdAt":"2026-04-10T12:00:00Z"}'
 *     responses:
 *       200:
 *         description: Organisation details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Organisation'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
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

/**
 * @swagger
 * /org/members:
 *   get:
 *     tags: [Organisation]
 *     summary: List organisation members
 *     security:
 *       - bearerAuth: []
 *     x-scope: null
 *     x-body-description: null
 *     x-response-example: '[{"id":"550e8400-e29b-41d4-a716-446655440000","email":"admin@acme.com","role":"owner","createdAt":"2026-04-10T12:00:00Z"}]'
 *     responses:
 *       200:
 *         description: List of members
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Member'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *   post:
 *     tags: [Organisation]
 *     summary: Invite new member
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               role:
 *                 type: string
 *                 enum: [owner, admin, member]
 *                 default: member
 *     x-scope: null
 *     x-body-description: '{ "email": "user@acme.com", "password": "secure123", "role": "member" }'
 *     x-response-example: '{"id":"550e8400-e29b-41d4-a716-446655440000","email":"user@acme.com","role":"member"}'
 *     responses:
 *       201:
 *         description: Member invited
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Member'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
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

/**
 * @swagger
 * /org/members/{id}:
 *   delete:
 *     tags: [Organisation]
 *     summary: Remove member
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     x-scope: null
 *     x-body-description: null
 *     x-response-example: '204 No Content'
 *     responses:
 *       204:
 *         description: Member removed
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
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
