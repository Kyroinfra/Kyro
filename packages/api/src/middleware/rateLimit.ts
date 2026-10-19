/**
 * In-memory sliding-window rate limiter.
 *
 * 100 requests per key per minute — the same budget the old Redis-backed
 * limiter used. Per process by design: replicas do not share a budget
 * (documented trade-off of the no-Redis architecture, RFC #49 decision).
 */
import type { Request, Response, NextFunction } from 'express';

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 100;
/** Prune stale keys opportunistically; the map is otherwise self-draining. */
const PRUNE_THRESHOLD = 10_000;

const hits = new Map<string, number[]>();

let requestCount = 0;

function pruneStale(now: number): void {
  for (const [key, timestamps] of hits) {
    while (timestamps.length > 0 && timestamps[0] <= now - WINDOW_MS) {
      timestamps.shift();
    }
    if (timestamps.length === 0) {
      hits.delete(key);
    }
  }
}

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  const key = (req as any).apiKeyId || req.ip || 'unknown';
  const now = Date.now();

  requestCount++;
  if (requestCount % 1000 === 0 && hits.size > PRUNE_THRESHOLD) {
    pruneStale(now);
  }

  let timestamps = hits.get(key);
  if (!timestamps) {
    timestamps = [];
    hits.set(key, timestamps);
  }

  while (timestamps.length > 0 && timestamps[0] <= now - WINDOW_MS) {
    timestamps.shift();
  }

  if (timestamps.length >= MAX_REQUESTS) {
    const retryAfterSec = Math.ceil((timestamps[0] + WINDOW_MS - now) / 1000);
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: retryAfterSec,
    });
    return;
  }

  timestamps.push(now);
  next();
}
