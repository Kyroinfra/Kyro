import crypto from 'crypto';
import { db } from '../db';
import { webhooks, webhookDeliveries } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { getWebhookDeliveryQueue } from './webhookQueue';

export type WebhookEvent =
  | 'extraction.started'
  | 'extraction.completed'
  | 'extraction.failed';

export interface WebhookPayload {
  id: string;          // delivery ID — consumer uses this to deduplicate
  event: WebhookEvent;
  createdAt: string;
  data: Record<string, unknown>;
}

export function signPayload(secret: string, body: string): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
}

/**
 * Enqueues a delivery job for every enabled webhook in the org that
 * subscribes to the given event.
 */
export async function dispatchWebhookEvent(
  orgId: string,
  event: WebhookEvent,
  data: Record<string, unknown>,
): Promise<void> {
  const targets = await db
    .select({ id: webhooks.id, url: webhooks.url, secret: webhooks.secret })
    .from(webhooks)
    .where(and(eq(webhooks.orgId, orgId), eq(webhooks.enabled, true)));

  const eligible = targets.filter((w) =>
    // fetch stored events array and check subscription
    // We'll do a raw check — Drizzle returns the text[] as a JS array
    true // filtered below after fetching events column
  );

  // Re-fetch with events column (simpler than a json contains query for now)
  const targetsWithEvents = await db
    .select({ id: webhooks.id, url: webhooks.url, secret: webhooks.secret, events: webhooks.events })
    .from(webhooks)
    .where(and(eq(webhooks.orgId, orgId), eq(webhooks.enabled, true)));

  const queue = getWebhookDeliveryQueue();
  if (!queue) {
    console.warn(`Webhook dispatch skipped for ${event}: queue unavailable`);
    return;
  }

  for (const webhook of targetsWithEvents) {
    if (!webhook.events.includes(event)) continue;

    // Insert delivery record first — gives us an ID for deduplication
    const [delivery] = await db
      .insert(webhookDeliveries)
      .values({
        webhookId: webhook.id,
        event,
        payload: JSON.stringify({ event, data }), // full payload stored for replay
        status: 'pending',
      })
      .returning({ id: webhookDeliveries.id });

    await queue.add('deliver', {
      deliveryId: delivery.id,
      webhookId: webhook.id,
      url: webhook.url,
      secret: webhook.secret,
      event,
      data,
    });
  }
}
