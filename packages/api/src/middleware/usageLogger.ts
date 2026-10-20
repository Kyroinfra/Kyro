import type { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { usageLogs } from '../db/schema';
import type { AuthedRequest } from './auth';

// 'finish' fires once the response is fully flushed, for every completion
// shape (#31): res.json()/res.send() bodies, piped file downloads
// (fs.createReadStream().pipe(res)) and SSE streams written with
// res.write()/res.end() (POST /ask). The old res.send monkey-patch never
// saw the streaming shapes and skipped them entirely.
export function usageLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  res.once('finish', () => {
    setImmediate(async () => {
      try {
        const orgId = (req as AuthedRequest).orgId;
        const apiKeyId = (req as AuthedRequest).apiKeyId;
        const bytesIn = parseInt((req.headers['content-length'] as string) || '0', 10);

        // Streams without a Content-Length response header (SSE) simply log
        // 0 — capturing actual written bytes is out of scope for now.
        const contentLength = res.getHeader('Content-Length');
        const bytesOut = contentLength ? parseInt(String(contentLength), 10) : 0;

        await db.insert(usageLogs).values({
          orgId:      orgId!, // set for every keyed route; absent → DB rejects, caught below
          apiKeyId:   apiKeyId ?? null,
          endpoint:   req.originalUrl || req.url,
          method:     req.method,
          statusCode: res.statusCode,
          responseMs: Date.now() - startTime,
          bytesIn:    bytesIn,
          bytesOut:   bytesOut,
        });
      } catch (error) {
        console.error('Failed to log usage:', error);
      }
    });
  });

  next();
}
