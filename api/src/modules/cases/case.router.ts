import type { RequestHandler } from 'express';

import APIError from '@/configs/errors/APIError';
import { createUploadMiddleware } from '@/configs/multer';
import { createRouter } from '@/configs/serverConfig';
import { parsePagination } from '@/lib/paginator';
import Respond from '@/lib/respond';
import { requireAuth } from '@/middleware/require-auth';
import { requireRole } from '@/middleware/require-role';
import { HttpErrorStatusCode } from '@/types/errors/errors.types';

import {
  createCase,
  generateNoticePdf,
  getCaseById,
  listCases,
  listCaseTransitions,
  rescheduleDemarcation,
  transitionCase,
} from './case.service';

const router = createRouter();

const upload = createUploadMiddleware({
  fileextacceptArr: ['pdf', 'jpeg', 'jpg', 'png', 'webp'],
  filePrefix: 'case-doc',
  maxFiles: 2,
  fileSizeLimit: 10 * 1024 * 1024,
});

const staffRead = [
  requireAuth,
  requireRole('admin', 'tehsildar', 'ri', 'patwari'),
] as RequestHandler[];

const tehsildarWrite = [requireAuth, requireRole('tehsildar')] as RequestHandler[];
const transitionActors = [
  requireAuth,
  requireRole('tehsildar', 'ri', 'patwari'),
] as RequestHandler[];

function parseJsonField(raw: unknown): unknown {
  if (raw == null)
    return undefined;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    }
    catch {
      return raw;
    }
  }
  return raw;
}

/**
 * @openapi
 * /api/v1/cases:
 *   post:
 *     tags: [Cases]
 *     summary: Create a सीमांकन case with Suchna Patra fields (tehsildar)
 */
router.post('/', ...tehsildarWrite, async (req, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    const created = await createCase(req.user!, {
      applicantName: String(body.applicantName ?? ''),
      applicantContact: body.applicantContact
        ? String(body.applicantContact)
        : null,
      applicantGuardianType: body.applicantGuardianType
        ? String(body.applicantGuardianType)
        : null,
      applicantGuardianName: body.applicantGuardianName
        ? String(body.applicantGuardianName)
        : null,
      applicantResidence: body.applicantResidence
        ? String(body.applicantResidence)
        : null,
      village: String(body.village ?? ''),
      khasras: parseJsonField(body.khasras),
      neighbors: parseJsonField(body.neighbors),
      totalRakba: body.totalRakba != null ? Number(body.totalRakba) : null,
      filedAt: body.filedAt ? String(body.filedAt) : null,
      demarcationDate: String(body.demarcationDate ?? ''),
      demarcationTime: body.demarcationTime
        ? String(body.demarcationTime)
        : '12:00',
      officeName: body.officeName ? String(body.officeName) : null,
      district: body.district ? String(body.district) : null,
      state: body.state ? String(body.state) : null,
      patwariHalkaNumber: String(body.patwariHalkaNumber ?? ''),
      tehsildarName: body.tehsildarName ? String(body.tehsildarName) : null,
      issueDate: body.issueDate ? String(body.issueDate) : null,
    });
    return Respond(res, created, 201);
  }
  catch (error) {
    return next(error);
  }
});

/**
 * @openapi
 * /api/v1/cases:
 *   get:
 *     tags: [Cases]
 *     summary: List cases
 */
router.get('/', ...staffRead, async (req, res, next) => {
  try {
    const stage = typeof req.query.stage === 'string' ? req.query.stage : undefined;
    const overdueRaw = req.query.overdue;
    const overdue = overdueRaw === 'true' || overdueRaw === '1';
    const alertRaw = typeof req.query.alert === 'string' ? req.query.alert : undefined;
    const alert = alertRaw === 'OVERDUE' ? 'OVERDUE' as const : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const tehsilId
      = typeof req.query.tehsilId === 'string' ? req.query.tehsilId : undefined;
    const result = await listCases(req.user!, {
      stage,
      overdue,
      alert,
      q,
      tehsilId,
      pagination: parsePagination(req),
    });
    return Respond(res, result);
  }
  catch (error) {
    return next(error);
  }
});

router.get('/:id', ...staffRead, async (req, res, next) => {
  try {
    const detail = await getCaseById(req.user!, String(req.params.id));
    return Respond(res, detail);
  }
  catch (error) {
    return next(error);
  }
});

router.get('/:id/transitions', ...staffRead, async (req, res, next) => {
  try {
    const logs = await listCaseTransitions(req.user!, String(req.params.id));
    return Respond(res, logs);
  }
  catch (error) {
    return next(error);
  }
});

router.post(
  '/:id/transitions',
  ...transitionActors,
  upload.middleware.fields([{ name: 'report', maxCount: 1 }]),
  async (req, res, next) => {
    const files = req.files as { report?: Express.Multer.File[] } | undefined;
    const reportFile = files?.report?.[0] ?? null;
    const paths = reportFile?.path ? [reportFile.path] : [];
    try {
      if (reportFile?.path) {
        const invalid = upload.validateSignatures(paths);
        if (invalid.length > 0) {
          throw new APIError({
            STATUS: HttpErrorStatusCode.BAD_REQUEST,
            CODE: 'VALIDATION_FAILED',
            TITLE: 'VALIDATION_FAILED',
            MESSAGE: 'Invalid file signature',
          });
        }
      }
      const body = req.body as Record<string, unknown>;
      const updated = await transitionCase(req.user!, String(req.params.id), {
        toStage: String(body.toStage ?? ''),
        assignedRiId:
          body.assignedRiId != null ? String(body.assignedRiId) : null,
        assignedPatwariId:
          body.assignedPatwariId != null
            ? String(body.assignedPatwariId)
            : null,
        note: body.note != null ? String(body.note) : null,
        objectionReason:
          body.objectionReason != null ? String(body.objectionReason) : null,
        reportFile,
      });
      return Respond(res, updated);
    }
    catch (error) {
      return next(error);
    }
    finally {
      if (paths.length > 0)
        upload.scheduleRemoval(paths);
    }
  },
);

router.post(
  '/:id/reschedule',
  ...transitionActors,
  async (req, res, next) => {
    try {
      const body = req.body as Record<string, unknown>;
      const updated = await rescheduleDemarcation(
        req.user!,
        String(req.params.id),
        {
          demarcationDate: String(body.demarcationDate ?? ''),
          demarcationTime: body.demarcationTime != null
            ? String(body.demarcationTime)
            : null,
          reason: String(body.reason ?? ''),
        },
      );
      return Respond(res, updated);
    }
    catch (error) {
      return next(error);
    }
  },
);

router.post(
  '/:id/notice-pdf',
  ...transitionActors,
  async (req, res, next) => {
    try {
      const result = await generateNoticePdf(req.user!, String(req.params.id));
      return Respond(res, result);
    }
    catch (error) {
      return next(error);
    }
  },
);

export default router;
