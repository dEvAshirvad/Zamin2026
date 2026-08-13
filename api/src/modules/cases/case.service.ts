import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { PaginationQuery } from '@/lib/paginator';
import type { AuthUser } from '@/types/global';

import { db } from '@/configs/db/mongodb';
import APIError from '@/configs/errors/APIError';
import {
  isS3Configured,
  presignGetObject,
  putObject,
} from '@/configs/s3';
import { findUserById } from '@/lib/auth/create-staff-user';
import { escapeRegex } from '@/lib/escape-regex';
import { createPaginationResult } from '@/lib/paginator';
import { TehsilModel } from '@/modules/tehsils/tehsil.model';
import { HttpErrorStatusCode } from '@/types/errors/errors.types';

import type { CaseStage } from './case.helpers';
import type { CaseDoc } from './case.model';

import { CaseCounterModel } from './case-counter.model';
import { CaseTransitionLogModel } from './case-transition-log.model';
import {
  CASE_STAGES,
  computeFeeAmount,
  computeGuaranteeDueAt,
  formatCaseNo,
  isCaseStage,
  isCaseVisibleToRi,
  normalizeKhasras,
  OPEN_CASE_STAGES,
  RI_ACTIVE_STAGES,
} from './case.helpers';
import { CaseModel } from './case.model';
import { buildSlaFields, computeStageDueAt, overdueCaseMatch } from './case.sla';
import {
  allowedTargets,
  canTransition,
  pickLeastLoadedRi,
} from './case.transitions';

export interface CreateCaseInput {
  applicantName: string;
  applicantContact?: string | null;
  village: string;
  khasras: unknown;
  challanReference: string;
  filedAt?: string | Date | null;
  mapFile?: Express.Multer.File | null;
  challanFile?: Express.Multer.File | null;
}

function storageNotConfiguredError() {
  return new APIError({
    STATUS: HttpErrorStatusCode.SERVICE_UNAVAILABLE,
    CODE: 'STORAGE_NOT_CONFIGURED',
    TITLE: 'STORAGE_NOT_CONFIGURED',
    MESSAGE: 'Object storage is not configured; file uploads are disabled',
  });
}

export function assertCaseAccess(
  user: AuthUser,
  caseDoc: CaseDoc | { tehsilId: string; assignedRiId?: string | null; stage?: string },
) {
  if (user.role === 'admin') {
    return;
  }
  if (!user.tehsilId || user.tehsilId !== caseDoc.tehsilId) {
    throw new APIError({
      STATUS: HttpErrorStatusCode.FORBIDDEN,
      CODE: 'ACCESS_DENIED',
      TITLE: 'ACCESS_DENIED',
      MESSAGE: 'Case is outside your tehsil',
    });
  }
  if (user.role === 'ri') {
    if (
      !isCaseVisibleToRi({
        assignedRiId: caseDoc.assignedRiId,
        riUserId: user.id,
        stage: caseDoc.stage ?? '',
      })
    ) {
      throw new APIError({
        STATUS: HttpErrorStatusCode.FORBIDDEN,
        CODE: 'ACCESS_DENIED',
        TITLE: 'ACCESS_DENIED',
        MESSAGE: 'Case is not assigned to you or RI work is already complete',
      });
    }
  }
}

