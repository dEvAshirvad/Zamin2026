'use client';

import { useQuery } from '@tanstack/react-query';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/feedback';
import { useLocale } from '@/hooks/use-locale';
import { apiGet } from '@/lib/api';
import type { ApiSuccess } from '@/lib/cases';
import { formatDateTime, stageLabel, type MessageKey } from '@/lib/i18n';

export interface TransitionLogItem {
  id: string;
  caseId: string;
  tehsilId: string;
  fromStage: string;
  toStage: string;
  actorUserId: string;
  actorRole: string;
  note: string | null;
  createdAt: string;
}

export function CaseTransitionHistory({ caseId }: { caseId: string }) {
  const { locale, t } = useLocale();
  const query = useQuery({
    queryKey: ['cases', caseId, 'transitions'] as const,
    queryFn: async () => {
      const res = await apiGet<ApiSuccess<TransitionLogItem[]>>(
        `/api/v1/cases/${caseId}/transitions`,
      );
      return res.data;
    },
  });

  const rows = query.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('history')}</CardTitle>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noTransitions')}</p>
        ) : (
          <ol className="flex flex-col">
            {rows.map((row, i) => (
              <li key={row.id} className="flex gap-3">
                {/* Timeline rail */}
                <div className="flex flex-col items-center pt-1.5">
                  <span className="size-2 shrink-0 rounded-none bg-ring" />
                  {i < rows.length - 1 ? (
                    <span className="w-px grow bg-border" />
                  ) : null}
                </div>
                <div className="min-w-0 pb-4 last:pb-0">
                  <p className="text-sm text-foreground">
                    <span className="text-muted-foreground">
                      {stageLabel(locale, row.fromStage)}
                    </span>
                    <span className="mx-1.5 text-muted-foreground">→</span>
                    <span className="font-medium">
                      {stageLabel(locale, row.toStage)}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t(row.actorRole as MessageKey)} ·{' '}
                    {formatDateTime(locale, row.createdAt)}
                  </p>
                  {row.note ? (
                    <p className="mt-1 rounded-none border border-border bg-muted px-2 py-1 text-xs text-secondary-foreground">
                      {row.note}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
