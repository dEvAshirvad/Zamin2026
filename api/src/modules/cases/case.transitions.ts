import type { PlatformRole } from '@/lib/auth/roles';

import type { CaseStage } from './case.helpers';

/** Allowed edges: from → to[] */
export const TRANSITION_GRAPH: Record<CaseStage, CaseStage[]> = {
  SUBMITTED: ['MEMO_ISSUED'],
  // Skip NOTICE_ISSUED — demarcation date already set at intake; notice PDF
  // is generated when confirming HEARING_SCHEDULED.
  MEMO_ISSUED: ['HEARING_SCHEDULED'],
  // Legacy drain for cases already on NOTICE_ISSUED
  NOTICE_ISSUED: ['HEARING_SCHEDULED'],
  HEARING_SCHEDULED: ['OBJECTION_CLOSED', 'REPORT_SUBMITTED'],
  OBJECTION_CLOSED: [],
  // Legacy drain for cases already mid-demarcation
  DEMARCATION_WINDOW_OPEN: ['DEMARCATION_DONE', 'REPORT_SUBMITTED'],
  DEMARCATION_DONE: ['REPORT_SUBMITTED'],
  REPORT_SUBMITTED: ['ORDER_ISSUED'],
  ORDER_ISSUED: [],
};

/** Who may perform a transition to `to` (from must already be valid in graph). */
export function roleForTransition(to: CaseStage): PlatformRole | null {
  switch (to) {
    case 'MEMO_ISSUED':
    case 'ORDER_ISSUED':
      return 'tehsildar';
    case 'NOTICE_ISSUED':
    case 'HEARING_SCHEDULED':
    case 'OBJECTION_CLOSED':
    case 'DEMARCATION_WINDOW_OPEN':
    case 'DEMARCATION_DONE':
    case 'REPORT_SUBMITTED':
      return 'ri'; // patwari allowed via canTransition mirror
    default:
      return null;
  }
}

export function canTransition(opts: {
  from: CaseStage;
  to: CaseStage;
  role: PlatformRole;
}): boolean {
  const allowed = TRANSITION_GRAPH[opts.from] ?? [];
  if (!allowed.includes(opts.to)) {
    return false;
  }
  const required = roleForTransition(opts.to);
  if (required === 'tehsildar') {
    return opts.role === 'tehsildar';
  }
  if (required === 'ri') {
    return opts.role === 'ri' || opts.role === 'patwari';
  }
  return false;
}

export function allowedTargets(from: CaseStage, role: PlatformRole): CaseStage[] {
  return (TRANSITION_GRAPH[from] ?? []).filter(to =>
    canTransition({ from, to, role }),
  );
}

/**
 * Pick RI with fewest open cases. Ties → first by id (stable).
 * Pure: caller supplies counts.
 */
export function pickLeastLoadedRi(
  candidates: Array<{ id: string; openCount: number }>,
): string | null {
  if (candidates.length === 0) {
    return null;
  }
  const sorted = [...candidates].sort((a, b) => {
    if (a.openCount !== b.openCount) {
      return a.openCount - b.openCount;
    }
    return a.id.localeCompare(b.id);
  });
  return sorted[0]!.id;
}
