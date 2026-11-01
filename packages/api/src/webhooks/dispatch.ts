import { db } from '../db';
import { webhooks, webhookDeliveries } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { deliverWebhook } from '../lib/webhookDelivery';

/**
 * Terminal file events only (#40 — the 9-event list is cut to the two
 * states a self-hosted RAG consumer needs):
 *
 *   - file.ready   → a file is queryable (chunks persisted, status 'ready')
 *   - file.failed  → a file will never become queryable in this pass
 *                    (extraction or embedding failed), including files
 *                    skipped for having no extractable text
 *
 * Per-file progress (started/completed + collection rollups) is not
 * webhook-worthy — consumers poll GET /files/:id for intermediate state.
 */

export type WebhookEvent =
    | 'file.ready'
    | 'file.failed';

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
        .select({
            id: webhooks.id,
            url: webhooks.url,
            secret: webhooks.secret,
            events: webhooks.events,
        })
        .from(webhooks)
        .where(and(eq(webhooks.orgId, orgId), eq(webhooks.enabled, true)));

    for (const webhook of targets) {
        if (!webhook.events.includes(event)) {continue;}

        const [delivery] = await db
            .insert(webhookDeliveries)
            .values({
                webhookId: webhook.id,
                event,
                payload: JSON.stringify({ event, data }),
                status: 'pending',
            })
            .returning({ id: webhookDeliveries.id });

        deliverWebhook({
            deliveryId: delivery.id,
            webhookId: webhook.id,
            url: webhook.url,
            secret: webhook.secret,
            event,
            data,
        });
    }
}
