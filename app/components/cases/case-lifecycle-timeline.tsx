'use client';

import { useLocale } from '@/hooks/use-locale';
import type { MessageKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type TimelineStep = {
  titleKey: MessageKey;
  bodyKey: MessageKey;
  metaKey: MessageKey;
};

const STEPS: TimelineStep[] = [
  {
    titleKey: 'lifecycleStep1Title',
    bodyKey: 'lifecycleStep1Body',
    metaKey: 'lifecycleStep1Meta',
  },
  {
    titleKey: 'lifecycleStep2Title',
    bodyKey: 'lifecycleStep2Body',
    metaKey: 'lifecycleStep2Meta',
  },
  {
    titleKey: 'lifecycleStep3Title',
    bodyKey: 'lifecycleStep3Body',
    metaKey: 'lifecycleStep3Meta',
  },
  {
    titleKey: 'lifecycleStep4Title',
    bodyKey: 'lifecycleStep4Body',
    metaKey: 'lifecycleStep4Meta',
  },
];

/**
 * How demarcation cases move — marketing-style vertical timeline
 * (Shadcn Studio timeline-03 layout), sharp-cornered for the brand.
 */
export function CaseLifecycleTimeline({ className }: { className?: string }) {
  const { t } = useLocale();

  return (
    <section
      className={cn(
        // Same muted institutional accent as ring/airmail, shifted green.
        '[--lifecycle:#2e6a4a] [--lifecycle-wash:#e5f4ea]',
        'rounded-none border border-[color-mix(in_srgb,var(--lifecycle)_28%,var(--border))] bg-(--lifecycle-wash) px-5 py-8 sm:px-8',
        className,
      )}
      aria-labelledby="case-lifecycle-heading"
    >
      <p className="text-micro uppercase tracking-[0.14em] text-(--lifecycle)">
        {t('lifecycleEyebrow')}
      </p>
      <h2
        id="case-lifecycle-heading"
        className="mt-2 max-w-2xl font-semibold text-2xl tracking-tight text-foreground"
      >
        {t('lifecycleTitle')}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        {t('lifecycleIntro')}
      </p>

      <ol className="relative mt-10 space-y-0">
        {STEPS.map((step, index) => {
          const isLast = index === STEPS.length - 1;
          const n = String(index + 1).padStart(2, '0');

          return (
            <li key={step.titleKey} className="relative flex gap-4 sm:gap-6">
              <div className="flex w-5 shrink-0 flex-col items-center">
                <span
                  className={cn(
                    'mt-1 size-3 shrink-0 rounded-none border-2 border-(--lifecycle) bg-(--lifecycle-wash)',
                    index === 0 && 'bg-(--lifecycle)',
                  )}
                  aria-hidden
                />
                {!isLast ? (
                  <span
                    className="mt-1 w-px grow bg-[color-mix(in_srgb,var(--lifecycle)_35%,transparent)]"
                    aria-hidden
                  />
                ) : null}
              </div>

              <div
                className={cn(
                  'grid min-w-0 flex-1 gap-3 pb-10 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-8',
                  isLast && 'pb-0',
                )}
              >
                <div className="min-w-0 space-y-1.5">
                  <h3 className="text-base font-semibold tracking-wide text-foreground">
                    <span className="me-2 font-mono text-xs text-(--lifecycle)">
                      {n}
                    </span>
                    {t(step.titleKey)}
                  </h3>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {t(step.bodyKey)}
                  </p>
                </div>
                <p className="shrink-0 text-xs font-medium tracking-wider text-(--lifecycle) uppercase sm:pt-1 sm:text-end">
                  {t(step.metaKey)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
