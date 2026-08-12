import type * as React from 'react';

import { cn } from '@/lib/utils';

/** Flat pulse only — square skeleton. */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('animate-pulse rounded-xs bg-muted', className)}
      {...props}
    />
  );
}

function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full overflow-hidden rounded-none border border-border bg-card">
      <div className="border-b-2 border-foreground bg-muted px-3 py-2.5">
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-3 px-3 py-3">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton
                key={c}
                className="h-4"
                style={{ width: `${100 / cols}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-none border border-dashed border-border bg-card/50 px-6 py-12 text-center">
      {icon ? <div className="text-muted-foreground">{icon}</div> : null}
      <p className="font-medium text-sm text-foreground">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

function ErrorNote({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="rounded-none border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
    >
      {children}
    </p>
  );
}

export { Skeleton, TableSkeleton, EmptyState, ErrorNote };
