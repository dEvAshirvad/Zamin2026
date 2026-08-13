'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type SiteNavItem = {
  href: string;
  label: ReactNode;
  active?: boolean;
  /** Ink pill (Portal Login). */
  portal?: boolean;
  external?: boolean;
};

export function SiteNav({
  items,
  className,
}: {
  items: SiteNavItem[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <nav
      className={cn('mt-5 border-t border-border', className)}
      aria-label="Main navigation"
    >
      <button
        type="button"
        className="mb-2 border border-border px-2.5 py-1.5 font-mono text-sm tracking-wider text-foreground md:hidden"
        aria-expanded={open}
        aria-controls="site-nav-list"
        onClick={() => setOpen((v) => !v)}
      >
        ☰ MENU
      </button>
      <ul
        id="site-nav-list"
        className={cn(
          'm-0 flex list-none flex-col flex-wrap p-0 md:flex-row',
          open ? 'flex' : 'hidden md:flex',
        )}
      >
        {items.map((item) => {
          const classes = cn(
            'block border-b border-border px-4 py-3 text-xs tracking-[0.12em] text-muted-foreground uppercase no-underline transition-colors md:border-r md:border-b-0 md:py-2.5',
            'hover:bg-foreground hover:text-background',
            item.active && 'bg-foreground text-background',
            item.portal && 'bg-foreground text-background',
            'md:first:border-l',
          );

          return (
            <li key={`${item.href}-${String(item.label)}`}>
              {item.href.startsWith('#') || item.external ? (
                <a
                  href={item.href}
                  className={classes}
                  onClick={() => setOpen(false)}
                  {...(item.external
                    ? { target: '_blank', rel: 'noopener noreferrer' }
                    : {})}
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  href={item.href}
                  className={classes}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
