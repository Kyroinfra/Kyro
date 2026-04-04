import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import { ApiKeyRequest } from '../middleware/apiKeyAuth';

export function usageLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const originalSend = res.send;

  res.send = function (body?: any): Response {
    const responseTime = Date.now() - startTime;
    const orgId = (req as ApiKeyRequest).orgId;
    const apiKeyId = (req as ApiKeyRequest).apiKeyId;

    setImmediate(async () => {
      try {
        const bytesIn = parseInt(req.headers['content-length'] as string || '0', 10);
        const bytesOut = res.getHeader('Content-Length') ? parseInt(res.getHeader('Content-Length') as string, 10) : 0;

        await pool.query(
          `INSERT INTO usage_logs (org_id, api_key_id, endpoint, method, status_code, response_ms, bytes_in, bytes_out)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [orgId, apiKeyId, req.originalUrl || req.url, req.method, res.statusCode, responseTime, bytesIn, bytesOut]
        );
      } catch (error) {
        console.error('Failed to log usage:', error);
      }
    });

    return originalSend.call(this, body);
  };

  next();
}
