import express from 'express';
import cors from 'cors';
import config from './config';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import healthRouter from './routes/health';
import v1Router from './routes/v1';
// import { runMigrations } from './db/migrate';

const app = express();

// Trust NGINX proxy only 
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());
app.use(requestLogger);
app.use('/health', healthRouter);
app.use('/api/v1', v1Router);
app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  // try {
  //   await runMigrations();
  //   console.log('Database migrations completed');
  // } catch (error) {
  //   console.error('Failed to run migrations:', error);
  //   process.exit(1);
  // }

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
