import { cn } from '@/lib/utils';

import type { SiteRuleStyle } from './types';

export function SiteRule({
  variant = 'single',
  className,
}: {
  variant?: SiteRuleStyle;
  className?: string;
}) {
  return (
    <hr
      className={cn(
        'my-8 border-0 border-border',
        variant === 'double'
          ? 'border-t-[3px] border-double'
          : 'border-t border-solid',
        className,
      )}
    />
  );
}
