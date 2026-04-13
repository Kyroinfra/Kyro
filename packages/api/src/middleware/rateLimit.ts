import { RateLimiterRedis, RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { getRedis, isRedisAvailable } from '../db/redis';
import { Request, Response, NextFunction } from 'express';

let rateLimiter: RateLimiterRedis | RateLimiterMemory | null = null;
let useMemoryFallback = false;

export function getRateLimiter(): RateLimiterRedis | RateLimiterMemory {
  const redisAvailable = isRedisAvailable();

  if (useMemoryFallback) {
    if (!rateLimiter || rateLimiter instanceof RateLimiterRedis) {
      rateLimiter = new RateLimiterMemory({
        keyPrefix: 'rl:',
        points: 100,
        duration: 60,
      });
    }
    return rateLimiter;
  }

  if (!redisAvailable) {
    console.warn('Redis unavailable, using memory rate limiter');
    useMemoryFallback = true;
    rateLimiter = new RateLimiterMemory({
      keyPrefix: 'rl:',
      points: 100,
      duration: 60,
    });
    return rateLimiter;
  }

  if (!rateLimiter) {
    try {
      const redis = getRedis();
      rateLimiter = new RateLimiterRedis({
        storeClient: redis,
        keyPrefix: 'rl:',
        points: 100,
        duration: 60,
        blockDuration: 0,
      });
    } catch (error) {
      console.warn('Failed to create Redis rate limiter, using memory fallback');
      useMemoryFallback = true;
      rateLimiter = new RateLimiterMemory({
        keyPrefix: 'rl:',
        points: 100,
        duration: 60,
      });
    }
  }
  return rateLimiter;
}

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  const key = (req as any).apiKeyId || req.ip || 'unknown';
  const limiter = getRateLimiter();

  limiter.consume(key)
    .then(() => {
      next();
    })
    .catch((rejRes: RateLimiterRes) => {
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: rejRes.msBeforeNext / 1000,
      });
    });
}
