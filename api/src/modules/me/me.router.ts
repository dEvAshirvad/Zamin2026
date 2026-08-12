import { config } from '@/configs/env';
import { createRouter } from '@/configs/serverConfig';
import Respond from '@/lib/respond';
import { requireAuth } from '@/middleware/require-auth';
import { TehsilModel } from '@/modules/tehsils/tehsil.model';

const router = createRouter();

/**
 * @openapi
 * /api/v1/me:
 *   get:
 *     tags: [Auth]
 *     summary: Current session user
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Current user with role and tehsil
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const user = req.user!;
    let tehsil: { id: string; name: string; slug: string } | null = null;
    if (user.tehsilId) {
      const doc = await TehsilModel.findById(user.tehsilId).lean();
      if (doc) {
        tehsil = {
          id: String(doc._id),
          name: doc.name,
          slug: doc.slug,
        };
      }
    }

    return Respond(res, {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role ?? null,
      tehsilId: user.tehsilId ?? null,
      tehsil,
      inviteEmailEnabled: config.staff.inviteEmailEnabled,
    });
  }
  catch (error) {
    return next(error);
  }
});

export default router;
