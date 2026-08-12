import type { RequestHandler } from 'express';

import { createRouter } from '@/configs/serverConfig';
import { parsePagination } from '@/lib/paginator';
import Respond from '@/lib/respond';
import { requireAuth } from '@/middleware/require-auth';
import { requireRole } from '@/middleware/require-role';
import {
  listAdminTransitions,
} from '@/modules/cases/case.service';

const router = createRouter();
const adminOnly = [requireAuth, requireRole('admin')] as RequestHandler[];

/**
 * @openapi
 * /api/v1/admin/audit/transitions:
 *   get:
 *     tags: [Admin]
 *     summary: Global case transition audit log
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: caseId
 *         schema: { type: string }
 *       - in: query
 *         name: tehsilId
 *         schema: { type: string }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Search case id, note, actor role, or stage
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Paginated transition logs
 */
router.get('/transitions', ...adminOnly, async (req, res, next) => {
  try {
    const caseId = typeof req.query.caseId === 'string' ? req.query.caseId : undefined;
    const tehsilId
      = typeof req.query.tehsilId === 'string' ? req.query.tehsilId : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const result = await listAdminTransitions(req.user!, {
      caseId,
      tehsilId,
      q,
      pagination: parsePagination(req),
    });
    return Respond(res, result);
  }
  catch (error) {
    return next(error);
  }
});

export default router;
