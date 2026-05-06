import { Router, Request, Response } from 'express';
import { db } from '../../db';
import { webhooks, webhookDeliveries } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { authMiddleware, requireRole } from '../../middleware/auth';
import crypto from 'crypto';
import { z } from 'zod';

const router = Router();

const createWebhookSchema = z.object({
    url: z.string().url(),
    events: z.array(z.enum(['extraction.started', 'extraction.completed', 'extraction.failed'])).min(1),
});

const updateWebhookSchema = createWebhookSchema.partial().extend({
    enabled: z.boolean().optional(),
});

// List webhooks
router.get('/', authMiddleware, async (req: Request, res: Response) => {
    const rows = await db
        .select({ id: webhooks.id, url: webhooks.url, events: webhooks.events, enabled: webhooks.enabled, createdAt: webhooks.createdAt })
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
        .values({ orgId: req.user!.orgId, url: parsed.data.url, events: parsed.data.events, secret })
        .returning({ id: webhooks.id, url: webhooks.url, events: webhooks.events, enabled: webhooks.enabled, createdAt: webhooks.createdAt, secret: webhooks.secret });

    // Secret is returned only on creation — not exposed in list/get
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
        .returning({ id: webhooks.id, url: webhooks.url, events: webhooks.events, enabled: webhooks.enabled });

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
    // Verify ownership first
    const id = req.params.id as string;
    const [hook] = await db.select({ id: webhooks.id }).from(webhooks)
        .where(and(eq(webhooks.id, id), eq(webhooks.orgId, req.user!.orgId)));
    if (!hook) { res.status(404).json({ error: 'Webhook not found' }); return; }

    const rows = await db
        .select({ id: webhookDeliveries.id, event: webhookDeliveries.event, status: webhookDeliveries.status, statusCode: webhookDeliveries.statusCode, attempts: webhookDeliveries.attempts, lastAttemptAt: webhookDeliveries.lastAttemptAt, createdAt: webhookDeliveries.createdAt })
        .from(webhookDeliveries)
        .where(eq(webhookDeliveries.webhookId, id))
        .orderBy(desc(webhookDeliveries.createdAt))
        .limit(50);
    res.json(rows);
});

export default router;
