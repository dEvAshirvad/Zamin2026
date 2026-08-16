export const KHASRA_FEE_RUPEES = 50;

export const CASE_STAGES = [
  'SUBMITTED',
  'MEMO_ISSUED',
  'NOTICE_ISSUED',
  'HEARING_SCHEDULED',
  'OBJECTION_CLOSED',
  'DEMARCATION_WINDOW_OPEN',
  'DEMARCATION_DONE',
  'REPORT_SUBMITTED',
  'ORDER_ISSUED',
] as const;

export type CaseStage = (typeof CASE_STAGES)[number];

/** Stages that still count as "open" for RI workload auto-assign. */
export const OPEN_CASE_STAGES: CaseStage[] = [
  'SUBMITTED',
  'MEMO_ISSUED',
  'NOTICE_ISSUED',
  'HEARING_SCHEDULED',
  'DEMARCATION_WINDOW_OPEN',
  'DEMARCATION_DONE',
];

/**
 * Stages where assigned RI/Patwari still has pipeline work.
 * List inbox uses this set.
 */
export const RI_ACTIVE_STAGES: CaseStage[] = [
  'MEMO_ISSUED',
  'NOTICE_ISSUED',
  'HEARING_SCHEDULED',
  'DEMARCATION_WINDOW_OPEN',
  'DEMARCATION_DONE',
];

/** Stages the assigned RI/Patwari may open (active + after handoff). */
export const RI_VIEWABLE_STAGES: CaseStage[] = [
  ...RI_ACTIVE_STAGES,
  'OBJECTION_CLOSED',
  'REPORT_SUBMITTED',
  'ORDER_ISSUED',
];

export type KhasraRow = { khasraNumber: string; rakba: number };
export type NeighborRow = { ownerName: string; address: string };
export type GuardianType = 'पिता' | 'पति';
export type AlertStatus = 'none' | 'OVERDUE';

/** Assigned RI — detail visibility (active work + completed handoff). */
export function isCaseVisibleToRi(opts: {
  assignedRiId: string | null | undefined;
  riUserId: string;
  stage: string;
}): boolean {
  return (
    opts.assignedRiId === opts.riUserId
    && (RI_VIEWABLE_STAGES as readonly string[]).includes(opts.stage)
  );
}

/** Assigned Patwari — same visibility rules as RI. */
export function isCaseVisibleToPatwari(opts: {
  assignedPatwariId: string | null | undefined;
  patwariUserId: string;
  stage: string;
}): boolean {
  return (
    opts.assignedPatwariId === opts.patwariUserId
    && (RI_VIEWABLE_STAGES as readonly string[]).includes(opts.stage)
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

/** Report due 12 hours after demarcation done. */
export function computeReportDueAt(demarcationDoneAt: Date): Date {
  return new Date(demarcationDoneAt.getTime() + 12 * 60 * 60 * 1000);
}

export function utcYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function sameUtcDay(a: Date, b: Date): boolean {
  return utcYmd(a) === utcYmd(b);
}

export function normalizeKhasraRows(raw: unknown): KhasraRow[] {
  if (!Array.isArray(raw))
    return [];
  const rows: KhasraRow[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item === 'string') {
      const khasraNumber = item.trim();
      if (!khasraNumber || seen.has(khasraNumber))
        continue;
      seen.add(khasraNumber);
      rows.push({ khasraNumber, rakba: 0 });
      continue;
    }
    if (!item || typeof item !== 'object')
      continue;
    const row = item as Record<string, unknown>;
    const khasraNumber = String(row.khasraNumber ?? row.number ?? '').trim();
    const rakba = Number(row.rakba);
    if (!khasraNumber || seen.has(khasraNumber) || !Number.isFinite(rakba) || rakba <= 0)
      continue;
    seen.add(khasraNumber);
    rows.push({ khasraNumber, rakba });
  }
  return rows;
}

export function normalizeNeighbors(raw: unknown): NeighborRow[] {
  if (!Array.isArray(raw))
    return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object')
        return null;
      const row = item as Record<string, unknown>;
      const ownerName = String(row.ownerName ?? '').trim();
      const address = String(row.address ?? '').trim();
      if (!ownerName || !address)
        return null;
      return { ownerName, address };
    })
    .filter((n): n is NeighborRow => n != null);
}

export function sumRakba(rows: KhasraRow[]): number {
  return rows.reduce((s, r) => s + r.rakba, 0);
}

export function isCaseStage(value: string): value is CaseStage {
  return (CASE_STAGES as readonly string[]).includes(value);
}

export function computeAlertStatus(opts: {
  stage: string;
  reportDueAt?: Date | null;
  now?: Date;
}): AlertStatus {
  if (opts.stage !== 'DEMARCATION_DONE' || !opts.reportDueAt)
    return 'none';
  const now = opts.now ?? new Date();
  return now.getTime() > opts.reportDueAt.getTime() ? 'OVERDUE' : 'none';
}
