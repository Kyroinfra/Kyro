import { Router } from 'express';
import authRouter from './auth';
import orgRouter from './org';
import keysRouter from './keys';
import filesRouter from './files';
import usageRouter from './usage';
import webhookRouter from './webhook'
import { usageLoggerMiddleware } from '../../middleware/usageLogger';
import { rateLimitMiddleware } from '../../middleware/rateLimit';

const v1Router = Router();

v1Router.use('/auth', authRouter);
v1Router.use('/org', orgRouter);
v1Router.use('/keys', keysRouter);
v1Router.use('/files', rateLimitMiddleware, usageLoggerMiddleware, filesRouter);
v1Router.use('/usage', usageRouter);
v1Router.use('/webhooks', webhookRouter);  

export default v1Router;
