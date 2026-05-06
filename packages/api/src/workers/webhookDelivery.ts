import { Worker, UnrecoverableError } from 'bullmq';
import { getBullMQRedis } from '../db/redis';
import { db } from '../db';
import { webhookDeliveries } from '../db/schema';
import { eq } from 'drizzle-orm';
import { signPayload, WebhookPayload } from '../lib/webhook';

interface DeliveryJobData {
  deliveryId: string;
  webhookId: string;
  url: string;
  secret: string;
  event: string;
  data: Record<string, unknown>;
}

const TIMEOUT_MS = 10_000;

async function deliver(job: { data: DeliveryJobData }): Promise<void> {
  const { deliveryId, url, secret, event, data } = job.data;

  const payload: WebhookPayload = {
    id: deliveryId,
    event: event as WebhookPayload['event'],
    createdAt: new Date().toISOString(),
    data,
  };

  const body = JSON.stringify(payload);
  const signature = signPayload(secret, body);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let statusCode: number;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Kyro-Signature': signature,
        'X-Kyro-Event': event,
        'User-Agent': 'Kyro-Webhooks/1.0',
      },
      body,
      signal: controller.signal,
    });
    statusCode = response.status;
  } finally {
    clearTimeout(timeout);
  }

  // Mark delivery attempt in DB
  await db
    .update(webhookDeliveries)
    .set({
      status: statusCode >= 200 && statusCode < 300 ? 'delivered' : 'failed',
      statusCode,
      attempts: db.$count(webhookDeliveries, eq(webhookDeliveries.id, deliveryId)),
      lastAttemptAt: new Date(),
    })
    .where(eq(webhookDeliveries.id, deliveryId));

  // Non-2xx = retriable failure (BullMQ will retry per backoff config)
  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`Webhook endpoint returned ${statusCode}`);
  }
}

async function start() {
  const connection = getBullMQRedis();

  const worker = new Worker<DeliveryJobData>('webhook-delivery', deliver, {
    connection,
    concurrency: 10,
  });

  worker.on('completed', (job) => {
    console.log(`Webhook: delivery ${job.data.deliveryId} succeeded`);
  });

  worker.on('failed', async (job, error) => {
    if (!job) return;
    const isFinal = job.attemptsMade >= (job.opts.attempts ?? 5);
    console.error(
      `Webhook: delivery ${job.data.deliveryId} attempt ${job.attemptsMade} failed: ${error.message}`,
    );
    if (isFinal) {
      await db
        .update(webhookDeliveries)
        .set({ status: 'exhausted' })
        .where(eq(webhookDeliveries.id, job.data.deliveryId))
        .catch((e) => console.error('Webhook: failed to mark delivery exhausted:', e));
    }
  });

  worker.on('error', (e) => console.error('Webhook worker error:', e));

  console.log('Webhook delivery worker started');

  const shutdown = async (sig: string) => {
    console.log(`Webhook worker: ${sig}, shutting down`);
    await worker.close();
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start();
