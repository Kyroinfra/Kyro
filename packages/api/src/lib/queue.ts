import { Queue, QueueOptions } from 'bullmq';
import { getRedis, isRedisAvailable } from '../db/redis';

let queueInstance: Queue | null = null;

function createQueue(): Queue | null {
  if (!isRedisAvailable()) {
    console.warn('Queue: Redis not available, queue will not be created');
    return null;
  }

  const redisConnection = getRedis();
  if (!redisConnection) {
    return null;
  }

  const defaultQueueOptions: QueueOptions = {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: {
        count: 100,
        age: 24 * 3600,
      },
      removeOnFail: {
        count: 500,
        age: 7 * 24 * 3600,
      },
    },
  };

  return new Queue('text-extraction', defaultQueueOptions);
}

export function getTextExtractionQueue(): Queue | null {
  if (!queueInstance) {
    queueInstance = createQueue();
  }
  return queueInstance;
}

export const textExtractionQueue = {
  add: async (jobName: string, data: any) => {
    const queue = getTextExtractionQueue();
    if (!queue) {
      console.warn('Queue: Cannot add job, queue not available');
      return null;
    }
    return queue.add(jobName, data);
  }
};

export const QUEUE_NAMES = {
  TEXT_EXTRACTION: 'text-extraction',
} as const;