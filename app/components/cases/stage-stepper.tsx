'use client';

import { useLocale } from '@/hooks/use-locale';
import { OBJECTION_STAGE, STAGE_ORDER, stageShortLabel } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * Horizontal stage slider / stepper for the demarcation pipeline.
 * Objection-closed cases show a branch marker instead of the demarcation path.
 */
export function StageStepper({
  current,
  alertOverdue = false,
}: {
  current: string;
  alertOverdue?: boolean;
}) {
  const { locale, t } = useLocale();
  const objectionPath = current === OBJECTION_STAGE;
  const stages = objectionPath
    ? ([
        'SUBMITTED',
        'MEMO_ISSUED',
        'HEARING_SCHEDULED',
        OBJECTION_STAGE,
      ] as const)
    : STAGE_ORDER;

  const currentIndex = (stages as readonly string[]).indexOf(current);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto pb-1">
        <ol className="flex min-w-max gap-0 md:min-w-0 md:w-full">
          {stages.map((stage, i) => {
            const done = currentIndex > i;
            const active = currentIndex === i;
            const isLast = i === stages.length - 1;
            const overdueHere =
              alertOverdue && stage === 'HEARING_SCHEDULED' && active;

            return (
              <li
                key={stage}
                aria-current={active ? 'step' : undefined}
                className="flex min-w-28 flex-1 flex-col gap-2 md:min-w-0"
              >
                <div className="flex w-full items-center">
                  <span
                    className={cn(
                      'flex size-3.5 shrink-0 items-center justify-center rounded-none border-2 transition-colors',
                      done && 'border-primary bg-primary',
                      active &&
                        !overdueHere &&
                        'border-ring bg-card ring-2 ring-ring/30',
                      overdueHere &&
                        'border-sla-overdue bg-sla-overdue/20 ring-2 ring-sla-overdue/40',
                      !done && !active && 'border-border bg-card'
                    )}
                  >
                    {active ? (
                      <span
                        className={cn(
                          'size-1.5 rounded-none',
                          overdueHere ? 'bg-sla-overdue' : 'bg-ring'
                        )}
                      />
                    ) : null}
                  </span>
                  {!isLast ? (
                    <span
                      aria-hidden
                      className={cn(
                        'h-0.5 w-full min-w-6',
                        done ? 'bg-primary' : 'bg-border'
                      )}
                    />
                  ) : null}
                </div>
                <span
                  className={cn(
                    'pe-2 text-xs leading-4',
                    active
                      ? 'font-semibold text-foreground'
                      : done
                        ? 'text-muted-foreground'
                        : 'text-muted-foreground/60',
                    overdueHere && 'text-sla-overdue'
                  )}
                >
                  {stageShortLabel(locale, stage)}
                  {overdueHere ? ` · ${t('alertOverdue')}` : ''}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
