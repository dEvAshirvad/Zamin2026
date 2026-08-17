import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { PaginationQuery } from '@/lib/paginator';
import type { AuthUser } from '@/types/global';

import { db } from '@/configs/db/mongodb';
import APIError from '@/configs/errors/APIError';
import {
  getObjectBuffer,
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
  computeReportDueAtFromDemarcation,
  formatCaseNo,
  isCaseStage,
  isCaseVisibleToPatwari,
  isCaseVisibleToRi,
  istYmd,
  normalizeKhasraRows,
  normalizeNeighbors,
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
} from './case.transitions';

export interface CreateCaseInput {
  applicantName: string;
  applicantContact?: string | null;
  applicantGuardianType?: string | null;
  applicantGuardianName?: string | null;
  /** Address (replaces separate village / residence at intake). */
  applicantResidence?: string | null;
  village?: string | null;
  khasras?: unknown;
  neighbors?: unknown;
  totalRakba?: number | null;
  filedAt?: string | Date | null;
  demarcationDate?: string | Date | null;
  demarcationTime?: string | null;
  officeName?: string | null;
  district?: string | null;
  state?: string | null;
  patwariHalkaNumber?: string | null;
  tehsildarName?: string | null;
  issueDate?: string | Date | null;
}

export interface TransitionInput {
  toStage: string;
  /** Single assignee — RI or Patwari (preferred over dual ids). */
  assignedStaffId?: string | null;
  assignedRiId?: string | null;
  assignedPatwariId?: string | null;
  note?: string | null;
  objectionReason?: string | null;
  neighbors?: unknown;
  issueDate?: string | Date | null;
  demarcationDate?: string | Date | null;
  demarcationTime?: string | null;
  noticeFile?: Express.Multer.File | null;
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
  // Derive from demarcation day so older cases keep the 23:59-same-day rule.
  const reportDueAt
    = doc.demarcationDate
    && (
      doc.stage === 'HEARING_SCHEDULED'
      || doc.stage === 'DEMARCATION_WINDOW_OPEN'
      || doc.stage === 'DEMARCATION_DONE'
    )
      ? computeReportDueAtFromDemarcation(doc.demarcationDate)
      : doc.reportDueAt ?? null;
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
    reportDueAt,
    lastTransitionNote: doc.lastTransitionNote ?? null,
    objectionReason: doc.objectionReason ?? null,
    superiorAlert: Boolean(doc.superiorAlert),
    guaranteeDueAt: doc.guaranteeDueAt,
    alertStatus: computeAlertStatus({
      stage: doc.stage,
      reportDueAt,
    }),
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
  const address = String(
    input.applicantResidence ?? input.village ?? '',
  ).trim();
  if (!applicantName || !address) {
    throw validationError('applicantName and address are required');
  }

  const khasras = input.khasras != null ? normalizeKhasraRows(input.khasras) : [];
  const neighbors
    = input.neighbors != null ? normalizeNeighbors(input.neighbors) : [];
  const patwariHalkaNumber
    = String(input.patwariHalkaNumber ?? '').trim() || null;

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

  const filedAt = optionalDate(input.filedAt, 'filedAt') ?? new Date();
  const demarcationDate = optionalDate(
    input.demarcationDate,
    'demarcationDate',
  );
  if (
    demarcationDate
    && utcYmd(demarcationDate) <= utcYmd(filedAt)
  ) {
    throw validationError(
      'demarcationDate must be after the filedAt calendar day',
    );
  }

