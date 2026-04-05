import Redis from 'ioredis';
import config from '../config';

let redis: Redis | null = null;
let redisAvailable = false;

export function getRedis(): Redis {
  if (!redis) {
    if (!config.redisUrl) {
      throw new Error('REDIS_URL environment variable is required');
    }

    redis = new Redis(config.redisUrl, {  // ← use URL directly
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      commandTimeout: 3000,
      retryStrategy(times: number) {
        if (times > 3) return null;
        return Math.min(times * 500, 2000);
      },
    });

    redis.on('error', (err: Error) => {
      redisAvailable = false;
      console.error('Redis connection error:', err.message); // will now show real error
    });
    redis.on('connect', () => {
      redisAvailable = true;
      console.log('Redis connected');
    });
    redis.on('ready', () => {
      redisAvailable = true;
    });
    redis.on('close', () => {
      redisAvailable = false;
    });
  }
  return redis;
}

// rest of file unchanged

export function isRedisAvailable(): boolean {
  return redisAvailable && redis?.status === 'ready';
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    redisAvailable = false;
  }
}

export async function healthCheck(): Promise<boolean> {
  try {
    const result = await Promise.race([
      getRedis().ping(),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('Redis health check timeout')), 3000)
      ),
    ]);
    return result === 'PONG';
  } catch {
    return false;
  }
}
