import type { Request, Response, NextFunction } from 'express';
import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../db/schema';
import { verifyJWT, type JWTPayload } from '../lib/auth';

declare global {
    namespace Express {
        interface Request {
            user?: JWTPayload;
        }
    }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    let payload: JWTPayload;
    try {
        payload = verifyJWT(token);
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // JWTs are stateless: confirm the user (and their org) still exist, and use
    // the role from the DB rather than the one baked into the token.
    const [user] = await db
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(and(eq(users.id, payload.userId), eq(users.orgId, payload.orgId)));

    if (!user) {
        return res.status(401).json({ error: 'Account no longer exists' });
    }

    req.user = { ...payload, role: user.role as JWTPayload['role'] };
    next();
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
