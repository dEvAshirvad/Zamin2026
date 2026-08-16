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

import type { CaseStage, GuardianType } from './case.helpers';
import type { CaseDoc } from './case.model';

import { CaseCounterModel } from './case-counter.model';
import { CaseTransitionLogModel } from './case-transition-log.model';
import {
  CASE_STAGES,
  computeAlertStatus,
  computeFeeAmount,
  computeGuaranteeDueAt,
  computeReportDueAt,
  formatCaseNo,
  isCaseStage,
  isCaseVisibleToPatwari,
  isCaseVisibleToRi,
  normalizeKhasraRows,
  normalizeNeighbors,
  OPEN_CASE_STAGES,
  RI_ACTIVE_STAGES,
  sameUtcDay,
  sumRakba,
  utcYmd,
} from './case.helpers';
import { CaseModel } from './case.model';
import {
  buildDemarcationReportPdf,
  buildRescheduleSuchnaPdf,
  buildSuchnaPatraPdf,
} from './case.pdf';
import { buildSlaFields, computeStageDueAt, overdueCaseMatch } from './case.sla';
import {
  allowedTargets,
  canTransition,
  pickLeastLoadedRi,
} from './case.transitions';

export interface CreateCaseInput {
  applicantName: string;
  applicantContact?: string | null;
  applicantGuardianType?: string | null;
  applicantGuardianName?: string | null;
  applicantResidence?: string | null;
  village: string;
  khasras: unknown;
  neighbors: unknown;
  totalRakba?: number | null;
  filedAt?: string | Date | null;
  demarcationDate: string | Date;
  demarcationTime?: string | null;
  officeName?: string | null;
  district?: string | null;
  state?: string | null;
  patwariHalkaNumber: string;
  tehsildarName?: string | null;
  issueDate?: string | Date | null;
}

export interface TransitionInput {
  toStage: string;
  assignedRiId?: string | null;
  assignedPatwariId?: string | null;
  note?: string | null;
  objectionReason?: string | null;
  demarcationDate?: string | Date | null;
  reportFile?: Express.Multer.File | null;
}

function apiError(
  status: HttpErrorStatusCode,
  code: string,
  message: string,
) {
  return new APIError({
    STATUS: status,
    CODE: code,
    TITLE: code,
    MESSAGE: message,
  });
}

function validationError(message: string) {
  return apiError(
    HttpErrorStatusCode.BAD_REQUEST,
    'VALIDATION_FAILED',
    message,
  );
}

function storageNotConfiguredError() {
  return apiError(
    HttpErrorStatusCode.SERVICE_UNAVAILABLE,
    'STORAGE_NOT_CONFIGURED',
    'Object storage is not configured; file uploads are disabled',
  );
}

function parseDate(value: string | Date, field: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw validationError(`${field} is invalid`);
  }
  return date;
}

function optionalDate(
  value: string | Date | null | undefined,
  field: string,
): Date | null {
  return value == null || value === '' ? null : parseDate(value, field);
}

function normalizeTime(value: string | null | undefined): string {
  const time = value?.trim() || '12:00';
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (
    !match
    || Number(match[1]) > 23
    || Number(match[2]) > 59
  ) {
    throw validationError('demarcationTime must be in HH:mm format');
  }
  return time;
}

function combineUtcDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const combined = new Date(date);
  combined.setUTCHours(hours!, minutes!, 0, 0);
  return combined;
}

export function assertCaseAccess(
  user: AuthUser,
  caseDoc: CaseDoc | {
    tehsilId: string;
    assignedRiId?: string | null;
    assignedPatwariId?: string | null;
    stage?: string;
  },
) {
  if (user.role === 'admin') {
    return;
  }
  if (!user.tehsilId || user.tehsilId !== caseDoc.tehsilId) {
    throw apiError(
      HttpErrorStatusCode.FORBIDDEN,
      'ACCESS_DENIED',
      'Case is outside your tehsil',
    );
  }
  if (
    user.role === 'ri'
    && !isCaseVisibleToRi({
      assignedRiId: caseDoc.assignedRiId,
      riUserId: user.id,
      stage: caseDoc.stage ?? '',
    })
  ) {
    throw apiError(
      HttpErrorStatusCode.FORBIDDEN,
      'ACCESS_DENIED',
      'Case is not assigned to you or RI work is already complete',
    );
  }
  if (
    user.role === 'patwari'
    && !isCaseVisibleToPatwari({
      assignedPatwariId: caseDoc.assignedPatwariId,
      patwariUserId: user.id,
      stage: caseDoc.stage ?? '',
    })
  ) {
    throw apiError(
      HttpErrorStatusCode.FORBIDDEN,
      'ACCESS_DENIED',
      'Case is not assigned to you or Patwari work is already complete',
    );
  }
}

