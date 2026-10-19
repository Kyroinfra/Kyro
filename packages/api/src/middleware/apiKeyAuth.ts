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

  const hash = hashApiKey(rawKey);

  try {
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
  } catch (error) {
    console.error('API key validation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
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
