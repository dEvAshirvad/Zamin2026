'use client';

import { useLocale } from '@/hooks/use-locale';
import type { CaseDetail } from '@/lib/cases';
import { formatDate } from '@/lib/i18n';
import { SLA_BAR, SLA_FG, daysLabel, guaranteeProgress, slaTier } from '@/lib/sla';
import { cn } from '@/lib/utils';

/**
 * The 30-day Lok Seva Guarantee, as a countdown rather than a definition-list
 * row. This is the legally binding part of the product — see design.md §7.2.
 */
export function SlaMeter({ detail }: { detail: CaseDetail }) {
  const { locale, t } = useLocale();
  const tier = slaTier(detail);
  if (!tier) return null;

  const pct = tier === 'closed'
    ? 1
    : guaranteeProgress(detail.filedAt, detail.guaranteeDueAt);

  return (
    <div
      className={cn(
        'rounded-none border px-4 py-3',
        tier === 'overdue'
          ? 'border-sla-overdue/40 bg-sla-overdue-bg'
          : 'border-border bg-card',
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-micro text-muted-foreground">
          {t('guaranteeTitle')}
        </p>
        <p className="text-xs text-muted-foreground">
          {t('guaranteeDue')} · {formatDate(locale, detail.guaranteeDueAt)}
        </p>
      </div>

      <p
        className={cn(
          'tnum mt-1 font-semibold text-xl leading-7 tracking-tight',
          SLA_FG[tier],
        )}
      >
        {tier === 'closed'
          ? t('closed')
          : daysLabel(t, detail.daysToGuarantee)}
      </p>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct * 100)}
        aria-label={t('guaranteeTitle')}
        className="mt-2.5 h-1.5 w-full overflow-hidden rounded-none bg-border"
      >
        <div
          className={cn('h-full rounded-none transition-[width]', SLA_BAR[tier])}
          style={{ width: `${Math.round(pct * 100)}%` }}
        />
      </div>
    </div>
  );
}
