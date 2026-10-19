/**
 * In-process webhook delivery (replaces the BullMQ 'webhook-delivery' worker
 * per the RFC #49 decision — drop Redis).
 *
 * Concurrency is bounded by a semaphore; a delivery retries up to 5 times
 * with exponential backoff (10s, 20s, 40s, 80s — same schedule shape the old
 * BullMQ job options used). Each attempt is recorded in webhook_deliveries
 * (status / statusCode / attempts / lastAttemptAt), so nothing is silently
 * dropped: a failed delivery ends as status 'failed' with its attempts count.
 */
import crypto from 'crypto';
import { db } from '../db';
import { webhookDeliveries } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { Semaphore } from './semaphore';

export interface DeliveryInput {
  deliveryId: string;
  webhookId:  string;
  url:        string;
  secret:     string;
  event:      string;
  data:       Record<string, unknown>;
}

/** Same wire shape lib/webhook.ts documents; kept here to avoid an import cycle. */
interface DeliveryPayload {
  id:        string;
  event:     string;
  createdAt: string;
  data:      Record<string, unknown>;
}

function signPayload(secret: string, body: string): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
}

const deliverySlots = new Semaphore(5);
const TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 10_000;

/** Fire-and-forget; failures are recorded in the DB, never thrown. */
export function deliverWebhook(input: DeliveryInput): void {
  void deliverySlots
    .run(() => deliverWithRetries(input))
    .catch((err) => console.error(`Webhook: delivery ${input.deliveryId} crashed:`, err));
}

async function deliverWithRetries(input: DeliveryInput): Promise<void> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const delivered = await attemptOnce(input);
    if (delivered) {
      console.log(`Webhook: delivery ${input.deliveryId} succeeded (attempt ${attempt})`);
      return;
    }
    if (attempt < MAX_ATTEMPTS) {
      await sleep(BASE_BACKOFF_MS * 2 ** (attempt - 1));
    }
  }
  console.error(`Webhook: delivery ${input.deliveryId} failed after ${MAX_ATTEMPTS} attempts`);
  // Terminal state — the per-attempt updates already set 'failed' with the
  // final statusCode recorded; make sure it stays failed if the last attempt
  // failed at the network layer.
  await db
    .update(webhookDeliveries)
    .set({ status: 'failed' })
    .where(eq(webhookDeliveries.id, input.deliveryId));
}

async function attemptOnce(input: DeliveryInput): Promise<boolean> {
  const { deliveryId, url, secret, event, data } = input;

  const payload: DeliveryPayload = {
    id: deliveryId,
    event,
    createdAt: new Date().toISOString(),
    data,
  };

  const body = JSON.stringify(payload);
  const signature = signPayload(secret, body);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

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

    const ok = response.status >= 200 && response.status < 300;

    await db
      .update(webhookDeliveries)
      .set({
        status: ok ? 'delivered' : 'failed',
        statusCode: response.status,
        attempts: sql`${webhookDeliveries.attempts} + 1`,
        lastAttemptAt: new Date(),
      })
      .where(eq(webhookDeliveries.id, deliveryId));

    return ok;
  } catch (err) {
    // Network error / DNS failure / timeout (abort) — record the attempt.
    console.error(`Webhook: delivery ${deliveryId} attempt failed:`, err);
    await db
      .update(webhookDeliveries)
      .set({
        status: 'failed',
        attempts: sql`${webhookDeliveries.attempts} + 1`,
        lastAttemptAt: new Date(),
      })
      .where(eq(webhookDeliveries.id, deliveryId));
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