  // Issued when memo is posted — not at intake.
  const issueDate = null;
  const demarcationTime = demarcationDate
    ? normalizeTime(input.demarcationTime)
    : '12:00';
  const calculatedRakba = khasras.length > 0 ? sumRakba(khasras) : 0;
  if (
    khasras.length > 0
    && input.totalRakba != null
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

  // Village kept for schema/PDF until later stages fill land details.
  const village = String(input.village ?? '').trim() || '—';

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
    applicantResidence: address,
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
    superiorAlert: false,
    guaranteeDueAt: computeGuaranteeDueAt(filedAt),
  });

  const filedNote
    = `Case filed · applicant ${applicantName}`
    + (guardianName ? ` · ${guardianTypeRaw ?? ''} ${guardianName}`.trim() : '')
    + ` · filed ${utcYmd(filedAt)}`;
  created.lastTransitionNote = filedNote;
  await created.save();
  await CaseTransitionLogModel.create({
    caseId: String(created._id),
    tehsilId: created.tehsilId,
    fromStage: 'SUBMITTED',
    toStage: 'SUBMITTED',
    actorUserId: user.id,
    actorRole: user.role,
    note: filedNote,
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
      stage: {
        $in: [
          'HEARING_SCHEDULED',
          'DEMARCATION_WINDOW_OPEN',
          'DEMARCATION_DONE',
        ],
      },
      reportDueAt: { $lte: new Date() },
      $or: [
        { reportPdfObjectKey: null },
        { reportPdfObjectKey: { $exists: false } },
      ],
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
  const doc = await CaseModel.findById(caseId);
  if (!doc) {
    throw apiError(
      HttpErrorStatusCode.NOT_FOUND,
      'CASE_NOT_FOUND',
      'Case not found',
    );
  }
  assertCaseAccess(user, doc);

  // Heal stored due to 23:59 same demarcation day (older cases used next midnight).
  if (
    doc.demarcationDate
    && (
      doc.stage === 'HEARING_SCHEDULED'
      || doc.stage === 'DEMARCATION_WINDOW_OPEN'
      || doc.stage === 'DEMARCATION_DONE'
    )
  ) {
    const due = computeReportDueAtFromDemarcation(doc.demarcationDate);
    if (!doc.reportDueAt || doc.reportDueAt.getTime() !== due.getTime()) {
      doc.reportDueAt = due;
      await doc.save();
    }
  }

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

async function resolveAssignedFieldStaff(
  tehsilId: string,
  staffId: string,
): Promise<{ role: 'ri' | 'patwari'; userId: string; name: string }> {
  const staff = await findUserById(staffId);
  if (
    !staff
    || staff.tehsilId !== tehsilId
    || (staff.role !== 'ri' && staff.role !== 'patwari')
  ) {
    throw validationError(
      'assignedStaffId must be an RI or Patwari in this tehsil',
    );
  }
  return {
    role: staff.role,
    userId: staffId,
    name: staff.name?.trim() || staff.email || staffId,
  };
}

/** Auto history note when the actor does not supply one. */
function buildAutoTransitionNote(opts: {
  toStage: CaseStage;
  doc: CaseDoc;
  assignedStaffLabel?: string | null;
}): string {
  const { toStage, doc } = opts;
  switch (toStage) {
    case 'MEMO_ISSUED':
      return opts.assignedStaffLabel
        ? `Memo issued · assigned ${opts.assignedStaffLabel}`
        : 'Memo issued';
    case 'HEARING_SCHEDULED': {
      const notice = doc.issueDate ? utcYmd(doc.issueDate) : '—';
      const dem = doc.demarcationDate
        ? `${utcYmd(doc.demarcationDate)} ${doc.demarcationTime ?? '12:00'}`
        : '—';
      const n = doc.neighbors?.length ?? 0;
      return `Notice issued · notice ${notice} · demarcation ${dem} · neighbors ${n}`;
    }
    case 'OBJECTION_CLOSED':
      return doc.objectionReason?.trim()
        ? `Closed with objection: ${doc.objectionReason.trim()}`
        : 'Closed with objection';
    case 'DEMARCATION_WINDOW_OPEN':
      return 'Demarcation window opened';
    case 'DEMARCATION_DONE':
      return 'Demarcation marked done';
    case 'REPORT_SUBMITTED':
      return 'Demarcation report uploaded';
    case 'ORDER_ISSUED':
      return 'Order issued';
    default:
      return `Moved to ${toStage}`;
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

  let assignedStaffLabel: string | null = null;
  if (toStage === 'MEMO_ISSUED') {
    const staffId
      = input.assignedStaffId?.trim()
      || input.assignedRiId?.trim()
      || input.assignedPatwariId?.trim()
      || '';
    if (!staffId) {
      throw validationError(
        'assignedStaffId is required when issuing memo (RI or Patwari)',
      );
    }
    const assigned = await resolveAssignedFieldStaff(doc.tehsilId, staffId);
    doc.assignedRiId = assigned.role === 'ri' ? assigned.userId : null;
    doc.assignedPatwariId
      = assigned.role === 'patwari' ? assigned.userId : null;
    assignedStaffLabel
      = `${assigned.name} (${assigned.role === 'ri' ? 'RI' : 'Patwari'})`;
  }

  if (toStage === 'HEARING_SCHEDULED') {
    const neighbors = normalizeNeighbors(input.neighbors);
    if (neighbors.length === 0) {
      throw validationError('At least one neighbor is required');
    }
    const issueDate = optionalDate(input.issueDate, 'issueDate');
    if (!issueDate) {
      throw validationError('issueDate (notice date) is required');
    }
    if (utcYmd(issueDate) < utcYmd(doc.filedAt)) {
      throw validationError(
        'notice date (issueDate) must be on or after the application (filedAt) day',
      );
    }
    const demarcationDate = optionalDate(
      input.demarcationDate,
      'demarcationDate',
    );
    if (!demarcationDate) {
      throw validationError('demarcationDate is required');
    }
    if (utcYmd(demarcationDate) < utcYmd(issueDate)) {
      throw validationError(
        'demarcationDate must be on or after the notice (issueDate) day',
      );
    }
    doc.neighbors = neighbors;
    doc.issueDate = issueDate;
    doc.demarcationDate = demarcationDate;
    doc.demarcationTime = normalizeTime(input.demarcationTime);

    if (!input.noticeFile) {
      throw validationError('notice PDF file is required');
    }
    doc.noticePdfObjectKey = await uploadCaseFile({
      tehsilId: doc.tehsilId,
      caseId: String(doc._id),
      kind: 'notice',
      file: input.noticeFile,
    });

    // Report due 11:59 PM on the demarcation calendar day.
    doc.reportDueAt = computeReportDueAtFromDemarcation(demarcationDate);

    // Stashed: auto-generate Suchna Patra PDF (restore later if needed)
    // if (isS3Configured()) {
    //   doc.noticePdfObjectKey = await uploadGeneratedCasePdf({
    //     tehsilId: doc.tehsilId,
    //     caseId: String(doc._id),
    //     kind: 'notice',
    //     doc,
    //   });
    // }
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
    if (
      doc.demarcationDate
      && istYmd() < utcYmd(doc.demarcationDate)
    ) {
      throw apiError(
        HttpErrorStatusCode.BAD_REQUEST,
        'INVALID_TRANSITION',
        'Report can only be uploaded on or after the demarcation date',
      );
    }
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
  const userNote = input.note?.trim() || null;
  const autoNote = buildAutoTransitionNote({
    toStage,
    doc,
    assignedStaffLabel,
  });
  const note = userNote ? `${autoNote} · ${userNote}` : autoNote;
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
  const nextTime = normalizeTime(input.demarcationTime);
  if (utcYmd(nextDate) <= utcYmd(doc.filedAt)) {
    throw validationError('demarcationDate must be after filedAt');
  }
  if (doc.demarcationDate) {
    const previousAt = combineUtcDateAndTime(
      doc.demarcationDate,
      doc.demarcationTime ?? '12:00',
    );
    const nextAt = combineUtcDateAndTime(nextDate, nextTime);
    if (nextAt.getTime() <= previousAt.getTime()) {
      throw validationError(
        'reschedule demarcation date/time must be after the current demarcation',
      );
    }
  }

  const previousDate = doc.demarcationDate;
  const previousTime = doc.demarcationTime ?? '12:00';
  const previousNoticeIssueDate = doc.issueDate;
  const previousDue
    = doc.reportDueAt
    ?? (previousDate
      ? computeReportDueAtFromDemarcation(previousDate)
      : null);
  const rescheduleAfterOverdue = computeAlertStatus({
    stage: doc.stage,
    reportDueAt: previousDue,
  }) === 'OVERDUE';

  doc.demarcationDate = nextDate;
  doc.demarcationTime = nextTime;
  doc.issueDate = new Date();
  doc.reportDueAt = computeReportDueAtFromDemarcation(nextDate);
  if (rescheduleAfterOverdue)
    doc.superiorAlert = true;
  doc.stageDueAt = computeStageDueAt({
    stage: doc.stage,
    stageChangedAt: doc.stageChangedAt ?? new Date(),
    demarcationAt: combineUtcDateAndTime(nextDate, nextTime),
    filedAt: doc.filedAt,
    reportDueAt: doc.reportDueAt,
  });

  // Stashed: auto-regenerate reschedule notice PDF (optional restore)
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
      : '')
    + (rescheduleAfterOverdue ? ' [superior alert: after overdue]' : '');
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

/**
 * Draft Suchna Patra from case + form fields. Does not save or advance stage —
 * RI/Patwari download, fill blanks by hand if needed, then upload final notice.
 */
export async function previewNoticePdf(
  user: AuthUser,
  caseId: string,
  input: {
    neighbors?: unknown;
    issueDate?: string | Date | null;
    demarcationDate?: string | Date | null;
    demarcationTime?: string | null;
  },
): Promise<{ buffer: Buffer; filename: string }> {
  const doc = await CaseModel.findById(caseId);
  if (!doc) {
    throw apiError(
      HttpErrorStatusCode.NOT_FOUND,
      'CASE_NOT_FOUND',
      'Case not found',
    );
  }
  assertCaseAccess(user, doc);
  if (
    doc.stage !== 'MEMO_ISSUED'
    && doc.stage !== 'NOTICE_ISSUED'
    && doc.stage !== 'HEARING_SCHEDULED'
  ) {
    throw apiError(
      HttpErrorStatusCode.BAD_REQUEST,
      'INVALID_STAGE',
      'Notice draft can only be generated at memo / notice stage',
    );
  }

  const issueDate = optionalDate(input.issueDate, 'issueDate');
  if (!issueDate)
    throw validationError('issueDate (notice date) is required');
  if (utcYmd(issueDate) < utcYmd(doc.filedAt)) {
    throw validationError(
      'notice date (issueDate) must be on or after the application (filedAt) day',
    );
  }
  const demarcationDate = optionalDate(
    input.demarcationDate,
    'demarcationDate',
  );
  if (!demarcationDate)
    throw validationError('demarcationDate is required');
  if (utcYmd(demarcationDate) < utcYmd(issueDate)) {
    throw validationError(
      'demarcationDate must be on or after the notice (issueDate) day',
    );
  }

  const neighbors = normalizeNeighbors(input.neighbors);
  const draft: CaseDoc = {
    ...doc.toObject(),
    neighbors: neighbors.length > 0 ? neighbors : doc.neighbors ?? [],
    issueDate,
    demarcationDate,
    demarcationTime: normalizeTime(input.demarcationTime),
  };

  const buffer = await buildSuchnaPatraPdf(draft);
  return {
    buffer,
    filename: `suchna-draft-${doc.caseNo}.pdf`,
  };
}

function contentTypeForObjectKey(key: string): string {
  switch (path.extname(key).toLowerCase()) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    default:
      return 'application/pdf';
  }
}

/** Stream a stored case file through the API (avoids browser hitting internal MinIO). */
export async function getCasePdfDownload(
  user: AuthUser,
  caseId: string,
  kind: 'notice' | 'report',
): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
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

  const key
    = kind === 'notice' ? doc.noticePdfObjectKey : doc.reportPdfObjectKey;
  if (!key) {
    throw apiError(
      HttpErrorStatusCode.NOT_FOUND,
      'FILE_NOT_FOUND',
      kind === 'notice' ? 'Notice file not found' : 'Report file not found',
    );
  }

  const buffer = await getObjectBuffer(key);
  const filename = key.split('/').pop() || `${kind}.pdf`;
  return { buffer, filename, contentType: contentTypeForObjectKey(key) };
}

/** Overdue = past guarantee and not in a closed Suchna Patra stage. */
export { overdueCaseMatch } from './case.sla';

export type CaseMetricsFilters = {
  /** Inclusive filedAt start (UTC day). */
  from?: string | null;
  /** Inclusive filedAt end (UTC day). */
  to?: string | null;
  /** Convenience: YYYY-MM → whole calendar month (UTC). */
  month?: string | null;
  tehsilIds?: string[] | null;
};

function metricsDateBounds(filters: CaseMetricsFilters): {
  from: Date | null;
  to: Date | null;
} {
  const month = filters.month?.trim();
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split('-').map(Number);
    const from = new Date(Date.UTC(y!, m! - 1, 1, 0, 0, 0, 0));
    const to = new Date(Date.UTC(y!, m!, 0, 23, 59, 59, 999));
    return { from, to };
  }
  const fromRaw = filters.from?.trim();
  const toRaw = filters.to?.trim();
  const from = fromRaw
    ? new Date(`${fromRaw.slice(0, 10)}T00:00:00.000Z`)
    : null;
  const to = toRaw
    ? new Date(`${toRaw.slice(0, 10)}T23:59:59.999Z`)
    : null;
  if (from && Number.isNaN(from.getTime()))
    throw validationError('from date is invalid');
  if (to && Number.isNaN(to.getTime()))
    throw validationError('to date is invalid');
  if (from && to && from.getTime() > to.getTime())
    throw validationError('from must be on or before to');
  return { from, to };
}

function buildMetricsMatch(
  filters: CaseMetricsFilters,
): Record<string, unknown> {
  const match: Record<string, unknown> = {};
  const { from, to } = metricsDateBounds(filters);
  if (from || to) {
    const filedAt: Record<string, Date> = {};
    if (from)
      filedAt.$gte = from;
    if (to)
      filedAt.$lte = to;
    match.filedAt = filedAt;
  }
  const tehsilIds = (filters.tehsilIds ?? [])
    .map(id => id.trim())
    .filter(Boolean);
  if (tehsilIds.length > 0)
    match.tehsilId = { $in: tehsilIds };
  return match;
}

export async function getCaseMetrics(
  user: AuthUser,
  filters: CaseMetricsFilters = {},
) {
  if (user.role !== 'admin') {
    throw apiError(
      HttpErrorStatusCode.FORBIDDEN,
      'ACCESS_DENIED',
      'Admin only',
    );
  }

  const now = new Date();
  const closedStages: CaseStage[] = ['ORDER_ISSUED', 'OBJECTION_CLOSED'];
  const reportWaitStages = [
    'HEARING_SCHEDULED',
    'DEMARCATION_WINDOW_OPEN',
    'DEMARCATION_DONE',
  ];
  const baseMatch = buildMetricsMatch(filters);
  const { from: rangeFrom, to: rangeTo } = metricsDateBounds(filters);

  const reportOverdueExpr = {
    $and: [
      { $in: ['$stage', reportWaitStages] },
      { $lte: ['$reportDueAt', now] },
      {
        $or: [
          { $eq: ['$reportPdfObjectKey', null] },
          { $not: ['$reportPdfObjectKey'] },
        ],
      },
    ],
  };
  const overdueExpr = {
    $and: [
      { $lt: ['$guaranteeDueAt', now] },
      { $not: [{ $in: ['$stage', closedStages] }] },
    ],
  };

  const [
    totalsRow,
    byStageRows,
    byTehsilRows,
    byStaffRows,
  ] = await Promise.all([
    CaseModel.aggregate<{
      total: number;
      closed: number;
      overdue: number;
      reportOverdue: number;
      superiorAlert: number;
      openAgeSumMs: number;
      openCount: number;
      closedAgeSumMs: number;
      closedAgeCount: number;
    }>([
      { $match: baseMatch },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          closed: {
            $sum: { $cond: [{ $in: ['$stage', closedStages] }, 1, 0] },
          },
          overdue: {
            $sum: { $cond: [overdueExpr, 1, 0] },
          },
          reportOverdue: {
            $sum: { $cond: [reportOverdueExpr, 1, 0] },
          },
          superiorAlert: {
            $sum: { $cond: [{ $eq: ['$superiorAlert', true] }, 1, 0] },
          },
          openAgeSumMs: {
            $sum: {
              $cond: [
                { $not: [{ $in: ['$stage', closedStages] }] },
                { $subtract: [now, '$filedAt'] },
                0,
              ],
            },
          },
          openCount: {
            $sum: {
              $cond: [
                { $not: [{ $in: ['$stage', closedStages] }] },
                1,
                0,
              ],
            },
          },
          closedAgeSumMs: {
            $sum: {
              $cond: [
                { $in: ['$stage', closedStages] },
                {
                  $subtract: [
                    { $ifNull: ['$stageChangedAt', '$updatedAt'] },
                    '$filedAt',
                  ],
                },
                0,
              ],
            },
          },
          closedAgeCount: {
            $sum: { $cond: [{ $in: ['$stage', closedStages] }, 1, 0] },
          },
        },
      },
    ]),
    CaseModel.aggregate<{ _id: CaseStage; count: number }>([
      { $match: baseMatch },
      { $group: { _id: '$stage', count: { $sum: 1 } } },
    ]),
    CaseModel.aggregate<{
      _id: string;
      total: number;
      overdue: number;
      reportOverdue: number;
      closed: number;
      superiorAlert: number;
    }>([
      { $match: baseMatch },
      {
        $group: {
          _id: '$tehsilId',
          total: { $sum: 1 },
          overdue: { $sum: { $cond: [overdueExpr, 1, 0] } },
          reportOverdue: { $sum: { $cond: [reportOverdueExpr, 1, 0] } },
          closed: {
            $sum: { $cond: [{ $in: ['$stage', closedStages] }, 1, 0] },
          },
          superiorAlert: {
            $sum: { $cond: [{ $eq: ['$superiorAlert', true] }, 1, 0] },
          },
        },
      },
    ]),
    CaseModel.aggregate<{
      _id: { staffId: string; role: string };
      allotted: number;
      open: number;
      closed: number;
      overdue: number;
      reportOverdue: number;
      superiorAlert: number;
      openAgeSumMs: number;
      submitted: number;
      memo: number;
      notice: number;
      report: number;
      order: number;
      objection: number;
    }>([
      { $match: baseMatch },
      {
        $addFields: {
          staffId: { $ifNull: ['$assignedRiId', '$assignedPatwariId'] },
          staffRole: {
            $cond: [
              { $ifNull: ['$assignedRiId', false] },
              'ri',
              {
                $cond: [
                  { $ifNull: ['$assignedPatwariId', false] },
                  'patwari',
                  null,
                ],
              },
            ],
          },
        },
      },
      { $match: { staffId: { $ne: null }, staffRole: { $ne: null } } },
      {
        $group: {
          _id: { staffId: '$staffId', role: '$staffRole' },
          allotted: { $sum: 1 },
          open: {
            $sum: {
              $cond: [
                { $not: [{ $in: ['$stage', closedStages] }] },
                1,
                0,
              ],
            },
          },
          closed: {
            $sum: { $cond: [{ $in: ['$stage', closedStages] }, 1, 0] },
          },
          overdue: { $sum: { $cond: [overdueExpr, 1, 0] } },
          reportOverdue: { $sum: { $cond: [reportOverdueExpr, 1, 0] } },
          superiorAlert: {
            $sum: { $cond: [{ $eq: ['$superiorAlert', true] }, 1, 0] },
          },
          openAgeSumMs: {
            $sum: {
              $cond: [
                { $not: [{ $in: ['$stage', closedStages] }] },
                { $subtract: [now, '$filedAt'] },
                0,
              ],
            },
          },
          submitted: {
            $sum: { $cond: [{ $eq: ['$stage', 'SUBMITTED'] }, 1, 0] },
          },
          memo: {
            $sum: { $cond: [{ $eq: ['$stage', 'MEMO_ISSUED'] }, 1, 0] },
          },
          notice: {
            $sum: {
              $cond: [{ $eq: ['$stage', 'HEARING_SCHEDULED'] }, 1, 0],
            },
          },
          report: {
            $sum: {
              $cond: [{ $eq: ['$stage', 'REPORT_SUBMITTED'] }, 1, 0],
            },
          },
          order: {
            $sum: { $cond: [{ $eq: ['$stage', 'ORDER_ISSUED'] }, 1, 0] },
          },
          objection: {
            $sum: {
              $cond: [{ $eq: ['$stage', 'OBJECTION_CLOSED'] }, 1, 0],
            },
          },
        },
      },
    ]),
  ]);

  const totals = totalsRow[0] ?? {
    total: 0,
    closed: 0,
    overdue: 0,
    reportOverdue: 0,
    superiorAlert: 0,
    openAgeSumMs: 0,
    openCount: 0,
    closedAgeSumMs: 0,
    closedAgeCount: 0,
  };

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
      superiorAlert: row.superiorAlert,
    }))
    .sort((a, b) => a.tehsilName.localeCompare(b.tehsilName));

  const staffIds = byStaffRows.map(row => String(row._id.staffId));
  const staffDocs = staffIds.length > 0
    ? await Promise.all(staffIds.map(id => findUserById(id)))
    : [];
  const staffNameById = new Map<string, string>();
  for (let i = 0; i < staffIds.length; i++) {
    const doc = staffDocs[i] as { name?: string; email?: string } | null;
    staffNameById.set(
      staffIds[i]!,
      doc?.name?.trim() || doc?.email || staffIds[i]!,
    );
  }

  const msPerDay = 86_400_000;
  const byStaff = byStaffRows
    .map((row) => {
      const allotted = row.allotted;
      const closed = row.closed;
      const open = row.open;
      return {
        staffId: String(row._id.staffId),
        name: staffNameById.get(String(row._id.staffId)) ?? String(row._id.staffId),
        role: row._id.role as 'ri' | 'patwari',
        allotted,
        open,
        closed,
        overdue: row.overdue,
        reportOverdue: row.reportOverdue,
        superiorAlert: row.superiorAlert,
        closureRate: allotted > 0 ? Math.round((closed / allotted) * 100) : 0,
        avgOpenAgeDays: open > 0
          ? Math.round((row.openAgeSumMs / open) / msPerDay)
          : null,
        byStage: [
          { stage: 'SUBMITTED', count: row.submitted },
          { stage: 'MEMO_ISSUED', count: row.memo },
          { stage: 'HEARING_SCHEDULED', count: row.notice },
          { stage: 'REPORT_SUBMITTED', count: row.report },
          { stage: 'ORDER_ISSUED', count: row.order },
          { stage: 'OBJECTION_CLOSED', count: row.objection },
        ],
      };
    })
    .sort((a, b) => b.allotted - a.allotted || a.name.localeCompare(b.name));

  const open = Math.max(0, totals.total - totals.closed);
  const avgOpenAgeDays = totals.openCount > 0
    ? Math.round((totals.openAgeSumMs / totals.openCount) / msPerDay)
    : null;
  const avgCloseDays = totals.closedAgeCount > 0
    ? Math.round((totals.closedAgeSumMs / totals.closedAgeCount) / msPerDay)
    : null;

  const eligibleStaff = byStaff.filter(s => s.allotted >= 3);
  const topCloser = eligibleStaff.length > 0
    ? eligibleStaff.reduce((a, b) => (b.closureRate > a.closureRate ? b : a))
    : byStaff[0] ?? null;
  const heaviestLoad = byStaff[0] ?? null;
  const allotments = byStaff.map(s => s.allotted);
  const loadImbalance = allotments.length >= 2
    ? Math.round(
      (Math.max(...allotments) / Math.max(1, Math.min(...allotments))) * 10,
    ) / 10
    : 1;

  return {
    total: totals.total,
    closed: totals.closed,
    overdue: totals.overdue,
    reportOverdue: totals.reportOverdue,
    superiorAlert: totals.superiorAlert,
    byStage,
    byTehsil,
    byStaff,
    analysis: {
      open,
      closureRate: totals.total > 0
        ? Math.round((totals.closed / totals.total) * 100)
        : 0,
      overdueRate: totals.total > 0
        ? Math.round((totals.overdue / totals.total) * 100)
        : 0,
      reportOverdueRate: totals.total > 0
        ? Math.round((totals.reportOverdue / totals.total) * 100)
        : 0,
      avgOpenAgeDays,
      avgCloseDays,
      topCloser: topCloser
        ? {
            staffId: topCloser.staffId,
            name: topCloser.name,
            role: topCloser.role,
            closureRate: topCloser.closureRate,
            allotted: topCloser.allotted,
          }
        : null,
      heaviestLoad: heaviestLoad
        ? {
            staffId: heaviestLoad.staffId,
            name: heaviestLoad.name,
            role: heaviestLoad.role,
            allotted: heaviestLoad.allotted,
            open: heaviestLoad.open,
          }
        : null,
      loadImbalance,
    },
    filters: {
      from: rangeFrom?.toISOString().slice(0, 10) ?? null,
      to: rangeTo?.toISOString().slice(0, 10) ?? null,
      month: filters.month?.trim() || null,
      tehsilIds: (filters.tehsilIds ?? []).filter(Boolean),
    },
    generatedAt: now.toISOString(),
  };
}
