import { Request, Response, NextFunction } from 'express';
import { query } from '../db';
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
    const result = await query<{
      id: string;
      org_id: string;
      scopes: string[];
    }>(
      `SELECT id, org_id, scopes FROM api_keys 
       WHERE key_hash = $1 AND revoked_at IS NULL`,
      [hash]
    );

    if (result.length === 0) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    const apiKey = result[0];
    req.orgId = apiKey.org_id;
    req.apiKeyId = apiKey.id;
    req.apiKeyScopes = apiKey.scopes || ['read'];

    await query(
      'UPDATE api_keys SET last_used_at = NOW() WHERE id = $1',
      [apiKey.id]
    );

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
