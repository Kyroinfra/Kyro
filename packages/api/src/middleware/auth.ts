import type { Request, Response, NextFunction } from 'express';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../db';
import { apiKeys, users } from '../db/schema';
import { verifyJWT, type JWTPayload } from '../lib/auth';
import { hashApiKey } from '../lib/apiKey';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      orgId?: string;
      credential?: 'jwt' | 'apiKey';
      scopes?: string[];
      apiKeyId?: string;
    }
  }
}

export interface AuthedRequest extends Request {
  orgId?: string;
  credential?: 'jwt' | 'apiKey';
  scopes?: string[];
  apiKeyId?: string;
}

// Role -> scopes: the JWT role narrows or widens nothing arbitrarily —
// owners/admins manage, members read. Read fresh from the DB per request
// (never trusted from the token), so a role change takes effect immediately.
const ROLE_SCOPES: Record<JWTPayload['role'], string[]> = {
  owner:  ['read', 'write'],
  admin:  ['read', 'write'],
  member: ['read'],
};

export function scopesForRole(role: JWTPayload['role']): string[] {
  return ROLE_SCOPES[role] ?? ['read'];
}

/**
 * The acting human user for a request: the JWT principal directly; for an
 * API key, the key's owning user (needed for uploadedBy-style attribution).
 */
export async function resolveUserId(req: AuthedRequest): Promise<string | undefined> {
  if (req.credential === 'jwt') {
    return req.user?.userId;
  }
  if (!req.apiKeyId) {
    return undefined;
  }
  const [row] = await db
    .select({ userId: apiKeys.userId })
    .from(apiKeys)
    .where(eq(apiKeys.id, req.apiKeyId));
  return row?.userId;
}

/**
 * The single auth gate (#29): accepts `X-API-Key` OR `Authorization: Bearer`,
 * both normalized to `{ orgId, credential, scopes }` (+ `user` / `apiKeyId`
 * depending on the credential).
 *
 * Precedence: an explicit `X-API-Key` wins — it is the narrower credential,
 * and clients that send both (e.g. the web download proxy) keep working.
 */
export async function authMiddleware(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const rawApiKey = req.headers['x-api-key'] as string | undefined;
  const authHeader = req.headers.authorization;

  if (!rawApiKey && (!authHeader || !authHeader.startsWith('Bearer '))) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (rawApiKey) {
    // Note: an async middleware — with Express 5, a rejected DB query is
    // auto-forwarded to next(err) and lands in errorHandler; no local
    // try/catch needed anymore.
    const [apiKey] = await db
      .select({
        id:     apiKeys.id,
        orgId:  apiKeys.orgId,
        scopes: apiKeys.scopes,
      })
      .from(apiKeys)
      .where(and(eq(apiKeys.keyHash, hashApiKey(rawApiKey)), isNull(apiKeys.revokedAt)));

    if (!apiKey) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    req.orgId      = apiKey.orgId;
    req.apiKeyId   = apiKey.id;
    req.scopes     = apiKey.scopes?.length ? apiKey.scopes : ['read'];
    req.credential = 'apiKey';

    await db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, apiKey.id));

    next();
    return;
  }

  let payload: JWTPayload;
  try {
    payload = verifyJWT(authHeader!.substring(7));
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  // JWTs are stateless: confirm the user (and their org) still exist, and use
  // the role from the DB rather than the one baked into the token.
  const [user] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(and(eq(users.id, payload.userId), eq(users.orgId, payload.orgId)));

  if (!user) {
    res.status(401).json({ error: 'Account no longer exists' });
    return;
  }

  const role = user.role as JWTPayload['role'];

  req.user       = { ...payload, role };
  req.orgId      = payload.orgId;
  req.scopes     = scopesForRole(role);
  req.credential = 'jwt';

  next();
}

export function requireScope(scope: 'read' | 'write') {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.scopes?.includes(scope)) {
      res.status(403).json({ error: `Required scope: ${scope}` });
      return;
    }
    next();
  };
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}
