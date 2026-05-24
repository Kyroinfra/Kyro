import { Router, Request, Response } from 'express';
import { query, getClient } from '../../db';
import { hashPassword, verifyPassword } from '../../lib/password';
import { signJWT } from '../../lib/auth';
import { authMiddleware } from '../../middleware/auth';
import { registerSchema, loginSchema, RegisterInput, LoginInput } from '../../validations/auth';

const router = Router();

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

async function findUniqueSlug(slug: string): Promise<string> {
  const existing = await query<{ id: string }>(
    'SELECT id FROM organisations WHERE slug = $1',
    [slug]
  );

  if (existing.length === 0) {
    return slug;
  }

  return `${slug}-${Date.now()}`;
}
// POST /register

router.post('/register', async (req: Request, res: Response) => {
  try {
    const input = registerSchema.parse(req.body) as RegisterInput;

    const existingUser = await query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1',
      [input.email]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    let slug = generateSlug(input.orgName);
    slug = await findUniqueSlug(slug);

    const passwordHash = await hashPassword(input.password);

    const client = await getClient();

    try {
      await client.query('BEGIN');

      const orgResult = await client.query(
        `INSERT INTO organisations (name, slug) VALUES ($1, $2) RETURNING id`,
        [input.orgName, slug]
      );
      const orgId = orgResult.rows[0].id;

      const userResult = await client.query(
        `INSERT INTO users (org_id, email, password_hash, role) VALUES ($1, $2, $3, 'owner') RETURNING id, email, role`,
        [orgId, input.email, passwordHash]
      );

      await client.query('COMMIT');

      const user = userResult.rows[0];
      const token = signJWT({
        userId: user.id,
        orgId: orgId,
        role: user.role,
      });

      res.status(201).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          orgId: orgId,
        },
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /login

router.post('/login', async (req: Request, res: Response) => {
  try {
    const input = loginSchema.parse(req.body) as LoginInput;

    const users = await query<{
      id: string;
      org_id: string;
      email: string;
      password_hash: string;
      role: string;
    }>(
      `SELECT u.id, u.org_id, u.email, u.password_hash, u.role 
       FROM users u WHERE u.email = $1`,
      [input.email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    const valid = await verifyPassword(input.password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signJWT({
      userId: user.id,
      orgId: user.org_id,
      role: user.role as 'owner' | 'admin' | 'member',
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        orgId: user.org_id,
      },
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /me

router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const users = await query<{
      id: string;
      email: string;
      role: string;
      org_id: string;
    }>(
      `SELECT id, email, role, org_id FROM users WHERE id = $1`,
      [req.user!.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      orgId: user.org_id,
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
