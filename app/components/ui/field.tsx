import type * as React from 'react';

import { cn } from '@/lib/utils';

const controlBase =
  'w-full rounded-none border border-input border-b-foreground/40 bg-card px-2.5 py-1.5 text-sm text-foreground transition-colors ' +
  'placeholder:text-muted-foreground/70 ' +
  'focus-visible:border-foreground focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-0 ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

/** Label + control + optional hint, stacked. */
function Field({
  label,
  hint,
  error,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<'label'>, 'children'> & {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)} {...props}>
      <span className="text-micro text-muted-foreground">{label}</span>
      {children}
      {hint ? (
        <span className="text-xs text-muted-foreground">{hint}</span>
      ) : null}
      {error ? (
        <span className="text-xs text-destructive">{error}</span>
      ) : null}
    </label>
  );
}

function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return <input className={cn(controlBase, className)} {...props} />;
}

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea className={cn(controlBase, 'resize-y', className)} {...props} />
  );
}

function Select({ className, ...props }: React.ComponentProps<'select'>) {
  return <select className={cn(controlBase, 'pr-8', className)} {...props} />;
}

/** File inputs get the button treatment via ::file-selector-button. */
function FileInput({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type="file"
      className={cn(
        'w-full text-sm text-muted-foreground',
        'file:mr-3 file:cursor-pointer file:rounded-none file:border file:border-dashed file:border-border file:bg-muted',
        'file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:uppercase file:tracking-wider file:text-foreground',
        'hover:file:border-foreground hover:file:bg-accent',
        className,
      )}
      {...props}
    />
  );
}

export { Field, Input, Textarea, Select, FileInput, controlBase };
