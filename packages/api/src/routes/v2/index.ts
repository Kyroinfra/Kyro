import { Router } from 'express';
import authRouter from '../v1/auth';
import orgRouter from '../v1/org';
import keysRouter from '../v1/keys';
import filesRouter from '../v1/files';
import usageRouter from '../v1/usage';
import { usageLoggerMiddleware } from '../../middleware/usageLogger';
import { rateLimitMiddleware } from '../../middleware/rateLimit';

const v2Router = Router();

v2Router.use('/auth', authRouter);
v2Router.use('/org', orgRouter);
v2Router.use('/keys', keysRouter);
v2Router.use('/files', rateLimitMiddleware, usageLoggerMiddleware, filesRouter);
v2Router.use('/usage', usageRouter);

export default v2Router;