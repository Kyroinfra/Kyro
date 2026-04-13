import express from 'express';
import cors from 'cors';
import config from './config';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import healthRouter from './routes/health';
import authRouter from './routes/auth';
import orgRouter from './routes/org';
import keysRouter from './routes/keys';
import filesRouter from './routes/files';
import usageRouter from './routes/usage';
import { usageLoggerMiddleware } from './middleware/usageLogger';
import { rateLimitMiddleware } from './middleware/rateLimit';
import { runMigrations } from './db/migrate';

const app = express();

// Trust NGINX proxy only 
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());
app.use(requestLogger);
app.use('/health', healthRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/org', orgRouter);
app.use('/api/v1/keys', keysRouter);
app.use('/api/v1/files', rateLimitMiddleware, usageLoggerMiddleware, filesRouter);
app.use('/api/v1/usage', usageRouter);
app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  try {
    await runMigrations();
    console.log('Database migrations completed');
  } catch (error) {
    console.error('Failed to run migrations:', error);
    process.exit(1);
  }

  const server = app.listen(config.port, () => {
    console.log(`[${config.nodeEnv}] Server running on port ${config.port}`);
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

start();
export default app;
