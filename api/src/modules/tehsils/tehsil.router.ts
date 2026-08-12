import { createRouter } from '@/configs/serverConfig';
import Respond from '@/lib/respond';
import { requireAuth } from '@/middleware/require-auth';
import { requireRole } from '@/middleware/require-role';
import { listRisInMyTehsil } from '@/modules/cases/case.service';

import { listTehsils } from './tehsil.service';

const router = createRouter();

/**
 * @openapi
 * /api/v1/tehsils:
 *   get:
 *     tags: [Tehsils]
 *     summary: List tehsils
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Tehsil list
 */
router.get('/', requireAuth, requireRole('admin'), async (_req, res, next) => {
  try {
    const tehsils = await listTehsils();
    return Respond(res, tehsils);
  }
  catch (error) {
    return next(error);
  }
});

/**
 * @openapi
 * /api/v1/tehsils/me/ris:
 *   get:
 *     tags: [Tehsils]
 *     summary: List RIs in the caller's tehsil
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: RI list for picker
 */
router.get(
  '/me/ris',
  requireAuth,
  requireRole('tehsildar', 'ri'),
  async (req, res, next) => {
    try {
      const ris = await listRisInMyTehsil(req.user!);
      return Respond(res, ris);
    }
    catch (error) {
      return next(error);
    }
  },
);

export default router;
