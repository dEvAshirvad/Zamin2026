import type { RequestHandler } from 'express';

import APIError from '@/configs/errors/APIError';
import { createUploadMiddleware } from '@/configs/multer';
import { createRouter } from '@/configs/serverConfig';
import { parsePagination } from '@/lib/paginator';
import Respond from '@/lib/respond';
import { requireAuth } from '@/middleware/require-auth';
import { requireRole } from '@/middleware/require-role';
import { HttpErrorStatusCode } from '@/types/errors/errors.types';

import type { StaffImportRole } from './staff.service';

import {
  createOneStaff,
  credentialsCsv,
  deleteStaffUsers,
  importStaffFromFile,
  listStaff,
  resetStaffPassword,
  revealPassword,
  staffImportTemplates,
} from './staff.service';

const router = createRouter();
const upload = createUploadMiddleware({
  fileextacceptArr: ['csv', 'xlsx'],
  filePrefix: 'staff-import',
  maxFiles: 1,
  fileSizeLimit: 5 * 1024 * 1024,
});

const adminOnly = [requireAuth, requireRole('admin')] as RequestHandler[];

function importHandler(role: StaffImportRole): RequestHandler {
  return async (req, res, next) => {
    try {
      const file = req.file;
      if (!file?.path) {
        throw new APIError({
          STATUS: HttpErrorStatusCode.BAD_REQUEST,
          CODE: 'VALIDATION_FAILED',
          TITLE: 'VALIDATION_FAILED',
          MESSAGE: 'file is required',
        });
      }

      const invalid = upload.validateSignatures(file.path);
      if (invalid.length > 0 && !file.originalname.toLowerCase().endsWith('.csv')) {
        upload.scheduleRemoval(file.path);
        throw new APIError({
          STATUS: HttpErrorStatusCode.BAD_REQUEST,
          CODE: 'VALIDATION_FAILED',
          TITLE: 'VALIDATION_FAILED',
          MESSAGE: 'Invalid file signature',
        });
      }

      try {
        const result = await importStaffFromFile(file.path, role);
        return Respond(res, result, 201);
      }
      finally {
        upload.scheduleRemoval(file.path);
      }
    }
    catch (error) {
      return next(error);
    }
  };
}

/**
 * @openapi
 * /api/v1/admin/staff/import/tehsildars:
 *   post:
 *     tags: [Staff]
 *     summary: Import tehsildars from CSV/XLSX
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Import result
 */
router.post(
  '/import/tehsildars',
  ...adminOnly,
  upload.middleware.single('file'),
  importHandler('tehsildar'),
);

/**
 * @openapi
 * /api/v1/admin/staff/import/ris:
 *   post:
 *     tags: [Staff]
 *     summary: Import RIs from CSV/XLSX
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Import result
 */
router.post(
  '/import/ris',
  ...adminOnly,
  upload.middleware.single('file'),
  importHandler('ri'),
);

/**
 * @openapi
 * /api/v1/admin/staff/import/patwaris:
 *   post:
 *     tags: [Staff]
 *     summary: Import Patwaris from CSV/XLSX
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Import result
 */
router.post(
  '/import/patwaris',
  ...adminOnly,
  upload.middleware.single('file'),
  importHandler('patwari'),
);

/**
 * @openapi
 * /api/v1/admin/staff/import-templates:
 *   get:
 *     tags: [Staff]
 *     summary: Three import templates (tehsildar, RI, patwari) in one response
 *     parameters:
 *       - in: query
 *         name: format
 *         schema: { type: string, enum: [csv, xlsx] }
 *         required: true
 */
router.get('/import-templates', ...adminOnly, async (req, res, next) => {
  try {
    const formatRaw
      = typeof req.query.format === 'string' ? req.query.format.toLowerCase() : '';
    if (formatRaw !== 'csv' && formatRaw !== 'xlsx') {
      throw new APIError({
        STATUS: HttpErrorStatusCode.BAD_REQUEST,
        CODE: 'VALIDATION_FAILED',
        TITLE: 'VALIDATION_FAILED',
        MESSAGE: 'format must be csv or xlsx',
      });
    }
    const pack = await staffImportTemplates(formatRaw);
    return Respond(res, pack);
  }
  catch (error) {
    return next(error);
  }
});

/**
 * @openapi
 * /api/v1/admin/staff:
 *   post:
 *     tags: [Staff]
 *     summary: Create a single staff user (tehsildar | ri | patwari)
 */
router.post('/', ...adminOnly, async (req, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    const created = await createOneStaff({
      name: String(body.name ?? ''),
      email: String(body.email ?? ''),
      role: String(body.role ?? '') as StaffImportRole,
      tehsil: String(body.tehsil ?? body.tehsilName ?? ''),
    });
    return Respond(res, created, 201);
  }
  catch (error) {
    return next(error);
  }
});

/**
 * @openapi
 * /api/v1/admin/staff:
 *   delete:
 *     tags: [Staff]
 *     summary: Delete staff users (never admins). Body: { userIds: string[] }
 */
router.delete('/', ...adminOnly, async (req, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    const raw = body.userIds;
    const userIds = Array.isArray(raw)
      ? raw.map(id => String(id))
      : typeof raw === 'string'
        ? [raw]
        : [];
    const result = await deleteStaffUsers(userIds);
    return Respond(res, result);
  }
  catch (error) {
    return next(error);
  }
});

/**
 * @openapi
 * /api/v1/admin/staff:
 *   get:
 *     tags: [Staff]
 *     summary: List staff users
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, tehsildar, ri, patwari]
 *       - in: query
 *         name: tehsilId
 *         schema:
 *           type: string
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search name or email
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Paginated staff list
 */
router.get('/', ...adminOnly, async (req, res, next) => {
  try {
    const role = typeof req.query.role === 'string' ? req.query.role : undefined;
    const tehsilId
      = typeof req.query.tehsilId === 'string' ? req.query.tehsilId : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const staff = await listStaff({
      role: role as 'admin' | 'tehsildar' | 'ri' | 'patwari' | undefined,
      tehsilId,
      q,
      pagination: parsePagination(req),
    });
    return Respond(res, staff);
  }
  catch (error) {
    return next(error);
  }
});

/**
 * @openapi
 * /api/v1/admin/staff/credentials.csv:
 *   get:
 *     tags: [Staff]
 *     summary: Download all stored temporary passwords as CSV
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: CSV file
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 */
router.get('/credentials.csv', ...adminOnly, async (_req, res, next) => {
  try {
    const csv = await credentialsCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="staff-credentials.csv"',
    );
    return res.status(200).send(csv);
  }
  catch (error) {
    return next(error);
  }
});

/**
 * @openapi
 * /api/v1/admin/staff/{userId}/password:
 *   get:
 *     tags: [Staff]
 *     summary: Reveal one stored temporary password
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Password payload
 */
router.get('/:userId/password', ...adminOnly, async (req, res, next) => {
  try {
    const data = await revealPassword(String(req.params.userId));
    return Respond(res, data);
  }
  catch (error) {
    return next(error);
  }
});

/**
 * @openapi
 * /api/v1/admin/staff/{userId}/reset-password:
 *   post:
 *     tags: [Staff]
 *     summary: Reset password and return new temporary password
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: New password payload
 */
router.post('/:userId/reset-password', ...adminOnly, async (req, res, next) => {
  try {
    const data = await resetStaffPassword(String(req.params.userId));
    return Respond(res, data);
  }
  catch (error) {
    return next(error);
  }
});

export default router;
