import type { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { apiKeys } from '../db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { hashApiKey } from '../lib/apiKey';

export interface ApiKeyRequest extends Request {
  orgId?: string;
  apiKeyId?: string;
  apiKeyScopes?: string[];
}

export async function apiKeyAuthMiddleware(
  req: ApiKeyRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const rawKey = req.headers['x-api-key'] as string;

  if (!rawKey) {
    res.status(401).json({ error: 'API key required' });
    return;
  }

  // Note: an async middleware — with Express 5, a rejected DB query is
  // auto-forwarded to next(err) and lands in errorHandler; no local
  // try/catch needed anymore.
  const hash = hashApiKey(rawKey);

  const result = await db
    .select({
      id:     apiKeys.id,
      orgId:  apiKeys.orgId,
      scopes: apiKeys.scopes,
    })
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, hash), isNull(apiKeys.revokedAt)));

  if (result.length === 0) {
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }

  const apiKey = result[0];
  req.orgId = apiKey.orgId;
  req.apiKeyId = apiKey.id;
  req.apiKeyScopes = apiKey.scopes || ['read'];

  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, apiKey.id));

  next();
}

export function requireScope(scope: string) {
  return (req: ApiKeyRequest, res: Response, next: NextFunction): void => {
    if (!req.apiKeyScopes?.includes(scope) && !req.apiKeyScopes?.includes('admin')) {
      res.status(403).json({ error: `Required scope: ${scope}` });
      return;
    }
    next();
  };
}
