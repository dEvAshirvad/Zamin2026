'use client';

import { useEffect, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Minimal overlay. Light scrim only — no soft elevation chrome.
 * Closes on Escape and on backdrop click.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/55 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'w-full max-w-md rounded-none border border-border bg-card',
          'duration-200 ease-[var(--ease-enter)] animate-in fade-in-0',
          className
        )}
      >
        <div className="border-b  border-border px-4 py-3">
          <h3 className="font-semibold text-base tracking-wide">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {children ? <div className="p-4">{children}</div> : null}
        {footer ? (
          <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
