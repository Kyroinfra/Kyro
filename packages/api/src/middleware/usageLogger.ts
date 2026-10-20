import type { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { usageLogs } from '../db/schema';
import type { AuthedRequest } from './auth';

export function usageLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const originalSend = res.send;

  res.send = function (body?: any): Response {
    const responseTime = Date.now() - startTime;
    const orgId = (req as AuthedRequest).orgId;
    const apiKeyId = (req as AuthedRequest).apiKeyId;

    setImmediate(async () => {
      try {
        const bytesIn = parseInt(req.headers['content-length'] as string || '0', 10);
        const bytesOut = res.getHeader('Content-Length') ? parseInt(res.getHeader('Content-Length') as string, 10) : 0;

        await db.insert(usageLogs).values({
          orgId:      orgId!, // set for every keyed route; absent → DB rejects, caught below
          apiKeyId:   apiKeyId ?? null,
          endpoint:   req.originalUrl || req.url,
          method:     req.method,
          statusCode: res.statusCode,
          responseMs: responseTime,
          bytesIn:    bytesIn,
          bytesOut:   bytesOut,
        });
      } catch (error) {
        console.error('Failed to log usage:', error);
      }
    });

    return originalSend.call(this, body);
  };

  next();
}
