import { Router, Response, Request } from 'express';
import { query } from '../db';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /usage:
 *   get:
 *     tags: [Usage]
 *     summary: Get usage statistics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: start_date
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - name: end_date
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Usage statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UsageStats'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const orgId = req.user?.orgId;

    if (!orgId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const usageResult = await query<{
      total_requests: string;
      total_bytes_in: string;
      total_bytes_out: string;
    }>(
      `SELECT 
        COUNT(*) as total_requests,
        COALESCE(SUM(bytes_in), 0) as total_bytes_in,
        COALESCE(SUM(bytes_out), 0) as total_bytes_out
       FROM usage_logs
       WHERE org_id = $1`,
      [orgId]
    );

    const storageResult = await query<{ total_storage: string }>(
      `SELECT COALESCE(SUM(size_bytes), 0) as total_storage
       FROM files
       WHERE org_id = $1 AND deleted_at IS NULL`,
      [orgId]
    );

    const apiKeysResult = await query<{ active_keys: string }>(
      `SELECT COUNT(*) as active_keys
       FROM api_keys
       WHERE org_id = $1 AND revoked_at IS NULL`,
      [orgId]
    );

    res.json({
      total_requests: parseInt(usageResult[0]?.total_requests || '0', 10),
      total_bytes_in: parseInt(usageResult[0]?.total_bytes_in || '0', 10),
      total_bytes_out: parseInt(usageResult[0]?.total_bytes_out || '0', 10),
      total_storage: parseInt(storageResult[0]?.total_storage || '0', 10),
      active_api_keys: parseInt(apiKeysResult[0]?.active_keys || '0', 10),
    });
  } catch (error) {
    console.error('Error getting usage:', error);
    res.status(500).json({ error: 'Failed to get usage' });
  }
});

/**
 * @swagger
 * /usage/daily:
 *   get:
 *     tags: [Usage]
 *     summary: Get daily usage breakdown
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: start_date
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *       - name: end_date
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Daily usage data
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/daily', authMiddleware, async (req: Request, res: Response) => {
  try {
    const orgId = req.user?.orgId;
    const { start_date, end_date } = req.query;

    if (!orgId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    let dateFilter = '';
    const params: any[] = [orgId];

    if (start_date && end_date) {
      dateFilter = 'AND created_at >= $2 AND created_at <= $3';
      params.push(start_date, end_date);
    } else {
      const defaultStart = new Date();
      defaultStart.setDate(defaultStart.getDate() - 30);
      dateFilter = 'AND created_at >= $2';
      params.push(defaultStart);
    }

    const result = await query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as requests,
        COALESCE(SUM(bytes_in), 0) as bytes_in,
        COALESCE(SUM(bytes_out), 0) as bytes_out
       FROM usage_logs
       WHERE org_id = $1 ${dateFilter}
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      params
    );

    res.json(result);
  } catch (error) {
    console.error('Error getting daily usage:', error);
    res.status(500).json({ error: 'Failed to get daily usage' });
  }
});

export default router;
