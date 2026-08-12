'use client';

import { Badge } from '@/components/ui/badge';
import { useLocale } from '@/hooks/use-locale';
import type { CaseListItem } from '@/lib/cases';
import { SLA_BADGE_VARIANT, SLA_LABEL_KEY, slaTier } from '@/lib/sla';

/**
 * The only coloured element in a case row. If it has colour, it is telling you
 * about the guarantee clock — see design.md §3.
 */
export function SlaBadge({
  item,
  size = 'sm',
}: {
  item: Pick<CaseListItem, 'slaStatus' | 'daysToGuarantee'>;
  size?: 'sm' | 'md';
}) {
  const { t } = useLocale();
  const tier = slaTier(item);
  if (!tier) return null;

  return (
    <Badge variant={SLA_BADGE_VARIANT[tier]} size={size}>
      <span
        aria-hidden
        className="size-1.5 rounded-none bg-current opacity-70"
      />
      {t(SLA_LABEL_KEY[tier])}
    </Badge>
  );
}
