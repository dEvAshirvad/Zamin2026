import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** Public chrome width — matches rid.rdmp.in max-width 780px. */
export function SiteContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mx-auto w-full max-w-[780px] px-6', className)}>
      {children}
    </div>
  );
}
