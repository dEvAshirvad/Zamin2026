import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function SiteSectionHeader({
  title,
  action,
  className,
}: {
  title: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mb-2 flex items-baseline justify-between gap-4',
        className,
      )}
    >
      <h2 className="m-0 font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
        {title}
      </h2>
      {action ? (
        <div className="shrink-0 text-[0.7rem] tracking-wider text-muted-foreground [&_a]:text-muted-foreground [&_a]:no-underline hover:[&_a]:text-foreground hover:[&_a]:underline">
          {action}
        </div>
      ) : null}
    </div>
  );
}
