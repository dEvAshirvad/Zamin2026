'use client';

import type * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * A pressable filter chip. Square stamp, not a pill.
 */
export function ToggleChip({
  pressed,
  onPressedChange,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<'button'>, 'onChange'> & {
  pressed: boolean;
  onPressedChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-none border px-3 py-1 text-[11px] font-medium uppercase tracking-wider transition-colors',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50',
        pressed
          ? 'border-transparent bg-sla-overdue-bg text-sla-overdue'
          : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          'size-1.5',
          pressed ? 'bg-sla-overdue' : 'bg-border',
        )}
      />
      {children}
    </button>
  );
}
