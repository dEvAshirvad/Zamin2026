import type * as React from 'react';

import { cn } from '@/lib/utils';

function TableWrap({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="table-wrap"
      className={cn(
        'w-full overflow-x-auto rounded-none border border-border bg-card',
        className,
      )}
      {...props}
    />
  );
}

function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <table
      data-slot="table"
      className={cn('w-full border-collapse text-left text-sm', className)}
      {...props}
    />
  );
}

function THead({ className, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead
      data-slot="table-head"
      className={cn('bg-muted', className)}
      {...props}
    />
  );
}

function TH({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-th"
      className={cn(
        'border-b-2 border-foreground px-3 py-2.5 text-[11px] font-medium uppercase tracking-wider text-foreground',
        className,
      )}
      {...props}
    />
  );
}

function TBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody data-slot="table-body" className={cn(className)} {...props} />;
}

function TR({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-tr"
      className={cn(
        'border-b border-border transition-colors last:border-0 hover:bg-muted',
        className,
      )}
      {...props}
    />
  );
}

function TD({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-td"
      className={cn('px-3 py-2.5 align-middle', className)}
      {...props}
    />
  );
}

export { TableWrap, Table, THead, TH, TBody, TR, TD };
