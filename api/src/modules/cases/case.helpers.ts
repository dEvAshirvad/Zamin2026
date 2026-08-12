export const KHASRA_FEE_RUPEES = 50;

export const CASE_STAGES = [
  'SUBMITTED',
  'MEMO_ISSUED',
  'NOTICE_ISSUED',
  'HEARING_SCHEDULED',
  'OBJECTIONS_WINDOW',
  'DEMARCATION_DONE',
  'ORDER_ISSUED',
  'ECOURT_UPLOADED',
] as const;

export type CaseStage = (typeof CASE_STAGES)[number];

/** Stages that still count as "open" for RI workload auto-assign. */
export const OPEN_CASE_STAGES: CaseStage[] = [
  'SUBMITTED',
  'MEMO_ISSUED',
  'NOTICE_ISSUED',
  'HEARING_SCHEDULED',
  'OBJECTIONS_WINDOW',
  'DEMARCATION_DONE',
];

/**
 * Stages where the assigned RI still has work (notice → demarcation).
 * After DEMARCATION_DONE, tehsildar owns the case — RI must not see it.
 */
export const RI_ACTIVE_STAGES: CaseStage[] = [
  'MEMO_ISSUED',
  'NOTICE_ISSUED',
  'HEARING_SCHEDULED',
  'OBJECTIONS_WINDOW',
];

/** Assigned RI + still in RI pipeline — list/detail visibility. */
export function isCaseVisibleToRi(opts: {
  assignedRiId: string | null | undefined;
  riUserId: string;
  stage: string;
}): boolean {
  return (
    opts.assignedRiId === opts.riUserId
    && (RI_ACTIVE_STAGES as readonly string[]).includes(opts.stage)
  );
}

/** Fee = ₹50 × khasra count. */
export function computeFeeAmount(khasraCount: number): number {
  if (!Number.isInteger(khasraCount) || khasraCount < 0) {
    throw new Error('khasraCount must be a non-negative integer');
  }
  return KHASRA_FEE_RUPEES * khasraCount;
}

/** Format case number: SEONI-2026-0001 */
export function formatCaseNo(slug: string, year: number, seq: number): string {
  const code = slug.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '') || 'TEHSIL';
  const padded = String(seq).padStart(4, '0');
  return `${code}-${year}-${padded}`;
}

/** Lok Seva Guarantee: filedAt + 30 days. */
export function computeGuaranteeDueAt(filedAt: Date): Date {
  const due = new Date(filedAt);
  due.setUTCDate(due.getUTCDate() + 30);
  return due;
}

export function normalizeKhasras(raw: unknown): string[] {
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? raw.split(/[\n,]/)
      : [];
  const cleaned = list
    .map(v => String(v ?? '').trim())
    .filter(Boolean);
  return [...new Set(cleaned)];
}

export function isCaseStage(value: string): value is CaseStage {
  return (CASE_STAGES as readonly string[]).includes(value);
}
