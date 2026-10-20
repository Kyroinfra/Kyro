// src/app.ts — express application assembly. Kept free of side effects
// (no listen, no startup jobs) so tests can import it standalone.
import express from 'express';
import cors from 'cors';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import healthRouter from './routes/health';
import apiRouter from './routes';

const app = express();

// Trust NGINX proxy only
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());
app.use(requestLogger);
app.use('/health', healthRouter);
app.use('/api/v1', apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
