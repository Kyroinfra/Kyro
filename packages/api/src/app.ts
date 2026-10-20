// src/app.ts — express application assembly. Kept free of side effects
// (no listen, no startup jobs) so tests can import it standalone.
import express from 'express';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import healthRouter from './routes/health';
import apiRouter from './routes';

const app = express();

// Trust NGINX proxy only
app.set('trust proxy', 1);

// No cors(): the web app talks to the API same-origin through its own
// catch-all proxy (#29/#42) — cross-origin API access is not a surface.
app.use(express.json());
app.use(requestLogger);
app.use('/health', healthRouter);
app.use('/api/v1', apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
