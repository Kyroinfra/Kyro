import { Router, type Request, type Response } from 'express';
import { db } from '../db';
import { organisations, users } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { hashPassword, verifyPassword } from '../lib/password';
import { signJWT } from '../lib/auth';
import { authMiddleware } from '../middleware/auth';
import config from '../config';
import { registerSchema, loginSchema, type RegisterInput, type LoginInput } from '../validations/auth';

const router = Router();

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

async function findUniqueSlug(slug: string): Promise<string> {
  const [existing] = await db
    .select({ id: organisations.id })
    .from(organisations)
    .where(eq(organisations.slug, slug));

  if (!existing) {
    return slug;
  }

  return `${slug}-${Date.now()}`;
}
// POST /register

router.post('/register', async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
    return;
  }
  const input = parsed.data as RegisterInput;

  // Locked by default (#30): open registration exists only to bootstrap the
  // first org. Afterwards members join via POST /org/members, or the operator
  // explicitly reopens signup with ALLOW_SIGNUP=true. Checked before the
  // account lookup so strangers cannot enumerate existing emails.
  const [{ count }] = await db
    .select({ count: sql<number>`COUNT(*)`.mapWith(Number) })
    .from(organisations);

  if (count > 0 && !config.allowSignup) {
    return res.status(403).json({ error: 'Signup disabled' });
  }

  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email));

  if (existingUser.length > 0) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  let slug = generateSlug(input.orgName);
  slug = await findUniqueSlug(slug);

  const passwordHash = await hashPassword(input.password);

  // Org + owner user are created atomically.
  const { user, orgId } = await db.transaction(async (tx) => {
    const [org] = await tx
      .insert(organisations)
      .values({ name: input.orgName, slug })
      .returning({ id: organisations.id });

    const [newUser] = await tx
      .insert(users)
      .values({ orgId: org.id, email: input.email, passwordHash, role: 'owner' })
      .returning({ id: users.id, email: users.email, role: users.role });

    return { user: newUser, orgId: org.id };
  });

  const token = signJWT({
    userId: user.id,
    orgId: orgId,
    role: user.role as 'owner' | 'admin' | 'member',
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
});

// POST /login

router.post('/login', async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
    return;
  }
  const input = parsed.data as LoginInput;

  const [user] = await db
    .select({
      id:           users.id,
      orgId:        users.orgId,
      email:        users.email,
      passwordHash: users.passwordHash,
      role:         users.role,
    })
    .from(users)
    .where(eq(users.email, input.email));

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await verifyPassword(input.password, user.passwordHash);

  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signJWT({
    userId: user.id,
    orgId: user.orgId,
    role: user.role as 'owner' | 'admin' | 'member',
  });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      orgId: user.orgId,
    },
  });
});

// GET /me

router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  const [user] = await db
    .select({
      id:    users.id,
      email: users.email,
      role:  users.role,
      orgId: users.orgId,
    })
    .from(users)
    .where(eq(users.id, req.user!.userId));

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    id: user.id,
    email: user.email,
    role: user.role,
    orgId: user.orgId,
  });
});


router.get('/setup-status', async (req: Request, res: Response) => {
	// Deliberate soft-fallback, not error-path boilerplate: the web onboarding
	// probe (routes/api/org-exists) reads `configured` without a status check,
	// so a DB outage must degrade to "unconfigured", not an error body.
	try {
		const [{ count }] = await db
			.select({ count: sql<number>`COUNT(*)`.mapWith(Number) })
			.from(organisations);
		res.json({ configured: count > 0 });
	} catch {
		res.status(500).json({ configured: false });
	}
});

export default router;
