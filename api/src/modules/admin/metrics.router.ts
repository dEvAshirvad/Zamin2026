import type { RequestHandler } from 'express';

import { createRouter } from '@/configs/serverConfig';
import Respond from '@/lib/respond';
import { requireAuth } from '@/middleware/require-auth';
import { requireRole } from '@/middleware/require-role';
import { getCaseMetrics } from '@/modules/cases/case.service';

const router = createRouter();
const adminOnly = [requireAuth, requireRole('admin')] as RequestHandler[];

/**
 * @openapi
 * /api/v1/admin/metrics/cases:
 *   get:
 *     tags: [Admin]
 *     summary: Case metrics (totals, by stage, by tehsil)
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Aggregated case metrics
 */
router.get('/cases', ...adminOnly, async (req, res, next) => {
  try {
    const q = req.query as Record<string, unknown>;
    const tehsilRaw = q.tehsilIds ?? q.tehsilId;
    const tehsilIds = Array.isArray(tehsilRaw)
      ? tehsilRaw.map(String)
      : typeof tehsilRaw === 'string'
        ? tehsilRaw.split(',').map(s => s.trim()).filter(Boolean)
        : [];
    const metrics = await getCaseMetrics(req.user!, {
      from: q.from != null ? String(q.from) : null,
      to: q.to != null ? String(q.to) : null,
      month: q.month != null ? String(q.month) : null,
      tehsilIds,
    });
    return Respond(res, metrics);
  }
  catch (error) {
    return next(error);
  }
});

export default router;
