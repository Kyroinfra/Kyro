import dotenv from 'dotenv';

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  jwtSecret: string;
  redisUrl: string;  // make it required, not optional
}

function getRequired(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getRequiredAsInt(key: string): number {
  const value = getRequired(key);
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid integer value for ${key}: ${value}`);
  }
  return parsed;
}

const config: Config = {
  port: getRequiredAsInt('PORT'),
  nodeEnv: getRequired('NODE_ENV'),
  databaseUrl: getRequired('DATABASE_URL'),
  jwtSecret: getRequired('JWT_SECRET'),
  redisUrl: getRequired('REDIS_URL'),  // fail fast if missing
};

export default config;
