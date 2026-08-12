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
  getCaseById,
  listCases,
  listCaseTransitions,
  transitionCase,
  updateCaseDocuments,
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
  requireRole('admin', 'tehsildar', 'ri'),
] as RequestHandler[];

const tehsildarWrite = [requireAuth, requireRole('tehsildar')] as RequestHandler[];
const transitionActors = [
  requireAuth,
  requireRole('tehsildar', 'ri', 'admin'),
] as RequestHandler[];

function parseKhasrasFromBody(body: Record<string, unknown>): unknown {
  if (body.khasras != null) {
    if (typeof body.khasras === 'string') {
      try {
        const parsed = JSON.parse(body.khasras);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
      catch {
        // treat as comma/newline separated
      }
    }
    return body.khasras;
  }
  return undefined;
}

/**
 * @openapi
 * /api/v1/cases:
 *   post:
 *     tags: [Cases]
 *     summary: Create a सीमांकन case (tehsildar)
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [applicantName, village, khasras, challanReference]
 *             properties:
 *               applicantName: { type: string }
 *               applicantContact: { type: string }
 *               village: { type: string }
 *               khasras: { type: string, description: JSON array or comma-separated }
 *               challanReference: { type: string }
 *               filedAt: { type: string, format: date-time }
 *               map: { type: string, format: binary }
 *               challan: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Created case
 */
router.post(
  '/',
  ...tehsildarWrite,
  upload.middleware.fields([
    { name: 'map', maxCount: 1 },
    { name: 'challan', maxCount: 1 },
  ]),
  async (req, res, next) => {
    const files = req.files as
      | { map?: Express.Multer.File[]; challan?: Express.Multer.File[] }
      | undefined;
    const paths: string[] = [];
    try {
      const mapFile = files?.map?.[0] ?? null;
      const challanFile = files?.challan?.[0] ?? null;
      if (mapFile?.path) {
        paths.push(mapFile.path);
      }
      if (challanFile?.path) {
        paths.push(challanFile.path);
      }
      if (paths.length > 0) {
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
      const created = await createCase(req.user!, {
        applicantName: String(body.applicantName ?? ''),
        applicantContact: body.applicantContact
          ? String(body.applicantContact)
          : null,
        village: String(body.village ?? ''),
        khasras: parseKhasrasFromBody(body),
        challanReference: String(body.challanReference ?? ''),
        filedAt: body.filedAt ? String(body.filedAt) : null,
        mapFile,
        challanFile,
      });
      return Respond(res, created, 201);
    }
    catch (error) {
      return next(error);
    }
    finally {
      if (paths.length > 0) {
        upload.scheduleRemoval(paths);
      }
    }
  },
);

/**
 * @openapi
 * /api/v1/cases:
 *   get:
 *     tags: [Cases]
 *     summary: List cases (tehsil-scoped for staff; all for admin)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: stage
 *         schema: { type: string }
 *       - in: query
 *         name: overdue
 *         schema: { type: boolean }
 *         description: Filter cases past guaranteeDueAt and not ECOURT_UPLOADED
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Search case no, applicant, village, or challan ref
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Paginated case list
 */
router.get('/', ...staffRead, async (req, res, next) => {
  try {
    const stage = typeof req.query.stage === 'string' ? req.query.stage : undefined;
    const overdueRaw = req.query.overdue;
    const overdue
      = overdueRaw === 'true' || overdueRaw === '1';
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const result = await listCases(req.user!, {
      stage,
      overdue,
      q,
      pagination: parsePagination(req),
    });
    return Respond(res, result);
  }
  catch (error) {
    return next(error);
  }
});

/**
 * @openapi
 * /api/v1/cases/{id}:
 *   get:
 *     tags: [Cases]
 *     summary: Get case detail with download URLs
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Case detail
 */
router.get('/:id', ...staffRead, async (req, res, next) => {
  try {
    const detail = await getCaseById(req.user!, String(req.params.id));
    return Respond(res, detail);
  }
  catch (error) {
    return next(error);
  }
});

/**
 * @openapi
 * /api/v1/cases/{id}/transitions:
 *   get:
 *     tags: [Cases]
 *     summary: Case transition history
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Transition timeline
 *   post:
 *     tags: [Cases]
 *     summary: Advance case stage (role-gated)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [toStage]
 *             properties:
 *               toStage: { type: string }
 *               assignedRiId: { type: string }
 *               hearingAt: { type: string, format: date-time }
 *               note: { type: string }
 *               ecourtReference: { type: string }
 *     responses:
 *       200:
 *         description: Updated case
 */
router.get('/:id/transitions', ...staffRead, async (req, res, next) => {
  try {
    const logs = await listCaseTransitions(req.user!, String(req.params.id));
    return Respond(res, logs);
  }
  catch (error) {
    return next(error);
  }
});

router.post('/:id/transitions', ...transitionActors, async (req, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    const updated = await transitionCase(req.user!, String(req.params.id), {
      toStage: String(body.toStage ?? ''),
      assignedRiId: body.assignedRiId != null ? String(body.assignedRiId) : null,
      hearingAt: body.hearingAt != null ? String(body.hearingAt) : null,
      note: body.note != null ? String(body.note) : null,
      ecourtReference:
        body.ecourtReference != null ? String(body.ecourtReference) : null,
    });
    return Respond(res, updated);
  }
  catch (error) {
    return next(error);
  }
});

/**
 * @openapi
 * /api/v1/cases/{id}/documents:
 *   patch:
 *     tags: [Cases]
 *     summary: Upload or replace map/challan documents
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               map: { type: string, format: binary }
 *               challan: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Updated case
 */
router.patch(
  '/:id/documents',
  ...tehsildarWrite,
  upload.middleware.fields([
    { name: 'map', maxCount: 1 },
    { name: 'challan', maxCount: 1 },
  ]),
  async (req, res, next) => {
    const files = req.files as
      | { map?: Express.Multer.File[]; challan?: Express.Multer.File[] }
      | undefined;
    const paths: string[] = [];
    try {
      const mapFile = files?.map?.[0] ?? null;
      const challanFile = files?.challan?.[0] ?? null;
      if (mapFile?.path) {
        paths.push(mapFile.path);
      }
      if (challanFile?.path) {
        paths.push(challanFile.path);
      }
      if (paths.length > 0) {
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

      const updated = await updateCaseDocuments(
        req.user!,
        String(req.params.id),
        { mapFile, challanFile },
      );
      return Respond(res, updated);
    }
    catch (error) {
      return next(error);
    }
    finally {
      if (paths.length > 0) {
        upload.scheduleRemoval(paths);
      }
    }
  },
);

export default router;
