import { Router, type Request, type Response } from 'express';
import { healthCheck as dbHealthCheck } from '../db';

const router = Router();

const startTime = Date.now();

router.get('/', async (req: Request, res: Response) => {
  const dbHealthy = await dbHealthCheck();
  const status = dbHealthy ? 'ok' : 'degraded';
  const statusCode = dbHealthy ? 200 : 503;

  res.status(statusCode).json({
    status,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    database: dbHealthy ? 'connected' : 'disconnected',
  });
});

export default router;
