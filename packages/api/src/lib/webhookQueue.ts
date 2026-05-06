import { Queue } from 'bullmq';
import { getBullMQRedis } from '../db/redis';
import { isRedisAvailable } from '../db/redis';

let queueInstance: Queue | null = null;

export function getWebhookDeliveryQueue(): Queue | null {
  if (!isRedisAvailable()) return null;

  if (!queueInstance) {
    queueInstance = new Queue('webhook-delivery', {
      connection: getBullMQRedis(),
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 10_000 }, // 10s, 20s, 40s, 80s, 160s
        removeOnComplete: { count: 200, age: 7 * 24 * 3600 },
        removeOnFail: { count: 500, age: 30 * 24 * 3600 },
      },
    });
  }
  return queueInstance;
}

export const WEBHOOK_QUEUE_NAME = 'webhook-delivery';
