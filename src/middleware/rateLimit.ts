import { RateLimiterRedis, RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { getRedis } from '../db/redis';
import { Request, Response, NextFunction } from 'express';

let rateLimiter: RateLimiterRedis | RateLimiterMemory | null = null;

export function getRateLimiter(): RateLimiterRedis | RateLimiterMemory {
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
      console.warn('Redis not available, using memory rate limiter');
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
