import { createRouter } from '@/configs/serverConfig';
import auditRouter from '@/modules/admin/audit.router';
import metricsRouter from '@/modules/admin/metrics.router';
import caseRouter from '@/modules/cases/case.router';
import meRouter from '@/modules/me/me.router';
import staffRouter from '@/modules/staff/staff.router';
import tehsilRouter from '@/modules/tehsils/tehsil.router';

const router = createRouter();

router.use('/me', meRouter);
router.use('/tehsils', tehsilRouter);
router.use('/admin/staff', staffRouter);
router.use('/admin/audit', auditRouter);
router.use('/admin/metrics', metricsRouter);
router.use('/cases', caseRouter);

export default router;