async function nextCaseNo(
  tehsilId: string,
  slug: string,
  filedAt: Date,
): Promise<string> {
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
  kind: 'notice' | 'report';
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

async function uploadGeneratedCasePdf(opts: {
  tehsilId: string;
  caseId: string;
  kind: 'notice' | 'report';
  doc: CaseDoc;
  note?: string | null;
}): Promise<string> {
  if (!isS3Configured()) {
    throw storageNotConfiguredError();
  }
  const body = opts.kind === 'notice'
    ? await buildSuchnaPatraPdf(opts.doc)
    : await buildDemarcationReportPdf(opts.doc, opts.note);
  const key = `cases/${opts.tehsilId}/${opts.caseId}/${opts.kind}-${randomUUID()}.pdf`;
  await putObject({ key, body, contentType: 'application/pdf' });
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
    applicantGuardianType: doc.applicantGuardianType ?? null,
    applicantGuardianName: doc.applicantGuardianName ?? null,
    applicantResidence: doc.applicantResidence ?? null,
    village: doc.village,
    khasras: doc.khasras,
    totalRakba: doc.totalRakba,
    neighbors: doc.neighbors,
    feeAmount: doc.feeAmount,
    filedAt: doc.filedAt,
    stage: doc.stage,
    assignedRiId: doc.assignedRiId ?? null,
    assignedPatwariId: doc.assignedPatwariId ?? null,
    noticePdfObjectKey: doc.noticePdfObjectKey ?? null,
    reportPdfObjectKey: doc.reportPdfObjectKey ?? null,
    demarcationDate: doc.demarcationDate ?? null,
    demarcationTime: doc.demarcationTime ?? null,
    officeName: doc.officeName ?? null,
    district: doc.district ?? null,
    state: doc.state ?? null,
    patwariHalkaNumber: doc.patwariHalkaNumber ?? null,
    tehsildarName: doc.tehsildarName ?? null,
    issueDate: doc.issueDate ?? null,
    stageChangedAt: doc.stageChangedAt ?? null,
    stageDueAt: doc.stageDueAt ?? null,
    reportDueAt: doc.reportDueAt ?? null,
    lastTransitionNote: doc.lastTransitionNote ?? null,
    objectionReason: doc.objectionReason ?? null,
    guaranteeDueAt: doc.guaranteeDueAt,
    alertStatus: computeAlertStatus({
      stage: doc.stage,
      reportDueAt: doc.reportDueAt,
    }),
    ...(doc.ecourtUploaded == null
      ? {}
      : { ecourtUploaded: doc.ecourtUploaded }),
    ...(doc.ecourtReference == null
      ? {}
      : { ecourtReference: doc.ecourtReference }),
    ...sla,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function resolveUserName(
  userId: string | null | undefined,
): Promise<string | null> {
  if (!userId)
    return null;
  const user = await findUserById(userId);
  const name = typeof user?.name === 'string' ? user.name.trim() : '';
  return name || null;
}

async function resolveUserNameMap(
  userIds: Array<string | null | undefined>,
): Promise<Map<string, string>> {
  const unique = [
    ...new Set(userIds.filter((id): id is string => Boolean(id?.trim()))),
  ];
  const names = new Map<string, string>();
  if (unique.length === 0)
    return names;

  const users = await db
    .collection('user')
    .find({
      $or: [
        { id: { $in: unique } },
        { _id: { $in: unique as unknown as import('mongodb').ObjectId[] } },
      ],
    })
    .project({ _id: 1, id: 1, name: 1 })
    .toArray();

  for (const user of users) {
    const id = typeof user.id === 'string' && user.id
      ? user.id
      : String(user._id);
    const name = typeof user.name === 'string' ? user.name.trim() : '';
    if (id && name)
      names.set(id, name);
  }
  return names;
}

export async function createCase(user: AuthUser, input: CreateCaseInput) {
  if (user.role !== 'tehsildar' || !user.tehsilId) {
    throw apiError(
      HttpErrorStatusCode.FORBIDDEN,
      'ACCESS_DENIED',
      'Only a tehsildar with a tehsil can create cases',
    );
  }

  const applicantName = String(input.applicantName ?? '').trim();
  const village = String(input.village ?? '').trim();
  const patwariHalkaNumber = String(input.patwariHalkaNumber ?? '').trim();
  const khasras = normalizeKhasraRows(input.khasras);
  const neighbors = normalizeNeighbors(input.neighbors);
  if (
    !applicantName
    || !village
    || !patwariHalkaNumber
    || !input.demarcationDate
  ) {
    throw validationError(
      'applicantName, village, patwariHalkaNumber, and demarcationDate are required',
    );
  }
  if (khasras.length === 0) {
    throw validationError('At least one khasra with positive rakba is required');
  }
  if (neighbors.length === 0) {
    throw validationError('At least one neighbor is required');
  }

  const guardianTypeRaw = input.applicantGuardianType?.trim() || null;
  if (
    guardianTypeRaw
    && guardianTypeRaw !== 'पिता'
    && guardianTypeRaw !== 'पति'
  ) {
    throw validationError('applicantGuardianType must be पिता or पति');
  }
  const guardianName = input.applicantGuardianName?.trim() || null;
  if (guardianTypeRaw && !guardianName) {
    throw validationError(
      'applicantGuardianName is required with applicantGuardianType',
    );
  }

  const filedAt = new Date();
  const demarcationDate = parseDate(
    input.demarcationDate,
    'demarcationDate',
  );
  if (utcYmd(demarcationDate) <= utcYmd(filedAt)) {
    throw validationError(
      'demarcationDate must be after the filedAt calendar day',
    );
  }

  // Issued when memo is posted — not at intake.
  const issueDate = null;
  const demarcationTime = normalizeTime(input.demarcationTime);
  const calculatedRakba = sumRakba(khasras);
  if (
    input.totalRakba != null
    && (
      !Number.isFinite(input.totalRakba)
      || Math.abs(input.totalRakba - calculatedRakba) > 0.0001
    )
  ) {
    throw validationError('totalRakba must match the sum of khasra rakbas');
  }
  const totalRakba = input.totalRakba ?? calculatedRakba;

  const tehsil = await TehsilModel.findById(user.tehsilId);
  if (!tehsil) {
    throw apiError(
      HttpErrorStatusCode.BAD_REQUEST,
      'TEHSIL_NOT_FOUND',
      'Tehsil not found for current user',
    );
  }

  const caseNo = await nextCaseNo(user.tehsilId, tehsil.slug, filedAt);
  const stageChangedAt = filedAt;
  const created = await CaseModel.create({
    caseNo,
    tehsilId: user.tehsilId,
    createdByUserId: user.id,
    applicantName,
    applicantContact: input.applicantContact?.trim() || null,
    applicantGuardianType: guardianTypeRaw as GuardianType | null,
    applicantGuardianName: guardianName,
    applicantResidence: input.applicantResidence?.trim() || village,
    village,
    khasras,
    totalRakba,
    neighbors,
    feeAmount: computeFeeAmount(khasras.length),
    filedAt,
    stage: 'SUBMITTED',
    assignedRiId: null,
    assignedPatwariId: null,
    noticePdfObjectKey: null,
    reportPdfObjectKey: null,
    demarcationDate,
    demarcationTime,
    officeName: input.officeName?.trim() || tehsil.name,
    district: input.district?.trim() || 'रायपुर',
    state: input.state?.trim() || 'छत्तीसगढ़',
    patwariHalkaNumber,
    tehsildarName: input.tehsildarName?.trim() || user.name.trim(),
    tehsildarOrderDate: null,
    issueDate,
    stageChangedAt,
    stageDueAt: computeStageDueAt({
      stage: 'SUBMITTED',
      stageChangedAt,
      filedAt,
    }),
    reportDueAt: null,
    lastTransitionNote: null,
    objectionReason: null,
    guaranteeDueAt: computeGuaranteeDueAt(filedAt),
    ecourtUploaded: false,
    ecourtReference: null,
  });

  return serializeCase(created.toObject());
}

export async function listCases(
  user: AuthUser,
  opts: {
    stage?: string;
    overdue?: boolean;
    alert?: 'OVERDUE';
    q?: string;
    tehsilId?: string;
    pagination: PaginationQuery;
  },
) {
  const filter: Record<string, unknown> = {};
  if (user.role === 'admin') {
    if (opts.tehsilId?.trim())
      filter.tehsilId = opts.tehsilId.trim();
  }
  else {
    if (!user.tehsilId) {
      throw apiError(
        HttpErrorStatusCode.FORBIDDEN,
        'ACCESS_DENIED',
        'User has no tehsil assignment',
      );
    }
    filter.tehsilId = user.tehsilId;
  }

  if (user.role === 'ri' || user.role === 'patwari') {
    if (user.role === 'ri')
      filter.assignedRiId = user.id;
    else
      filter.assignedPatwariId = user.id;
    filter.stage = opts.stage
      && isCaseStage(opts.stage)
      && RI_ACTIVE_STAGES.includes(opts.stage)
      ? opts.stage
      : { $in: RI_ACTIVE_STAGES };
  }
  else if (opts.stage && isCaseStage(opts.stage)) {
    filter.stage = opts.stage;
  }

  const and: Record<string, unknown>[] = [];
  if (opts.overdue)
    and.push(overdueCaseMatch(new Date()));
  if (opts.alert === 'OVERDUE') {
    and.push({
      stage: 'DEMARCATION_DONE',
      reportDueAt: { $lt: new Date() },
    });
  }
  if (and.length > 0)
    filter.$and = and;

  const q = opts.q?.trim();
  if (q) {
    const re = new RegExp(escapeRegex(q), 'i');
    filter.$or = [
      { caseNo: re },
      { applicantName: re },
      { village: re },
      { patwariHalkaNumber: re },
    ];
  }

  const { page, limit } = opts.pagination;
  const [docs, total] = await Promise.all([
    CaseModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    CaseModel.countDocuments(filter),
  ]);
  const rows = docs.map(doc =>
    serializeCase(doc as CaseDoc & { _id: unknown }),
  );
  const names = await resolveUserNameMap(
    rows.flatMap(row => [row.assignedRiId, row.assignedPatwariId]),
  );

  return createPaginationResult(
    rows.map(row => ({
      ...row,
      assignedRiName: row.assignedRiId
        ? names.get(row.assignedRiId) ?? null
        : null,
      assignedPatwariName: row.assignedPatwariId
        ? names.get(row.assignedPatwariId) ?? null
        : null,
    })),
    total,
    page,
    limit,
  );
}

async function presignCaseObject(key: string | null | undefined) {
  if (!key || !isS3Configured())
    return null;
  try {
    const { downloadUrl } = await presignGetObject({
      key,
      downloadFileName: path.basename(key),
    });
    return downloadUrl;
  }
  catch {
    return null;
  }
}

export async function getCaseById(user: AuthUser, caseId: string) {
  const doc = await CaseModel.findById(caseId).lean();
  if (!doc) {
    throw apiError(
      HttpErrorStatusCode.NOT_FOUND,
      'CASE_NOT_FOUND',
      'Case not found',
    );
  }
  assertCaseAccess(user, doc);

  const base = serializeCase(doc as CaseDoc & { _id: unknown });
  const [
    assignedRiName,
    assignedPatwariName,
    noticePdfDownloadUrl,
    reportPdfDownloadUrl,
  ] = await Promise.all([
    resolveUserName(doc.assignedRiId),
    resolveUserName(doc.assignedPatwariId),
    presignCaseObject(doc.noticePdfObjectKey),
    presignCaseObject(doc.reportPdfObjectKey),
  ]);

  return {
    ...base,
    assignedRiName,
    assignedPatwariName,
    noticePdfDownloadUrl,
    reportPdfDownloadUrl,
    allowedNext: getAllowedNextForUser(user, doc.stage),
  };
}

async function resolveRiForMemo(
  tehsilId: string,
  pickedRiId: string | null | undefined,
): Promise<string> {
  const riUsers = await db
    .collection('user')
    .find({ role: 'ri', tehsilId })
    .project({ _id: 1, id: 1 })
    .toArray();
  const riIds = riUsers.map(user =>
    typeof user.id === 'string' && user.id
      ? user.id
      : String(user._id),
  );
  const picked = pickedRiId?.trim() || null;
  if (picked) {
    if (!riIds.includes(picked)) {
      throw validationError('assignedRiId must be an RI in this tehsil');
    }
    return picked;
  }
  if (riIds.length === 0) {
    throw apiError(
      HttpErrorStatusCode.BAD_REQUEST,
      'NO_RI_IN_TEHSIL',
      'Add an RI to this tehsil before issuing memo',
    );
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
  const countByRi = new Map(openCounts.map(row => [row._id, row.count]));
  const selected = pickLeastLoadedRi(
    riIds.map(id => ({ id, openCount: countByRi.get(id) ?? 0 })),
  );
  if (!selected) {
    throw apiError(
      HttpErrorStatusCode.BAD_REQUEST,
      'NO_RI_IN_TEHSIL',
      'Add an RI to this tehsil before issuing memo',
    );
  }
  return selected;
}

async function validateStaffAssignment(
  userId: string,
  role: 'ri' | 'patwari',
  tehsilId: string,
) {
  const staff = await findUserById(userId);
  if (staff?.role !== role || staff.tehsilId !== tehsilId) {
    throw validationError(
      `assigned${role === 'ri' ? 'Ri' : 'Patwari'}Id must be a ${role} in this tehsil`,
    );
  }
}

export async function transitionCase(
  user: AuthUser,
  caseId: string,
  input: TransitionInput,
) {
  const toStageRaw = String(input.toStage ?? '').trim();
  if (!isCaseStage(toStageRaw))
    throw validationError('Invalid toStage');
  const toStage = toStageRaw;

  if (
    user.role !== 'tehsildar'
    && user.role !== 'ri'
    && user.role !== 'patwari'
  ) {
    throw apiError(
      HttpErrorStatusCode.FORBIDDEN,
      'ACCESS_DENIED',
      'Only tehsildar, RI, or Patwari can transition cases',
    );
  }

  const doc = await CaseModel.findById(caseId);
  if (!doc) {
    throw apiError(
      HttpErrorStatusCode.NOT_FOUND,
      'CASE_NOT_FOUND',
      'Case not found',
    );
  }
  assertCaseAccess(user, doc);

  if (!canTransition({ from: doc.stage, to: toStage, role: user.role })) {
    throw apiError(
      HttpErrorStatusCode.BAD_REQUEST,
      'INVALID_TRANSITION',
      `Cannot move from ${doc.stage} to ${toStage} as ${user.role}`,
    );
  }
  if (user.role === 'ri' && doc.assignedRiId !== user.id) {
    throw apiError(
      HttpErrorStatusCode.FORBIDDEN,
      'ACCESS_DENIED',
      'Only the assigned RI can advance this case',
    );
  }
  if (
    user.role === 'patwari'
    && doc.assignedPatwariId !== user.id
  ) {
    throw apiError(
      HttpErrorStatusCode.FORBIDDEN,
      'ACCESS_DENIED',
      'Only the assigned Patwari can advance this case',
    );
  }

  if (toStage === 'MEMO_ISSUED') {
    const assignedRiId = input.assignedRiId?.trim();
    const assignedPatwariId = input.assignedPatwariId?.trim();
    if (!assignedRiId || !assignedPatwariId) {
      throw validationError(
        'assignedRiId and assignedPatwariId are required when issuing memo',
      );
    }
    await Promise.all([
      validateStaffAssignment(assignedRiId, 'ri', doc.tehsilId),
      validateStaffAssignment(assignedPatwariId, 'patwari', doc.tehsilId),
    ]);
    doc.assignedRiId = await resolveRiForMemo(doc.tehsilId, assignedRiId);
    doc.assignedPatwariId = assignedPatwariId;
    doc.issueDate = new Date();
  }

  // Notice PDF is generated on HEARING_SCHEDULED (NOTICE_ISSUED stage skipped).

  if (toStage === 'HEARING_SCHEDULED') {
    if (!doc.demarcationDate)
      throw validationError('Case has no demarcationDate');
    doc.issueDate = doc.issueDate ?? new Date();
    if (isS3Configured()) {
      doc.noticePdfObjectKey = await uploadGeneratedCasePdf({
        tehsilId: doc.tehsilId,
        caseId: String(doc._id),
        kind: 'notice',
        doc,
      });
    }
  }

  if (toStage === 'OBJECTION_CLOSED') {
    const objectionReason
      = input.objectionReason?.trim() || input.note?.trim() || null;
    if (!objectionReason)
      throw validationError('objectionReason is required');
    doc.objectionReason = objectionReason;
  }

  if (toStage === 'DEMARCATION_WINDOW_OPEN') {
    if (
      !doc.demarcationDate
      || !sameUtcDay(new Date(), doc.demarcationDate)
    ) {
      throw apiError(
        HttpErrorStatusCode.BAD_REQUEST,
        'INVALID_TRANSITION',
        'Demarcation window can only open on the demarcationDate',
      );
    }
  }

  const stageChangedAt = new Date();
  if (toStage === 'DEMARCATION_DONE')
    doc.reportDueAt = computeReportDueAt(stageChangedAt);

  if (toStage === 'REPORT_SUBMITTED') {
    if (!input.reportFile)
      throw validationError('reportFile is required when submitting report');
    doc.reportPdfObjectKey = await uploadCaseFile({
      tehsilId: doc.tehsilId,
      caseId: String(doc._id),
      kind: 'report',
      file: input.reportFile,
    });
  }

  const fromStage = doc.stage;
  const note = input.note?.trim() || null;
  doc.stage = toStage;
  doc.stageChangedAt = stageChangedAt;
  doc.stageDueAt = computeStageDueAt({
    stage: toStage,
    stageChangedAt,
    demarcationAt: doc.demarcationDate
      ? combineUtcDateAndTime(
          doc.demarcationDate,
          normalizeTime(doc.demarcationTime),
        )
      : null,
    filedAt: doc.filedAt,
    reportDueAt: doc.reportDueAt,
  });
  doc.lastTransitionNote = note;
  await doc.save();

  await CaseTransitionLogModel.create({
    caseId: String(doc._id),
    tehsilId: doc.tehsilId,
    fromStage,
    toStage,
    actorUserId: user.id,
    actorRole: user.role,
    note,
    ecourtReference: null,
  });

  const serialized = serializeCase(doc.toObject());
  const [assignedRiName, assignedPatwariName] = await Promise.all([
    resolveUserName(serialized.assignedRiId),
    resolveUserName(serialized.assignedPatwariId),
  ]);
  return {
    ...serialized,
    assignedRiName,
    assignedPatwariName,
    allowedNext: getAllowedNextForUser(user, doc.stage),
  };
}

export async function rescheduleDemarcation(
  user: AuthUser,
  caseId: string,
  input: {
    demarcationDate: string | Date;
    demarcationTime?: string | null;
    reason: string;
  },
) {
  if (user.role !== 'ri' && user.role !== 'patwari') {
    throw apiError(
      HttpErrorStatusCode.FORBIDDEN,
      'ACCESS_DENIED',
      'Only the assigned RI or Patwari can reschedule demarcation',
    );
  }
  const reason = input.reason?.trim() ?? '';
  if (!reason) {
    throw validationError('reason is required when rescheduling');
  }
  const doc = await CaseModel.findById(caseId);
  if (!doc) {
    throw apiError(
      HttpErrorStatusCode.NOT_FOUND,
      'CASE_NOT_FOUND',
      'Case not found',
    );
  }
  assertCaseAccess(user, doc);
  if (doc.stage !== 'HEARING_SCHEDULED') {
    throw apiError(
      HttpErrorStatusCode.BAD_REQUEST,
      'INVALID_TRANSITION',
      'Demarcation can only be rescheduled from HEARING_SCHEDULED',
    );
  }

  const nextDate = parseDate(input.demarcationDate, 'demarcationDate');
  if (utcYmd(nextDate) <= utcYmd(doc.filedAt)) {
    throw validationError('demarcationDate must be after filedAt');
  }
  const nextTime = normalizeTime(input.demarcationTime);

  const previousDate = doc.demarcationDate;
  const previousTime = doc.demarcationTime ?? '12:00';
  const previousNoticeIssueDate = doc.issueDate;

  doc.demarcationDate = nextDate;
  doc.demarcationTime = nextTime;
  doc.issueDate = new Date();
  doc.stageDueAt = computeStageDueAt({
    stage: doc.stage,
    stageChangedAt: doc.stageChangedAt ?? new Date(),
    demarcationAt: combineUtcDateAndTime(nextDate, nextTime),
    filedAt: doc.filedAt,
  });

  if (isS3Configured()) {
    const body = await buildRescheduleSuchnaPdf(doc, {
      previousDemarcationDate: previousDate,
      previousDemarcationTime: previousTime,
      previousNoticeIssueDate,
      reason,
    });
    const key = `cases/${doc.tehsilId}/${doc._id}/notice-${randomUUID()}.pdf`;
    await putObject({ key, body, contentType: 'application/pdf' });
    doc.noticePdfObjectKey = key;
  }

  const note = `Reschedule: ${utcYmd(nextDate)} ${nextTime}. Reason: ${reason}`
    + (previousDate
      ? ` (was ${utcYmd(previousDate)} ${previousTime})`
      : '');
  doc.lastTransitionNote = note;
  await doc.save();

  await CaseTransitionLogModel.create({
    caseId: String(doc._id),
    tehsilId: doc.tehsilId,
    fromStage: 'HEARING_SCHEDULED',
    toStage: 'HEARING_SCHEDULED',
    actorUserId: user.id,
    actorRole: user.role,
    note,
    ecourtReference: null,
  });
  return serializeCase(doc.toObject());
}

async function listStaffInMyTehsil(
  user: AuthUser,
  role: 'ri' | 'patwari',
) {
  if (
    user.role !== 'tehsildar'
    && user.role !== 'ri'
    && user.role !== 'patwari'
  ) {
    throw apiError(
      HttpErrorStatusCode.FORBIDDEN,
      'ACCESS_DENIED',
      'Only tehsil field staff can list tehsil staff',
    );
  }
  if (!user.tehsilId) {
    throw apiError(
      HttpErrorStatusCode.FORBIDDEN,
      'ACCESS_DENIED',
      'User has no tehsil assignment',
    );
  }
  const users = await db
    .collection('user')
    .find({ role, tehsilId: user.tehsilId })
    .project({ _id: 1, id: 1, name: 1, email: 1, tehsilId: 1 })
    .sort({ name: 1 })
    .toArray();
  return users.map(staff => ({
    id: typeof staff.id === 'string' && staff.id
      ? staff.id
      : String(staff._id),
    name: String(staff.name ?? ''),
    email: String(staff.email ?? ''),
    tehsilId: (staff.tehsilId as string | null) ?? null,
  }));
}

export async function listRisInMyTehsil(user: AuthUser) {
  return listStaffInMyTehsil(user, 'ri');
}

export async function listPatwarisInMyTehsil(user: AuthUser) {
  return listStaffInMyTehsil(user, 'patwari');
}

export function getAllowedNextForUser(
  user: AuthUser,
  stage: CaseStage,
): CaseStage[] {
  if (
    user.role !== 'tehsildar'
    && user.role !== 'ri'
    && user.role !== 'patwari'
  ) {
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
    throw apiError(
      HttpErrorStatusCode.NOT_FOUND,
      'CASE_NOT_FOUND',
      'Case not found',
    );
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
    throw apiError(
      HttpErrorStatusCode.FORBIDDEN,
      'ACCESS_DENIED',
      'Admin only',
    );
  }
  const filter: Record<string, unknown> = {};
  if (opts.caseId)
    filter.caseId = opts.caseId;
  if (opts.tehsilId)
    filter.tehsilId = opts.tehsilId;
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
  const [docs, total] = await Promise.all([
    CaseTransitionLogModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
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

export async function generateNoticePdf(user: AuthUser, caseId: string) {
  const doc = await CaseModel.findById(caseId);
  if (!doc) {
    throw apiError(
      HttpErrorStatusCode.NOT_FOUND,
      'CASE_NOT_FOUND',
      'Case not found',
    );
  }
  assertCaseAccess(user, doc);
  if (!isS3Configured())
    throw storageNotConfiguredError();

  doc.noticePdfObjectKey = await uploadGeneratedCasePdf({
    tehsilId: doc.tehsilId,
    caseId: String(doc._id),
    kind: 'notice',
    doc,
  });
  await doc.save();
  const noticePdfDownloadUrl = await presignCaseObject(
    doc.noticePdfObjectKey,
  );
  return {
    noticePdfObjectKey: doc.noticePdfObjectKey,
    noticePdfDownloadUrl,
  };
}

/** Overdue = past guarantee and not in a closed Suchna Patra stage. */
export { overdueCaseMatch } from './case.sla';

export async function getCaseMetrics(user: AuthUser) {
  if (user.role !== 'admin') {
    throw apiError(
      HttpErrorStatusCode.FORBIDDEN,
      'ACCESS_DENIED',
      'Admin only',
    );
  }

  const now = new Date();
  const closedStages: CaseStage[] = ['ORDER_ISSUED', 'OBJECTION_CLOSED'];
  const reportOverdueMatch = {
    stage: 'DEMARCATION_DONE',
    reportDueAt: { $lt: now },
  };
  const [
    total,
    closed,
    overdue,
    reportOverdue,
    byStageRows,
    byTehsilRows,
  ] = await Promise.all([
    CaseModel.countDocuments({}),
    CaseModel.countDocuments({ stage: { $in: closedStages } }),
    CaseModel.countDocuments(overdueCaseMatch(now)),
    CaseModel.countDocuments(reportOverdueMatch),
    CaseModel.aggregate<{ _id: CaseStage; count: number }>([
      { $group: { _id: '$stage', count: { $sum: 1 } } },
    ]),
    CaseModel.aggregate<{
      _id: string;
      total: number;
      overdue: number;
      reportOverdue: number;
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
                    { $not: [{ $in: ['$stage', closedStages] }] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          reportOverdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$stage', 'DEMARCATION_DONE'] },
                    { $lt: ['$reportDueAt', now] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          closed: {
            $sum: {
              $cond: [{ $in: ['$stage', closedStages] }, 1, 0],
            },
          },
        },
      },
    ]),
  ]);

  const stageCount = new Map(byStageRows.map(row => [row._id, row.count]));
  const byStage = CASE_STAGES.map(stage => ({
    stage,
    count: stageCount.get(stage) ?? 0,
  }));
  const tehsilIds = byTehsilRows.map(row => row._id);
  const tehsils = await TehsilModel.find({ _id: { $in: tehsilIds } })
    .select({ name: 1 })
    .lean();
  const nameById = new Map(tehsils.map(tehsil => [
    String(tehsil._id),
    tehsil.name,
  ]));
  const byTehsil = byTehsilRows
    .map(row => ({
      tehsilId: row._id,
      tehsilName: nameById.get(row._id) ?? row._id,
      total: row.total,
      overdue: row.overdue,
      reportOverdue: row.reportOverdue,
      closed: row.closed,
    }))
    .sort((a, b) => a.tehsilName.localeCompare(b.tehsilName));

  return {
    total,
    closed,
    overdue,
    reportOverdue,
    byStage,
    byTehsil,
    generatedAt: now.toISOString(),
  };
}
