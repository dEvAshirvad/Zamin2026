import type * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * The `sla-*` variants are reserved for the Lok Seva Guarantee clock and must
 * never be used decoratively. Stamp-shaped (square), not pills.
 */
const badgeVariants = cva(
  'inline-flex shrink-0 items-center gap-1 whitespace-nowrap border font-medium uppercase tracking-wider',
  {
    variants: {
      variant: {
        neutral: 'border-border bg-muted text-muted-foreground',
        outline: 'border-border bg-transparent text-foreground',
        primary: 'border-transparent bg-primary-wash text-ring',
        'sla-ontrack':
          'border-transparent bg-sla-ontrack-bg text-sla-ontrack',
        'sla-duesoon':
          'border-transparent bg-sla-duesoon-bg text-sla-duesoon',
        'sla-overdue':
          'border-transparent bg-sla-overdue-bg text-sla-overdue',
      },
      size: {
        sm: 'rounded-none px-2 py-0.5 text-[10px] leading-4',
        md: 'rounded-none px-2.5 py-1 text-[11px] leading-4',
      },
    },
    defaultVariants: { variant: 'neutral', size: 'sm' },
  },
);

function Badge({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  );
}

/** Stage chips are always neutral — the pipeline is structure, not status. */
function StageChip({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="stage-chip"
      className={cn(
        'inline-flex shrink-0 items-center whitespace-nowrap rounded-none border border-border bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-secondary-foreground',
        className,
      )}
      {...props}
    />
  );
}

export { Badge, StageChip, badgeVariants };
