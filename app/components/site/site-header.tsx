import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { SiteBrand } from './site-brand';
import { SiteContainer } from './site-container';
import type { SiteRuleStyle } from './types';

export function SiteHeader({
  rule = 'single',
  meta,
  nav,
  brandCompact = false,
  className,
}: {
  rule?: SiteRuleStyle;
  meta?: ReactNode;
  nav?: ReactNode;
  brandCompact?: boolean;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'bg-muted pt-6',
        rule === 'double'
          ? 'border-b-[3px] border-double border-border'
          : 'border-b border-border',
        className,
      )}
    >
      <SiteContainer>
        <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:gap-4">
          <SiteBrand compact={brandCompact} className="flex-1" />
          {meta ? (
            <div className="shrink-0 text-left text-[0.7rem] leading-relaxed text-muted-foreground sm:text-right">
              {meta}
            </div>
          ) : null}
        </div>
        {nav}
      </SiteContainer>
    </header>
  );
}
