import type { PlatformRole } from '@/lib/auth/roles';

import type { CaseStage } from './case.helpers';

/** Allowed edges: from → to[] */
export const TRANSITION_GRAPH: Record<CaseStage, CaseStage[]> = {
  SUBMITTED: ['MEMO_ISSUED'],
  MEMO_ISSUED: ['HEARING_SCHEDULED'],
  NOTICE_ISSUED: ['HEARING_SCHEDULED'],
  HEARING_SCHEDULED: ['OBJECTIONS_WINDOW', 'DEMARCATION_DONE'],
  OBJECTIONS_WINDOW: ['DEMARCATION_DONE'],
  DEMARCATION_DONE: ['ORDER_ISSUED'],
  ORDER_ISSUED: ['ECOURT_UPLOADED'],
  ECOURT_UPLOADED: [],
};

/** Who may perform a transition to `to` (from must already be valid in graph). */
export function roleForTransition(to: CaseStage): PlatformRole | 'admin' | null {
  switch (to) {
    case 'MEMO_ISSUED':
    case 'ORDER_ISSUED':
      return 'tehsildar';
    case 'ECOURT_UPLOADED':
      return 'tehsildar'; // admin allowed via canTransition special-case
    case 'HEARING_SCHEDULED':
    case 'OBJECTIONS_WINDOW':
    case 'DEMARCATION_DONE':
    case 'NOTICE_ISSUED':
      return 'ri';
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
  if (opts.to === 'ECOURT_UPLOADED') {
    return opts.role === 'tehsildar' || opts.role === 'admin';
  }
  const required = roleForTransition(opts.to);
  return required != null && opts.role === required;
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
