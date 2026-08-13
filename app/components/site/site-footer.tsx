import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { SiteContainer } from './site-container';
import type { SiteRuleStyle } from './types';

export type SiteFooterColumn = {
  title: string;
  links?: { href: string; label: ReactNode; external?: boolean }[];
  body?: ReactNode;
};

export function SiteFooter({
  rule = 'single',
  columns,
  bottom,
  id,
  className,
}: {
  rule?: SiteRuleStyle;
  columns: SiteFooterColumn[];
  bottom: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <footer
      id={id}
      className={cn(
        'bg-muted py-8',
        rule === 'double'
          ? 'border-t-[3px] border-double border-border'
          : 'border-t border-border',
        className,
      )}
    >
      <SiteContainer>
        <div className="grid grid-cols-1 gap-6 text-xs text-muted-foreground md:grid-cols-3 md:gap-8">
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="mb-3 font-mono text-[0.65rem] tracking-[0.2em] text-foreground uppercase">
                {col.title}
              </h4>
              {col.body}
              {col.links?.map((link) =>
                link.href.startsWith('/') && !link.external ? (
                  <Link
                    key={link.href + String(link.label)}
                    href={link.href}
                    className="mb-1 block text-xs text-muted-foreground no-underline hover:text-foreground hover:underline"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.href + String(link.label)}
                    href={link.href}
                    className="mb-1 block text-xs text-muted-foreground no-underline hover:text-foreground hover:underline"
                    {...(link.external
                      ? { target: '_blank', rel: 'noopener noreferrer' }
                      : {})}
                  >
                    {link.label}
                  </a>
                ),
              )}
            </div>
          ))}
        </div>
        <div className="mt-6 border-t border-border pt-4 text-center text-[0.68rem] tracking-wider text-muted-foreground">
          {bottom}
        </div>
      </SiteContainer>
    </footer>
  );
}
