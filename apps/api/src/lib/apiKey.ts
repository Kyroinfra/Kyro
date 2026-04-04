import crypto from 'crypto';

export interface ApiKeyResult {
  raw: string;
  hash: string;
  prefix: string;
}

export function generateApiKey(): ApiKeyResult {
  const raw = `kyro_live_${crypto.randomBytes(32).toString('hex')}`;
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const prefix = raw.substring(0, 16);
  return { raw, hash, prefix };
}

export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

export function getKeyPrefix(rawKey: string): string {
  return rawKey.substring(0, 16);
}
