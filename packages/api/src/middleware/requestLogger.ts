import morgan from 'morgan';
import config from '../config';

const morganFormat = config.nodeEnv === 'production' ? 'combined' : 'dev';

export const requestLogger = morgan(morganFormat);
