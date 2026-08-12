import type * as React from 'react';

import { cn } from '@/lib/utils';

/** Single metric tile. `tone` only ever reflects the SLA scale. */
export function Stat({
  label,
  value,
  hint,
  tone = 'default',
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: 'default' | 'overdue' | 'ontrack';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-none border border-border bg-card px-4 py-3',
        tone === 'overdue' && 'border-sla-overdue/40 bg-sla-overdue-bg',
        className,
      )}
    >
      <p className="text-micro text-muted-foreground">{label}</p>
      <p
        className={cn(
          'tnum mt-1 font-semibold text-2xl leading-8 tracking-tight',
          tone === 'overdue' && 'text-sla-overdue',
          tone === 'ontrack' && 'text-sla-ontrack',
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
