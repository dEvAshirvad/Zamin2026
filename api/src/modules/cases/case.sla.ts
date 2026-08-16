import type { CaseStage } from './case.helpers';

export type SlaStatus = 'closed' | 'overdue' | 'on_track';
export type StageSlaStatus = 'none' | 'on_track' | 'overdue';

function addUtcDays(from: Date, days: number): Date {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** Soft stage due when entering a stage (display only; does not block). */
export function computeStageDueAt(opts: {
  stage: CaseStage;
  stageChangedAt: Date;
  demarcationAt?: Date | null;
  filedAt?: Date | null;
  reportDueAt?: Date | null;
}): Date | null {
  const { stage, stageChangedAt, demarcationAt, filedAt, reportDueAt } = opts;
  switch (stage) {
    case 'SUBMITTED':
      return addUtcDays(filedAt ?? stageChangedAt, 5);
    case 'MEMO_ISSUED':
      return addUtcDays(stageChangedAt, 15);
    case 'NOTICE_ISSUED':
      return addUtcDays(stageChangedAt, 7);
    case 'HEARING_SCHEDULED':
      return demarcationAt
        ? new Date(demarcationAt)
        : addUtcDays(stageChangedAt, 7);
    case 'DEMARCATION_WINDOW_OPEN':
      return addUtcDays(stageChangedAt, 1);
    case 'DEMARCATION_DONE':
      return reportDueAt ? new Date(reportDueAt) : addUtcDays(stageChangedAt, 0);
    case 'REPORT_SUBMITTED':
      return addUtcDays(stageChangedAt, 7);
    case 'OBJECTION_CLOSED':
    case 'ORDER_ISSUED':
      return null;
    default:
      return null;
  }
}

/** Whole-day delta: positive = days left, negative = days overdue. */
export function daysToGuarantee(guaranteeDueAt: Date, now: Date = new Date()): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const dueUtc = Date.UTC(
    guaranteeDueAt.getUTCFullYear(),
    guaranteeDueAt.getUTCMonth(),
    guaranteeDueAt.getUTCDate(),
  );
  const nowUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  return Math.round((dueUtc - nowUtc) / msPerDay);
}

export function computeSlaStatus(opts: {
  stage: CaseStage;
  guaranteeDueAt: Date;
  now?: Date;
}): SlaStatus {
  if (opts.stage === 'ORDER_ISSUED' || opts.stage === 'OBJECTION_CLOSED') {
    return 'closed';
  }
  const days = daysToGuarantee(opts.guaranteeDueAt, opts.now ?? new Date());
  return days < 0 ? 'overdue' : 'on_track';
}

export function computeStageSlaStatus(opts: {
  stageDueAt: Date | null | undefined;
  now?: Date;
}): StageSlaStatus {
  if (!opts.stageDueAt) {
    return 'none';
  }
  const now = opts.now ?? new Date();
  return now.getTime() > opts.stageDueAt.getTime() ? 'overdue' : 'on_track';
}

export function buildSlaFields(opts: {
  stage: CaseStage;
  guaranteeDueAt: Date;
  stageDueAt?: Date | null;
  now?: Date;
}) {
  const now = opts.now ?? new Date();
  return {
    slaStatus: computeSlaStatus({
      stage: opts.stage,
      guaranteeDueAt: opts.guaranteeDueAt,
      now,
    }),
    daysToGuarantee: daysToGuarantee(opts.guaranteeDueAt, now),
    stageSlaStatus: computeStageSlaStatus({
      stageDueAt: opts.stageDueAt,
      now,
    }),
  };
}

/** Mongo match for overall Lok Seva overdue (open past guarantee). */
export function overdueCaseMatch(now: Date = new Date()) {
  return {
    guaranteeDueAt: { $lt: now },
    stage: { $nin: ['ORDER_ISSUED', 'OBJECTION_CLOSED'] as const },
  };
}
