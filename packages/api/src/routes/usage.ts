import { Router, type Request, type Response } from 'express';
import { db } from '../db';
import { usageLogs, files, apiKeys } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { and, eq, gte, lte, desc, sql, type SQL } from 'drizzle-orm';
import config from '../config';

const router = Router();

// GET / - get usage data

/**
 * Inclusive day-window from query params (#usage display fix).
 *
 * The end boundary MUST be the END of that day: a bare `lte(createdAt,
 * new Date('2026-10-20'))` compares against midnight, which silently hides
 * everything that happened on the end day — on a young deployment the
 * usage chart appears empty even though rows exist (every row is "today").
 */
export function timeWindowFromQuery(query: {
  start_date?: unknown;
  end_date?: unknown;
}): SQL[] {
  const filters: SQL[] = [];
  const { start_date, end_date } = query;

  const dayStart = (d: string): Date => new Date(`${d}T00:00:00.000Z`);
  const dayEnd = (d: string): Date => new Date(`${d}T23:59:59.999Z`);

  const isValidDay = (v: unknown): v is string =>
    typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

  const start = isValidDay(start_date) ? dayStart(start_date) : undefined;
  // Truncate to the invoking day: an end_date that is mid-day-time also remains whole-day.
  const end = isValidDay(end_date) ? dayEnd(end_date) : undefined;

  if (start && end) {
    filters.push(gte(usageLogs.createdAt, start), lte(usageLogs.createdAt, end));
  } else if (start) {
    filters.push(gte(usageLogs.createdAt, start));
  } else if (end) {
    filters.push(lte(usageLogs.createdAt, end));
  }

  return filters;
}

router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const orgId = req.user?.orgId;

  if (!orgId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // FIX 3: Actually read and apply start_date / end_date query params,
  // consistent with how /usage/daily handles them.
  const timeFilter = timeWindowFromQuery(req.query);

  const [usageRow] = await db
    .select({
      totalRequests: sql<number>`COUNT(*)`.mapWith(Number),
      totalBytesIn:  sql<number>`COALESCE(SUM(${usageLogs.bytesIn}), 0)`.mapWith(Number),
      totalBytesOut: sql<number>`COALESCE(SUM(${usageLogs.bytesOut}), 0)`.mapWith(Number),
    })
    .from(usageLogs)
    .where(and(eq(usageLogs.orgId, orgId), ...timeFilter));

  // Storage and API key counts are not time-scoped — they reflect current state
  const [storageRow] = await db
    .select({
      totalStorage: sql<number>`COALESCE(SUM(${files.sizeBytes}), 0)`.mapWith(Number),
    })
    .from(files)
    .where(eq(files.orgId, orgId));

  const [keysRow] = await db
    .select({
      activeKeys: sql<number>`COUNT(*)`.mapWith(Number),
    })
    .from(apiKeys)
    .where(and(eq(apiKeys.orgId, orgId), sql`${apiKeys.revokedAt} IS NULL`));

  res.json({
    total_requests:  usageRow?.totalRequests ?? 0,
    total_bytes_in:  usageRow?.totalBytesIn ?? 0,
    total_bytes_out: usageRow?.totalBytesOut ?? 0,
    total_storage:   storageRow?.totalStorage ?? 0,
    active_api_keys: keysRow?.activeKeys ?? 0,
    storage_limit:   config.storageLimit,
  });
});

// GET /daily - get daily usage data

router.get('/daily', authMiddleware, async (req: Request, res: Response) => {
  const orgId = req.user?.orgId;

  if (!orgId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const timeFilter = timeWindowFromQuery(req.query);
  if (timeFilter.length === 0) {
    // Default window: the trailing 30 days (start at day boundary).
    const defaultStart = new Date();
    defaultStart.setUTCDate(defaultStart.getUTCDate() - 30);
    defaultStart.setUTCHours(0, 0, 0, 0);
    timeFilter.push(gte(usageLogs.createdAt, defaultStart));
  }

  const result = await db
    .select({
      date:     sql<string>`DATE(${usageLogs.createdAt})::text`,
      requests: sql<number>`COUNT(*)`.mapWith(Number),
      bytesIn:  sql<number>`COALESCE(SUM(${usageLogs.bytesIn}), 0)`.mapWith(Number),
      bytesOut: sql<number>`COALESCE(SUM(${usageLogs.bytesOut}), 0)`.mapWith(Number),
    })
    .from(usageLogs)
    .where(and(eq(usageLogs.orgId, orgId), ...timeFilter))
    .groupBy(sql`DATE(${usageLogs.createdAt})`)
    .orderBy(desc(sql`DATE(${usageLogs.createdAt})`));

  res.json(result.map(r => ({
    date:     r.date,
    requests: String(r.requests),
    bytes_in: r.bytesIn,
    bytes_out: r.bytesOut,
  })));
});

export default router;
