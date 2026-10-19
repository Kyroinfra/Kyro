import { Router, type Request, type Response } from 'express';
import { db } from '../../db';
import { usageLogs, files, apiKeys } from '../../db/schema';
import { authMiddleware } from '../../middleware/auth';
import { and, eq, gte, lte, desc, sql, type SQL } from 'drizzle-orm';
import config from '../../config';

const router = Router();

// GET / - get usage data

router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const orgId = req.user?.orgId;

  if (!orgId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // FIX 3: Actually read and apply start_date / end_date query params,
  // consistent with how /usage/daily handles them.
  const { start_date, end_date } = req.query;

  const timeFilter: SQL[] = [];
  if (start_date && end_date) {
    timeFilter.push(
      gte(usageLogs.createdAt, new Date(String(start_date))),
      lte(usageLogs.createdAt, new Date(String(end_date))),
    );
  } else if (start_date) {
    timeFilter.push(gte(usageLogs.createdAt, new Date(String(start_date))));
  } else if (end_date) {
    timeFilter.push(lte(usageLogs.createdAt, new Date(String(end_date))));
  }

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
    .where(and(eq(files.orgId, orgId), sql`${files.deletedAt} IS NULL`));

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
  const { start_date, end_date } = req.query;

  if (!orgId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const timeFilter: SQL[] = [];
  if (start_date && end_date) {
    timeFilter.push(
      gte(usageLogs.createdAt, new Date(String(start_date))),
      lte(usageLogs.createdAt, new Date(String(end_date))),
    );
  } else {
    const defaultStart = new Date();
    defaultStart.setDate(defaultStart.getDate() - 30);
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
