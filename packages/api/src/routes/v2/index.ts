// routes/v2/index.ts  (full replacement)
import { Router } from 'express';
import authRouter    from '../v1/auth';
import orgRouter     from '../v1/org';
import keysRouter    from '../v1/keys';
import filesRouter   from './files';
import semanticRouter from './semantic';   // ← NEW
import usageRouter   from '../v1/usage';
import webhookRouter from '../v1/webhook';
import { usageLoggerMiddleware } from '../../middleware/usageLogger';
import { rateLimitMiddleware }   from '../../middleware/rateLimit';

const v2Router = Router();

v2Router.use('/auth',     authRouter);
v2Router.use('/org',      orgRouter);
v2Router.use('/keys',     keysRouter);
v2Router.use('/usage',    usageRouter);
v2Router.use('/webhooks', webhookRouter);

// semantic router MUST be mounted before filesRouter so that
// /files/semantic-search and /files/ask don't get swallowed by /files/:id
v2Router.use(
  '/files',
  rateLimitMiddleware,
  usageLoggerMiddleware,
  semanticRouter,  // handles /semantic-search, /ask, /:id/embed
  filesRouter,     // handles CRUD + /search + /:id/text + /:id/extract
);

export default v2Router;
