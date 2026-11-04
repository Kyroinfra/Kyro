// routes/index.ts — the one flat API surface, mounted at /api/v1.
//
// Exactly one router set; middleware is assembled per family here:
//   session (JWT) family — auth, org, keys, usage, webhooks: mounted bare.
//   API-key family — files, collections, search, ask: auth → rateLimit →
//     usageLogger (collections keep only auth).

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
