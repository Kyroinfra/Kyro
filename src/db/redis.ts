import Redis from 'ioredis';
import config from '../config';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      host: config.redisHost || 'localhost',
      port: config.redisPort || 6379,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    redis.on('connect', () => {
      console.log('Redis connected');
    });
  }
  return redis;
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

export async function healthCheck(): Promise<boolean> {
  try {
    const result = await getRedis().ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}
