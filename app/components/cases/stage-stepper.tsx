'use client';

import { useLocale } from '@/hooks/use-locale';
import { STAGE_ORDER, stageShortLabel } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * The eight-stage track. The pipeline *is* the product — before this, the
 * current stage was a single grey pill and the shape of the process was
 * invisible. See design.md §7.1.
 *
 * Horizontal from md up, vertical below.
 */
export function StageStepper({ current }: { current: string }) {
  const { locale } = useLocale();
  const currentIndex = STAGE_ORDER.indexOf(
    current as (typeof STAGE_ORDER)[number],
  );

  return (
    <ol className="flex flex-col md:flex-row">
      {STAGE_ORDER.map((stage, i) => {
        const done = currentIndex > i;
        const active = currentIndex === i;
        const isLast = i === STAGE_ORDER.length - 1;

        return (
          <li
            key={stage}
            aria-current={active ? 'step' : undefined}
            className="flex min-w-0 gap-3 md:flex-1 md:flex-col md:gap-2"
          >
            <div className="flex flex-col items-center md:w-full md:flex-row md:items-center">
              <span
                className={cn(
                  'flex size-3.5 shrink-0 items-center justify-center rounded-none border-2 transition-colors',
                  done && 'border-primary bg-primary',
                  active && 'border-ring bg-card ring-2 ring-ring/30',
                  !done && !active && 'border-border bg-card',
                )}
              >
                {active ? (
                  <span className="size-1.5 rounded-none bg-ring" />
                ) : null}
              </span>
              {!isLast ? (
                <span
                  aria-hidden
                  className={cn(
                    'w-0.5 min-h-5 grow md:h-0.5 md:min-h-0 md:w-auto',
                    done ? 'bg-primary' : 'bg-border',
                  )}
                />
              ) : null}
            </div>

            <span
              className={cn(
                'pb-4 text-xs leading-4 md:pb-0 md:pe-2',
                active
                  ? 'font-semibold text-foreground'
                  : done
                    ? 'text-muted-foreground'
                    : 'text-muted-foreground/60',
              )}
            >
              {stageShortLabel(locale, stage)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
