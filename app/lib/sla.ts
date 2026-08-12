import type { CaseListItem } from '@/lib/cases';
import type { Locale, MessageKey } from '@/lib/i18n';

/**
 * The API returns three states (`on_track | overdue | closed`). Staff need a
 * fourth: a case that is *about to* go late. `duesoon` is derived client-side
 * from `daysToGuarantee`. See design.md §4.2.
 */
export type SlaTier = 'closed' | 'overdue' | 'duesoon' | 'ontrack';

export const DUE_SOON_DAYS = 7;
export const GUARANTEE_DAYS = 30;

export function slaTier(
  item: Pick<CaseListItem, 'slaStatus' | 'daysToGuarantee'>,
): SlaTier | null {
  if (item.slaStatus === 'closed') return 'closed';
  if (item.slaStatus === 'overdue') return 'overdue';
  if (item.slaStatus === 'on_track') {
    return typeof item.daysToGuarantee === 'number'
      && item.daysToGuarantee <= DUE_SOON_DAYS
      ? 'duesoon'
      : 'ontrack';
  }
  return null;
}

export const SLA_BADGE_VARIANT: Record<
  SlaTier,
  'neutral' | 'sla-ontrack' | 'sla-duesoon' | 'sla-overdue'
> = {
  closed: 'neutral',
  ontrack: 'sla-ontrack',
  duesoon: 'sla-duesoon',
  overdue: 'sla-overdue',
};

export const SLA_LABEL_KEY: Record<SlaTier, MessageKey> = {
  closed: 'closed',
  ontrack: 'onTrack',
  duesoon: 'dueSoon',
  overdue: 'overdue',
};

/** Foreground colour class per tier, for the meter bar and day count. */
export const SLA_FG: Record<SlaTier, string> = {
  closed: 'text-muted-foreground',
  ontrack: 'text-sla-ontrack',
  duesoon: 'text-sla-duesoon',
  overdue: 'text-sla-overdue',
};

export const SLA_BAR: Record<SlaTier, string> = {
  closed: 'bg-muted-foreground/40',
  ontrack: 'bg-sla-ontrack',
  duesoon: 'bg-sla-duesoon',
  overdue: 'bg-sla-overdue',
};

/** 0–1, how much of the 30-day window has burned. */
export function guaranteeProgress(
  filedAt: string,
  guaranteeDueAt: string,
): number {
  const start = new Date(filedAt).getTime();
  const end = new Date(guaranteeDueAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  const pct = (Date.now() - start) / (end - start);
  return Math.min(1, Math.max(0, pct));
}

/** "18 दिन शेष" / "4 दिन अतिदेय" — plural-aware. */
export function daysLabel(
  t: (key: MessageKey, vars?: Record<string, string | number>) => string,
  days: number | null | undefined,
): string {
  if (days == null) return '—';
  if (days > 1) return t('daysLeft', { n: days });
  if (days === 1) return t('dayLeft');
  if (days === 0) return t('dueToday');
  if (days === -1) return t('dayOverdue');
  return t('daysOverdue', { n: Math.abs(days) });
}

/** Locale is threaded through for callers that format dates alongside. */
export type { Locale };
