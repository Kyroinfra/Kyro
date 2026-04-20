import { Router, Request, Response } from 'express';
import config from '../config';
import { healthCheck as dbHealthCheck } from '../db';
import { healthCheck as redisHealthCheck } from '../db/redis';

const router = Router();

const startTime = Date.now();

router.get('/', async (req: Request, res: Response) => {
  const dbHealthy = await dbHealthCheck();
  const redisConfigured = !!config.redisUrl;
  const redisHealthy = redisConfigured ? await redisHealthCheck() : true;

  const allHealthy = dbHealthy && (redisConfigured ? redisHealthy : true);
  const status = allHealthy ? 'ok' : 'degraded';
  const statusCode = allHealthy ? 200 : 503;

  res.status(statusCode).json({
    status,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    test: "Kyro",
    timestamp: new Date().toISOString(),
    database: dbHealthy ? 'connected' : 'disconnected',
    redis: redisConfigured ? (redisHealthy ? 'connected' : 'disconnected') : 'optional',
  });
});

export default router;
