'use client';

import { useLocale } from '@/hooks/use-locale';
import { cn } from '@/lib/utils';

const OPTIONS = [
  { value: 'hi' as const, label: 'हि' },
  { value: 'en' as const, label: 'EN' },
];

export function LocaleToggle({ className }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();

  return (
    <div
      role="group"
      aria-label={t('language')}
      className={cn(
        'inline-flex shrink-0 overflow-hidden rounded-none border border-border bg-card',
        className,
      )}
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={locale === opt.value}
          onClick={() => setLocale(opt.value)}
          className={cn(
            'rounded-none px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider transition-colors',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50',
            locale === opt.value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
