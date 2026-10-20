// routes/index.ts — the one flat API surface, mounted at /api/v1.
//
// v1/v2 were flattened in #28: v2 re-mounted the same v1 routers, and
// v1/files.ts duplicated a subset of v2's files router. There is now exactly
// one router set and one place where middleware is assembled per family:
//
//   session (JWT) family — auth, org, keys, usage, webhooks: mounted bare,
//     exactly as v1/v2 mounted them.
//   API-key family — files, collections, search, ask: apiKeyAuth → rateLimit
//     → usageLogger / or whatever prefix each had before the flatten
//     (collections kept only apiKeyAuth, as v2 mounted it).
//
// No debug logging middlewares — removed with #28.

import { Router } from 'express';
import authRouter from './auth';
import orgRouter from './org';
import keysRouter from './keys';
import filesRouter from './files';
import searchRouter from './search';
import askRouter from './ask';
import usageRouter from './usage';
import webhookRouter from './webhook';
import collectionsRouter from './collections';
import { usageLoggerMiddleware } from '../middleware/usageLogger';
import { authMiddleware } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rateLimit';

const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/org', orgRouter);
apiRouter.use('/keys', keysRouter);
apiRouter.use('/usage', usageRouter);
apiRouter.use('/webhooks', webhookRouter);

apiRouter.use(
  '/files',
  authMiddleware,
  rateLimitMiddleware,
  usageLoggerMiddleware,
  filesRouter,
);
apiRouter.use('/collections', authMiddleware, collectionsRouter);
apiRouter.use('/search', authMiddleware, rateLimitMiddleware, usageLoggerMiddleware, searchRouter);
apiRouter.use('/ask', authMiddleware, rateLimitMiddleware, usageLoggerMiddleware, askRouter);

export default apiRouter;
