import { Router, type Request, type Response } from 'express';
import { db } from '../db';
import { webhooks, webhookDeliveries } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { authMiddleware, requireRole } from '../middleware/auth';
import crypto from 'crypto';
import { z } from 'zod';

const router = Router();

// ── All subscribable events ───────────────────────────────────────────────────

const WEBHOOK_EVENTS = z.enum([
    'file.ready',
    'file.failed',
]);

// ── Request schemas ───────────────────────────────────────────────────────────

const createWebhookSchema = z.object({
    url: z.string().url(),
    events: z.array(WEBHOOK_EVENTS).min(1),
});

const updateWebhookSchema = createWebhookSchema.partial().extend({
    enabled: z.boolean().optional(),
});

// ── Routes ────────────────────────────────────────────────────────────────────

// List webhooks
router.get('/', authMiddleware, async (req: Request, res: Response) => {
    const rows = await db
        .select({
            id: webhooks.id,
            url: webhooks.url,
            events: webhooks.events,
            enabled: webhooks.enabled,
            createdAt: webhooks.createdAt,
        })
        .from(webhooks)
        .where(eq(webhooks.orgId, req.user!.orgId))
        .orderBy(desc(webhooks.createdAt));

    res.json(rows);
});

// Create webhook
router.post('/', authMiddleware, requireRole('owner', 'admin'), async (req: Request, res: Response) => {
    const parsed = createWebhookSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
        return;
    }

    const secret = crypto.randomBytes(32).toString('hex');
    const [row] = await db
        .insert(webhooks)
        .values({
            orgId: req.user!.orgId,
            url: parsed.data.url,
            events: parsed.data.events,
            secret,
        })
        .returning({
            id: webhooks.id,
            url: webhooks.url,
            events: webhooks.events,
            enabled: webhooks.enabled,
            createdAt: webhooks.createdAt,
            secret: webhooks.secret,
        });

    // Secret returned only on creation — not exposed in list/get
    res.status(201).json(row);
});

// Update webhook
router.patch('/:id', authMiddleware, requireRole('owner', 'admin'), async (req: Request, res: Response) => {
    const parsed = updateWebhookSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
        return;
    }

    const id = req.params.id as string;
    const [row] = await db
        .update(webhooks)
        .set(parsed.data)
        .where(and(eq(webhooks.id, id), eq(webhooks.orgId, req.user!.orgId)))
        .returning({
            id: webhooks.id,
            url: webhooks.url,
            events: webhooks.events,
            enabled: webhooks.enabled,
        });

    if (!row) { res.status(404).json({ error: 'Webhook not found' }); return; }
    res.json(row);
});

// Delete webhook
router.delete('/:id', authMiddleware, requireRole('owner', 'admin'), async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const [row] = await db
        .delete(webhooks)
        .where(and(eq(webhooks.id, id), eq(webhooks.orgId, req.user!.orgId)))
        .returning({ id: webhooks.id });

    if (!row) { res.status(404).json({ error: 'Webhook not found' }); return; }
    res.status(204).send();
});

// Delivery history for a webhook
router.get('/:id/deliveries', authMiddleware, async (req: Request, res: Response) => {
    const id = req.params.id as string;

    const [hook] = await db
        .select({ id: webhooks.id })
        .from(webhooks)
        .where(and(eq(webhooks.id, id), eq(webhooks.orgId, req.user!.orgId)));

    if (!hook) { res.status(404).json({ error: 'Webhook not found' }); return; }

    const rows = await db
        .select({
            id: webhookDeliveries.id,
            event: webhookDeliveries.event,
            status: webhookDeliveries.status,
            statusCode: webhookDeliveries.statusCode,
            attempts: webhookDeliveries.attempts,
            lastAttemptAt: webhookDeliveries.lastAttemptAt,
            createdAt: webhookDeliveries.createdAt,
        })
        .from(webhookDeliveries)
        .where(eq(webhookDeliveries.webhookId, id))
        .orderBy(desc(webhookDeliveries.createdAt))
        .limit(50);

    res.json(rows);
});

// GET /events — expose the full list of subscribable events to consumers
router.get('/events', authMiddleware, async (_req: Request, res: Response) => {
    res.json({
        events: WEBHOOK_EVENTS.options,
        descriptions: {
            'file.ready': 'A file is queryable — its chunks are persisted and searchable (#40: all intermediate file events are gone)',
            'file.failed': 'A file will never become queryable in this pass — extraction or embedding failed, or there was nothing to embed (skipped). Re-run via POST /files/:id/reprocess',
        },
    });
});

export default router;
