'use client';

import Link from 'next/link';

import { useLocale } from '@/hooks/use-locale';
import { cn } from '@/lib/utils';

export function SiteBrand({
  compact = false,
  href = '/',
  stamp = 'Government of Chhattisgarh — District Raipur',
  className,
}: {
  /** Sidebar / mobile: smaller emblem, no stamp. */
  compact?: boolean;
  href?: string;
  stamp?: string;
  className?: string;
}) {
  const { t, locale } = useLocale();
  const brand = t('brand');
  const title = locale === 'hi' ? `${brand} · Simankan` : brand;

  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- local SVG emblem */}
      <img
        src="/cg-logo.svg"
        alt="Government of Chhattisgarh Emblem"
        width={compact ? 40 : 64}
        height={compact ? 40 : 64}
        className={cn(
          'shrink-0 object-contain',
          compact ? 'size-10' : 'size-16',
        )}
      />
      <div className="flex min-w-0 flex-col">
        {!compact ? (
          <span className="mb-0.5 text-[0.65rem] tracking-[0.15em] text-muted-foreground uppercase">
            {stamp}
          </span>
        ) : null}
        <Link
          href={href}
          className={cn(
            'font-heading text-foreground no-underline hover:text-ring',
            compact
              ? 'text-base leading-tight'
              : 'text-[1.75rem] leading-tight',
          )}
        >
          {compact ? brand : title}
        </Link>
        <p
          className={cn(
            'mt-1 tracking-[0.08em] text-muted-foreground',
            compact ? 'text-[0.65rem]' : 'text-xs',
          )}
        >
          {t('brandTagline')}
        </p>
      </div>
    </div>
  );
}