async function nextCaseNo(tehsilId: string, slug: string, filedAt: Date): Promise<string> {
  const year = filedAt.getUTCFullYear();
  const counter = await CaseCounterModel.findOneAndUpdate(
    { tehsilId, year },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return formatCaseNo(slug, year, counter.seq);
}

async function uploadCaseFile(opts: {
  tehsilId: string;
  caseId: string;
  kind: 'map' | 'challan';
  file: Express.Multer.File;
}): Promise<string> {
  if (!isS3Configured()) {
    throw storageNotConfiguredError();
  }
  const ext = path.extname(opts.file.originalname).toLowerCase() || '.bin';
  const key = `cases/${opts.tehsilId}/${opts.caseId}/${opts.kind}-${randomUUID()}${ext}`;
  const body = await readFile(opts.file.path);
  await putObject({
    key,
    body,
    contentType: opts.file.mimetype || 'application/octet-stream',
  });
  return key;
}

function serializeCase(doc: CaseDoc & { _id: unknown }) {
  const sla = buildSlaFields({
    stage: doc.stage,
    guaranteeDueAt: doc.guaranteeDueAt,
    stageDueAt: doc.stageDueAt,
  });
  return {
    id: String(doc._id),
    caseNo: doc.caseNo,
    tehsilId: doc.tehsilId,
    createdByUserId: doc.createdByUserId,
    applicantName: doc.applicantName,
    applicantContact: doc.applicantContact ?? null,
    village: doc.village,
    khasras: doc.khasras,
    feeAmount: doc.feeAmount,
    challanReference: doc.challanReference,
    filedAt: doc.filedAt,
    stage: doc.stage,
    assignedRiId: doc.assignedRiId ?? null,
    mapObjectKey: doc.mapObjectKey ?? null,
    challanObjectKey: doc.challanObjectKey ?? null,
    hearingAt: doc.hearingAt ?? null,
    stageChangedAt: doc.stageChangedAt ?? null,
    stageDueAt: doc.stageDueAt ?? null,
    lastTransitionNote: doc.lastTransitionNote ?? null,
    guaranteeDueAt: doc.guaranteeDueAt,
    ecourtUploaded: doc.ecourtUploaded,
    ecourtReference: doc.ecourtReference ?? null,
    ...sla,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function resolveAssignedRiName(
  assignedRiId: string | null | undefined,
): Promise<string | null> {
  if (!assignedRiId)
    return null;
  const user = await findUserById(assignedRiId);
  if (!user)
    return null;
  const name = typeof user.name === 'string' ? user.name.trim() : '';
  return name || null;
}

/** Batch id → display name for list responses (one query). */
async function resolveAssignedRiNameMap(
  assignedRiIds: Array<string | null | undefined>,
): Promise<Map<string, string>> {
  const unique = [
    ...new Set(
      assignedRiIds.filter((id): id is string => Boolean(id?.trim())),
    ),
  ];
  const map = new Map<string, string>();
  if (unique.length === 0)
    return map;

  const users = await db
    .collection('user')
    .find({ id: { $in: unique } })
    .project({ id: 1, name: 1 })
    .toArray();

  for (const user of users) {
    const name = typeof user.name === 'string' ? user.name.trim() : '';
    const id = typeof user.id === 'string' ? user.id : '';
    if (id && name)
      map.set(id, name);
  }
  return map;
}

export async function createCase(user: AuthUser, input: CreateCaseInput) {
  if (user.role !== 'tehsildar' || !user.tehsilId) {
    throw new APIError({
      STATUS: HttpErrorStatusCode.FORBIDDEN,
      CODE: 'ACCESS_DENIED',
      TITLE: 'ACCESS_DENIED',
      MESSAGE: 'Only a tehsildar with a tehsil can create cases',
    });
  }

  const applicantName = String(input.applicantName ?? '').trim();
  const village = String(input.village ?? '').trim();
  const challanReference = String(input.challanReference ?? '').trim();
  const khasras = normalizeKhasras(input.khasras);

  if (!applicantName || !village || !challanReference) {
    throw new APIError({
      STATUS: HttpErrorStatusCode.BAD_REQUEST,
      CODE: 'VALIDATION_FAILED',
      TITLE: 'VALIDATION_FAILED',
      MESSAGE: 'applicantName, village, and challanReference are required',
    });
  }
  if (khasras.length === 0) {
    throw new APIError({
      STATUS: HttpErrorStatusCode.BAD_REQUEST,
      CODE: 'VALIDATION_FAILED',
      TITLE: 'VALIDATION_FAILED',
      MESSAGE: 'At least one khasra is required',
    });
  }

  if ((input.mapFile || input.challanFile) && !isS3Configured()) {
    throw storageNotConfiguredError();
  }

  const tehsil = await TehsilModel.findById(user.tehsilId);
  if (!tehsil) {
    throw new APIError({
      STATUS: HttpErrorStatusCode.BAD_REQUEST,
      CODE: 'TEHSIL_NOT_FOUND',
      TITLE: 'TEHSIL_NOT_FOUND',
      MESSAGE: 'Tehsil not found for current user',
    });
  }

  const filedAt = input.filedAt ? new Date(input.filedAt) : new Date();
  if (Number.isNaN(filedAt.getTime())) {
    throw new APIError({
      STATUS: HttpErrorStatusCode.BAD_REQUEST,
      CODE: 'VALIDATION_FAILED',
      TITLE: 'VALIDATION_FAILED',
      MESSAGE: 'filedAt is invalid',
    });
  }

  const caseNo = await nextCaseNo(user.tehsilId, tehsil.slug, filedAt);
  const feeAmount = computeFeeAmount(khasras.length);
  const guaranteeDueAt = computeGuaranteeDueAt(filedAt);
  const stageDueAt = computeStageDueAt({
    stage: 'SUBMITTED',
    stageChangedAt: filedAt,
    filedAt,
  });

  const created = await CaseModel.create({
    caseNo,
    tehsilId: user.tehsilId,
    createdByUserId: user.id,
    applicantName,
    applicantContact: input.applicantContact?.trim() || null,
    village,
    khasras,
    feeAmount,
    challanReference,
    filedAt,
    stage: 'SUBMITTED',
    assignedRiId: null,
    mapObjectKey: null,
    challanObjectKey: null,
    hearingAt: null,
    stageChangedAt: filedAt,
    stageDueAt,
    lastTransitionNote: null,
    guaranteeDueAt,
    ecourtUploaded: false,
    ecourtReference: null,
  });

  const caseId = String(created._id);
  try {
    if (input.mapFile) {
      created.mapObjectKey = await uploadCaseFile({
        tehsilId: user.tehsilId,
        caseId,
        kind: 'map',
        file: input.mapFile,
      });
    }
    if (input.challanFile) {
      created.challanObjectKey = await uploadCaseFile({
        tehsilId: user.tehsilId,
        caseId,
        kind: 'challan',
        file: input.challanFile,
      });
    }
    if (input.mapFile || input.challanFile) {
      await created.save();
    }
  }
  catch (error) {
    await CaseModel.findByIdAndDelete(created._id);
    throw error;
  }

  return serializeCase(created.toObject());
}

export async function listCases(
  user: AuthUser,
  opts: {
    stage?: string;
    overdue?: boolean;
    q?: string;
    tehsilId?: string;
    pagination: PaginationQuery;
  },
) {
  const filter: Record<string, unknown> = {};
  if (user.role !== 'admin') {
    if (!user.tehsilId) {
      throw new APIError({
        STATUS: HttpErrorStatusCode.FORBIDDEN,
        CODE: 'ACCESS_DENIED',
        TITLE: 'ACCESS_DENIED',
        MESSAGE: 'User has no tehsil assignment',
      });
    }
    filter.tehsilId = user.tehsilId;
  }
  else if (opts.tehsilId?.trim()) {
    filter.tehsilId = opts.tehsilId.trim();
  }

  // RI: only own assignments, only while RI still has pipeline work.
  if (user.role === 'ri') {
    filter.assignedRiId = user.id;
    const requested
      = opts.stage && isCaseStage(opts.stage) && RI_ACTIVE_STAGES.includes(opts.stage)
        ? opts.stage
        : null;
    filter.stage = requested ?? { $in: RI_ACTIVE_STAGES };
  }
  else if (opts.stage) {
    filter.stage = opts.stage as CaseStage;
  }

  if (opts.overdue) {
    filter.guaranteeDueAt = { $lt: new Date() };
    if (user.role === 'ri') {
      // Keep RI stage scope; overdue among active RI work only.
      const requested
        = opts.stage && isCaseStage(opts.stage) && RI_ACTIVE_STAGES.includes(opts.stage)
          ? opts.stage
          : null;
      filter.stage = requested ?? { $in: RI_ACTIVE_STAGES };
    }
    else if (opts.stage && opts.stage !== 'ECOURT_UPLOADED') {
      filter.stage = opts.stage as CaseStage;
    }
    else {
      filter.stage = { $ne: 'ECOURT_UPLOADED' };
    }
  }

  const q = opts.q?.trim();
  if (q) {
    const re = new RegExp(escapeRegex(q), 'i');
    filter.$or = [
      { caseNo: re },
      { applicantName: re },
      { village: re },
      { challanReference: re },
    ];
  }

  const { page, limit } = opts.pagination;
  const skip = (page - 1) * limit;
  const [docs, total] = await Promise.all([
    CaseModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    CaseModel.countDocuments(filter),
  ]);

  const rows = docs.map(doc => serializeCase(doc as CaseDoc & { _id: unknown }));
  const riNames = await resolveAssignedRiNameMap(rows.map(r => r.assignedRiId));

  return createPaginationResult(
    rows.map(row => ({
      ...row,
      assignedRiName: row.assignedRiId
        ? riNames.get(row.assignedRiId) ?? null
        : null,
    })),
    total,
    page,
    limit,
  );
}

export async function getCaseById(user: AuthUser, caseId: string) {
  const doc = await CaseModel.findById(caseId).lean();
  if (!doc) {
    throw new APIError({
      STATUS: HttpErrorStatusCode.NOT_FOUND,
      CODE: 'CASE_NOT_FOUND',
      TITLE: 'CASE_NOT_FOUND',
      MESSAGE: 'Case not found',
    });
  }
  assertCaseAccess(user, doc);

  const base = serializeCase(doc as CaseDoc & { _id: unknown });
  let mapDownloadUrl: string | null = null;
  let challanDownloadUrl: string | null = null;
  const allowedNext = getAllowedNextForUser(user, doc.stage as CaseStage);
  const assignedRiName = await resolveAssignedRiName(doc.assignedRiId);

  if (isS3Configured()) {
    if (doc.mapObjectKey) {
      try {
        const { downloadUrl } = await presignGetObject({
          key: doc.mapObjectKey,
          downloadFileName: path.basename(doc.mapObjectKey),
        });
        mapDownloadUrl = downloadUrl;
      }
      catch {
        mapDownloadUrl = null;
      }
    }
    if (doc.challanObjectKey) {
      try {
        const { downloadUrl } = await presignGetObject({
          key: doc.challanObjectKey,
          downloadFileName: path.basename(doc.challanObjectKey),
        });
        challanDownloadUrl = downloadUrl;
      }
      catch {
        challanDownloadUrl = null;
      }
    }
  }

  return {
    ...base,
    assignedRiName,
    mapDownloadUrl,
    challanDownloadUrl,
    allowedNext,
  };
}

export async function updateCaseDocuments(
  user: AuthUser,
  caseId: string,
  files: { mapFile?: Express.Multer.File | null; challanFile?: Express.Multer.File | null },
) {
  if (user.role !== 'tehsildar' || !user.tehsilId) {
    throw new APIError({
      STATUS: HttpErrorStatusCode.FORBIDDEN,
      CODE: 'ACCESS_DENIED',
      TITLE: 'ACCESS_DENIED',
      MESSAGE: 'Only a tehsildar can update case documents',
    });
  }

  if (!files.mapFile && !files.challanFile) {
    throw new APIError({
      STATUS: HttpErrorStatusCode.BAD_REQUEST,
      CODE: 'VALIDATION_FAILED',
      TITLE: 'VALIDATION_FAILED',
      MESSAGE: 'map and/or challan file is required',
    });
  }

  if (!isS3Configured()) {
    throw storageNotConfiguredError();
  }

  const doc = await CaseModel.findById(caseId);
  if (!doc) {
    throw new APIError({
      STATUS: HttpErrorStatusCode.NOT_FOUND,
      CODE: 'CASE_NOT_FOUND',
      TITLE: 'CASE_NOT_FOUND',
      MESSAGE: 'Case not found',
    });
  }
  assertCaseAccess(user, doc);

  if (files.mapFile) {
    doc.mapObjectKey = await uploadCaseFile({
      tehsilId: doc.tehsilId,
      caseId: String(doc._id),
      kind: 'map',
      file: files.mapFile,
    });
  }
  if (files.challanFile) {
    doc.challanObjectKey = await uploadCaseFile({
      tehsilId: doc.tehsilId,
      caseId: String(doc._id),
      kind: 'challan',
      file: files.challanFile,
    });
  }
  await doc.save();
  return serializeCase(doc.toObject());
}

export interface TransitionInput {
  toStage: string;
  assignedRiId?: string | null;
  hearingAt?: string | Date | null;
  note?: string | null;
  ecourtReference?: string | null;
}

async function resolveRiForMemo(
  tehsilId: string,
  pickedRiId: string | null | undefined,
): Promise<string> {
  const riUsers = await db
    .collection('user')
    .find({ role: 'ri', tehsilId })
    .project({ _id: 1, id: 1, name: 1, email: 1 })
    .toArray();

  const riIds = riUsers.map((u) => {
    if (typeof u.id === 'string' && u.id) {
      return u.id;
    }
    return String(u._id);
  });

  if (riIds.length === 0) {
    throw new APIError({
      STATUS: HttpErrorStatusCode.BAD_REQUEST,
      CODE: 'NO_RI_IN_TEHSIL',
      TITLE: 'NO_RI_IN_TEHSIL',
      MESSAGE: 'Add an RI to this tehsil before issuing memo',
    });
  }

  const picked = pickedRiId?.trim() || null;
  if (picked) {
    if (!riIds.includes(picked)) {
      throw new APIError({
        STATUS: HttpErrorStatusCode.BAD_REQUEST,
        CODE: 'VALIDATION_FAILED',
        TITLE: 'VALIDATION_FAILED',
        MESSAGE: 'assignedRiId must be an RI in this tehsil',
      });
    }
    return picked;
  }

  if (riIds.length === 1) {
    return riIds[0]!;
  }

  const openCounts = await CaseModel.aggregate<{ _id: string; count: number }>([
    {
      $match: {
        tehsilId,
        assignedRiId: { $in: riIds },
        stage: { $in: OPEN_CASE_STAGES },
      },
    },
    { $group: { _id: '$assignedRiId', count: { $sum: 1 } } },
  ]);

  const countMap = new Map(openCounts.map(row => [row._id, row.count]));
  const selected = pickLeastLoadedRi(
    riIds.map(id => ({ id, openCount: countMap.get(id) ?? 0 })),
  );
  if (!selected) {
    throw new APIError({
      STATUS: HttpErrorStatusCode.BAD_REQUEST,
      CODE: 'NO_RI_IN_TEHSIL',
      TITLE: 'NO_RI_IN_TEHSIL',
      MESSAGE: 'Add an RI to this tehsil before issuing memo',
    });
  }
  return selected;
}

export async function transitionCase(
  user: AuthUser,
  caseId: string,
  input: TransitionInput,
) {
  const toStageRaw = String(input.toStage ?? '').trim();
  if (!isCaseStage(toStageRaw)) {
    throw new APIError({
      STATUS: HttpErrorStatusCode.BAD_REQUEST,
      CODE: 'VALIDATION_FAILED',
      TITLE: 'VALIDATION_FAILED',
      MESSAGE: 'Invalid toStage',
    });
  }
  const toStage = toStageRaw;

  // Admin may only mark eCourt; tehsildar/ri handle all other transitions.
  if (user.role === 'admin') {
    if (toStage !== 'ECOURT_UPLOADED') {
      throw new APIError({
        STATUS: HttpErrorStatusCode.FORBIDDEN,
        CODE: 'ACCESS_DENIED',
        TITLE: 'ACCESS_DENIED',
        MESSAGE: 'Admin can only mark eCourt upload',
      });
    }
  }
  else if (user.role !== 'tehsildar' && user.role !== 'ri') {
    throw new APIError({
      STATUS: HttpErrorStatusCode.FORBIDDEN,
      CODE: 'ACCESS_DENIED',
      TITLE: 'ACCESS_DENIED',
      MESSAGE: 'Only tehsildar or assigned RI can transition cases',
    });
  }

  const doc = await CaseModel.findById(caseId);
  if (!doc) {
    throw new APIError({
      STATUS: HttpErrorStatusCode.NOT_FOUND,
      CODE: 'CASE_NOT_FOUND',
      TITLE: 'CASE_NOT_FOUND',
      MESSAGE: 'Case not found',
    });
  }
  assertCaseAccess(user, doc);

  if (!canTransition({ from: doc.stage, to: toStage, role: user.role })) {
    throw new APIError({
      STATUS: HttpErrorStatusCode.BAD_REQUEST,
      CODE: 'INVALID_TRANSITION',
      TITLE: 'INVALID_TRANSITION',
      MESSAGE: `Cannot move from ${doc.stage} to ${toStage} as ${user.role}`,
    });
  }

  if (user.role === 'ri') {
    if (!doc.assignedRiId || doc.assignedRiId !== user.id) {
      throw new APIError({
        STATUS: HttpErrorStatusCode.FORBIDDEN,
        CODE: 'ACCESS_DENIED',
        TITLE: 'ACCESS_DENIED',
        MESSAGE: 'Only the assigned RI can advance this case',
      });
    }
  }

  if (toStage === 'MEMO_ISSUED') {
    doc.assignedRiId = await resolveRiForMemo(doc.tehsilId, input.assignedRiId);
  }

  if (toStage === 'HEARING_SCHEDULED') {
    if (!input.hearingAt) {
      throw new APIError({
        STATUS: HttpErrorStatusCode.BAD_REQUEST,
        CODE: 'VALIDATION_FAILED',
        TITLE: 'VALIDATION_FAILED',
        MESSAGE: 'hearingAt is required when issuing notice',
      });
    }
    const hearingAt = new Date(input.hearingAt);
    if (Number.isNaN(hearingAt.getTime())) {
      throw new APIError({
        STATUS: HttpErrorStatusCode.BAD_REQUEST,
        CODE: 'VALIDATION_FAILED',
        TITLE: 'VALIDATION_FAILED',
        MESSAGE: 'hearingAt is invalid',
      });
    }
    doc.hearingAt = hearingAt;
  }

  if (toStage === 'ECOURT_UPLOADED') {
    doc.ecourtUploaded = true;
    const ref = input.ecourtReference?.trim();
    doc.ecourtReference = ref || null;
  }

  const fromStage = doc.stage;
  const stageChangedAt = new Date();
  doc.stage = toStage;
  doc.stageChangedAt = stageChangedAt;
  doc.stageDueAt = computeStageDueAt({
    stage: toStage,
    stageChangedAt,
    hearingAt: doc.hearingAt,
    filedAt: doc.filedAt,
  });
  doc.lastTransitionNote = input.note?.trim() || null;
  await doc.save();

  await CaseTransitionLogModel.create({
    caseId: String(doc._id),
    tehsilId: doc.tehsilId,
    fromStage,
    toStage,
    actorUserId: user.id,
    actorRole: user.role,
    note: input.note?.trim() || null,
    ecourtReference:
      toStage === 'ECOURT_UPLOADED' ? (doc.ecourtReference ?? null) : null,
  });

  const serialized = serializeCase(doc.toObject());
  return {
    ...serialized,
    assignedRiName: await resolveAssignedRiName(serialized.assignedRiId),
    allowedNext: getAllowedNextForUser(user, doc.stage),
  };
}

export async function listRisInMyTehsil(user: AuthUser) {
  if (user.role !== 'tehsildar' && user.role !== 'ri') {
    throw new APIError({
      STATUS: HttpErrorStatusCode.FORBIDDEN,
      CODE: 'ACCESS_DENIED',
      TITLE: 'ACCESS_DENIED',
      MESSAGE: 'Only tehsildar or RI can list tehsil RIs',
    });
  }
  if (!user.tehsilId) {
    throw new APIError({
      STATUS: HttpErrorStatusCode.FORBIDDEN,
      CODE: 'ACCESS_DENIED',
      TITLE: 'ACCESS_DENIED',
      MESSAGE: 'User has no tehsil assignment',
    });
  }

  const users = await db
    .collection('user')
    .find({ role: 'ri', tehsilId: user.tehsilId })
    .project({ _id: 1, id: 1, name: 1, email: 1, tehsilId: 1 })
    .sort({ name: 1 })
    .toArray();

  return users.map(u => ({
    id: typeof u.id === 'string' && u.id ? u.id : String(u._id),
    name: String(u.name ?? ''),
    email: String(u.email ?? ''),
    tehsilId: (u.tehsilId as string | null) ?? null,
  }));
}

export function getAllowedNextForUser(user: AuthUser, stage: CaseStage): CaseStage[] {
  if (user.role === 'admin') {
    return allowedTargets(stage, 'admin');
  }
  if (user.role !== 'tehsildar' && user.role !== 'ri') {
    return [];
  }
  return allowedTargets(stage, user.role);
}

function serializeTransitionLog(doc: {
  _id: unknown;
  caseId: string;
  tehsilId: string;
  fromStage: CaseStage;
  toStage: CaseStage;
  actorUserId: string;
  actorRole: string;
  note?: string | null;
  ecourtReference?: string | null;
  createdAt: Date;
}) {
  return {
    id: String(doc._id),
    caseId: doc.caseId,
    tehsilId: doc.tehsilId,
    fromStage: doc.fromStage,
    toStage: doc.toStage,
    actorUserId: doc.actorUserId,
    actorRole: doc.actorRole,
    note: doc.note ?? null,
    ecourtReference: doc.ecourtReference ?? null,
    createdAt: doc.createdAt,
  };
}

export async function listCaseTransitions(user: AuthUser, caseId: string) {
  const doc = await CaseModel.findById(caseId).lean();
  if (!doc) {
    throw new APIError({
      STATUS: HttpErrorStatusCode.NOT_FOUND,
      CODE: 'CASE_NOT_FOUND',
      TITLE: 'CASE_NOT_FOUND',
      MESSAGE: 'Case not found',
    });
  }
  assertCaseAccess(user, doc);
  const logs = await CaseTransitionLogModel.find({ caseId })
    .sort({ createdAt: -1 })
    .lean();
  return logs.map(serializeTransitionLog);
}

export async function listAdminTransitions(
  user: AuthUser,
  opts: {
    caseId?: string;
    tehsilId?: string;
    q?: string;
    pagination: PaginationQuery;
  },
) {
  if (user.role !== 'admin') {
    throw new APIError({
      STATUS: HttpErrorStatusCode.FORBIDDEN,
      CODE: 'ACCESS_DENIED',
      TITLE: 'ACCESS_DENIED',
      MESSAGE: 'Admin only',
    });
  }
  const filter: Record<string, unknown> = {};
  if (opts.caseId) {
    filter.caseId = opts.caseId;
  }
  if (opts.tehsilId) {
    filter.tehsilId = opts.tehsilId;
  }
  const q = opts.q?.trim();
  if (q) {
    const re = new RegExp(escapeRegex(q), 'i');
    filter.$or = [
      { caseId: re },
      { note: re },
      { actorRole: re },
      { fromStage: re },
      { toStage: re },
    ];
  }
  const { page, limit } = opts.pagination;
  const skip = (page - 1) * limit;
  const [docs, total] = await Promise.all([
    CaseTransitionLogModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    CaseTransitionLogModel.countDocuments(filter),
  ]);
  return createPaginationResult(
    docs.map(serializeTransitionLog),
    total,
    page,
    limit,
  );
}

/** Overdue = past guarantee and not closed via eCourt. */
export { overdueCaseMatch } from './case.sla';

export async function getCaseMetrics(user: AuthUser) {
  if (user.role !== 'admin') {
    throw new APIError({
      STATUS: HttpErrorStatusCode.FORBIDDEN,
      CODE: 'ACCESS_DENIED',
      TITLE: 'ACCESS_DENIED',
      MESSAGE: 'Admin only',
    });
  }

  const now = new Date();
  const [total, closed, overdue, byStageRows, byTehsilRows] = await Promise.all([
    CaseModel.countDocuments({}),
    CaseModel.countDocuments({ stage: 'ECOURT_UPLOADED' }),
    CaseModel.countDocuments(overdueCaseMatch(now)),
    CaseModel.aggregate<{ _id: CaseStage; count: number }>([
      { $group: { _id: '$stage', count: { $sum: 1 } } },
    ]),
    CaseModel.aggregate<{
      _id: string;
      total: number;
      overdue: number;
      closed: number;
    }>([
      {
        $group: {
          _id: '$tehsilId',
          total: { $sum: 1 },
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $lt: ['$guaranteeDueAt', now] },
                    { $ne: ['$stage', 'ECOURT_UPLOADED'] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          closed: {
            $sum: {
              $cond: [{ $eq: ['$stage', 'ECOURT_UPLOADED'] }, 1, 0],
            },
          },
        },
      },
    ]),
  ]);

  const stageCount = new Map(byStageRows.map(r => [r._id, r.count]));
  const byStage = CASE_STAGES.map(stage => ({
    stage,
    count: stageCount.get(stage) ?? 0,
  }));

  const tehsilIds = byTehsilRows.map(r => r._id);
  const tehsils = await TehsilModel.find({ _id: { $in: tehsilIds } })
    .select({ name: 1 })
    .lean();
  const nameById = new Map(tehsils.map(t => [String(t._id), t.name]));

  const byTehsil = byTehsilRows
    .map(r => ({
      tehsilId: r._id,
      tehsilName: nameById.get(r._id) ?? r._id,
      total: r.total,
      overdue: r.overdue,
      closed: r.closed,
    }))
    .sort((a, b) => a.tehsilName.localeCompare(b.tehsilName));

  return {
    total,
    closed,
    overdue,
    byStage,
    byTehsil,
    generatedAt: now.toISOString(),
  };
}
