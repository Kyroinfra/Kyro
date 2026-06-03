import crypto from 'crypto';
import { db } from '../db';
import { webhooks, webhookDeliveries, collectionFiles, collections, files } from '../db/schema';
import { eq, and, inArray, notInArray } from 'drizzle-orm';
import { getWebhookDeliveryQueue } from './webhookQueue';

export type WebhookEvent =
    // ── Extraction ──────────────────────────────────────────────────────────
    | 'extraction.started'
    | 'extraction.completed'
    | 'extraction.failed'
    // ── Per-file embedding ──────────────────────────────────────────────────
    | 'embedding.started'
    | 'embedding.completed'
    | 'embedding.failed'
    | 'embedding.skipped'
    // ── Collection-level embedding ──────────────────────────────────────────
    | 'collection.embedding_completed'   // all files in collection settled
    | 'collection.embedding_failed';

export interface WebhookPayload {
    id: string;           // delivery ID — consumer uses this to deduplicate
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
    const queue = getWebhookDeliveryQueue();
    if (!queue) {
        console.warn(`Webhook dispatch skipped for ${event}: queue unavailable`);
        return;
    }

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
        if (!webhook.events.includes(event)) continue;

        const [delivery] = await db
            .insert(webhookDeliveries)
            .values({
                webhookId: webhook.id,
                event,
                payload: JSON.stringify({ event, data }),
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

// ── Collection-level embedding rollup ─────────────────────────────────────────

/**
 * Called after a file's embedding status is finalised (completed | failed | skipped).
 *
 * For every collection that contains this file:
 *   - If the collection now has at least one 'failed' file  → fire collection.embedding_failed
 *   - Else if every file is settled (completed | skipped)   → fire collection.embedding_completed
 *
 * Both events include a per-file status breakdown so consumers know exactly
 * which file caused a failure.
 */
export async function dispatchCollectionEmbeddingEvents(
    orgId: string,
    fileId: string,
): Promise<void> {
    // 1. Find every collection that contains this file
    const memberships = await db
        .select({ collectionId: collectionFiles.collectionId })
        .from(collectionFiles)
        .where(eq(collectionFiles.fileId, fileId));

    if (memberships.length === 0) return;

    const collectionIds = memberships.map(m => m.collectionId);

    for (const collectionId of collectionIds) {
        // 2. Load the collection (verify it belongs to this org)
        const [collection] = await db
            .select({ id: collections.id, name: collections.name })
            .from(collections)
            .where(and(eq(collections.id, collectionId), eq(collections.orgId, orgId)));

        if (!collection) continue;

        // 3. Load all files in this collection with their current embedding status
        const memberFiles = await db
            .select({
                fileId: files.id,
                fileName: files.name,
                embeddingStatus: files.embeddingStatus,
            })
            .from(collectionFiles)
            .innerJoin(files, eq(files.id, collectionFiles.fileId))
            .where(
                and(
                    eq(collectionFiles.collectionId, collectionId),
                    // only count non-deleted files
                    // (deleted files are excluded — if they were removed the collection
                    //  should not be blocked waiting for them)
                ),
            );

        const SETTLED = ['completed', 'skipped', 'failed'] as const;
        const IN_FLIGHT = ['pending', 'embedding'] as const;

        const statusCounts = {
            completed: 0,
            skipped: 0,
            failed: 0,
            pending: 0,
            embedding: 0,
        } as Record<string, number>;

        const failedFiles: Array<{ fileId: string; fileName: string }> = [];

        for (const f of memberFiles) {
            const s = f.embeddingStatus ?? 'pending';
            statusCounts[s] = (statusCounts[s] ?? 0) + 1;
            if (s === 'failed') {
                failedFiles.push({ fileId: f.fileId, fileName: f.fileName });
            }
        }

        const totalFiles = memberFiles.length;
        const settledCount = (statusCounts.completed ?? 0) +
            (statusCounts.skipped ?? 0) +
            (statusCounts.failed ?? 0);
        const allSettled = settledCount === totalFiles && totalFiles > 0;

        if (!allSettled) {
            // Still waiting for other files in this collection — nothing to fire yet
            continue;
        }

        const basePayload = {
            collectionId,
            collectionName: collection.name,
            totalFiles,
            statusBreakdown: statusCounts,
            // The file that triggered this check
            triggeringFileId: fileId,
        };

        if (failedFiles.length > 0) {
            // One or more files failed — fire collection.embedding_failed.
            // Include the full list of failed files so consumers can act on each one.
            await dispatchWebhookEvent(orgId, 'collection.embedding_failed', {
                ...basePayload,
                failedFiles,          // [{ fileId, fileName }, ...]
                failedCount: failedFiles.length,
                successCount: (statusCounts.completed ?? 0) + (statusCounts.skipped ?? 0),
            });
        } else {
            // All files completed or skipped — fully ready for querying
            await dispatchWebhookEvent(orgId, 'collection.embedding_completed', {
                ...basePayload,
                embeddedCount: statusCounts.completed ?? 0,
                skippedCount: statusCounts.skipped ?? 0,
            });
        }
    }
}
