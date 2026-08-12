'use client';

import { useQuery } from '@tanstack/react-query';

import { MetricsCharts } from '@/components/admin/metrics-charts';
import { AppShell } from '@/components/app-shell';
import { RoleGate } from '@/components/role-gate';
import { EmptyState, ErrorNote, Skeleton } from '@/components/ui/feedback';
import { Stat } from '@/components/ui/stat';
import { Table, TableWrap, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useLocale } from '@/hooks/use-locale';
import { useMe } from '@/hooks/use-me';
import { apiGet } from '@/lib/api';
import type { ApiSuccess } from '@/lib/cases';
import { formatDateTime } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface CaseMetrics {
  total: number;
  closed: number;
  overdue: number;
  byStage: Array<{ stage: string; count: number }>;
  byTehsil: Array<{
    tehsilId: string;
    tehsilName: string;
    total: number;
    overdue: number;
    closed: number;
  }>;
  generatedAt: string;
}

function AdminMetrics() {
  const { data: me } = useMe();
  const { locale, t } = useLocale();

  const metricsQuery = useQuery({
    queryKey: ['admin-metrics-cases'] as const,
    queryFn: async () => {
      const res = await apiGet<ApiSuccess<CaseMetrics>>(
        '/api/v1/admin/metrics/cases',
      );
      return res.data;
    },
  });

  if (!me) return null;
  const m = metricsQuery.data;
  const open = m ? Math.max(0, m.total - m.closed) : 0;

  return (
    <AppShell
      me={me}
      title={t('caseMetrics')}
      description={
        m ? `${t('when')} · ${formatDateTime(locale, m.generatedAt)}` : undefined
      }
    >
      {metricsQuery.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : !m ? (
        <ErrorNote>{t('metricsFailed')}</ErrorNote>
      ) : m.total === 0 ? (
        <EmptyState title={t('noMetrics')} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label={t('total')} value={m.total} />
            <Stat
              label={t('openCases')}
              value={open}
              hint={`${Math.round((open / m.total) * 100)}%`}
            />
            <Stat
              label={t('overdue')}
              value={m.overdue}
              tone={m.overdue > 0 ? 'overdue' : 'default'}
              hint={`${Math.round((m.overdue / m.total) * 100)}%`}
            />
            <Stat
              label={t('closedEcourt')}
              value={m.closed}
              tone="ontrack"
              hint={`${Math.round((m.closed / m.total) * 100)}%`}
            />
          </div>

          <MetricsCharts metrics={m} />

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold text-xl tracking-tight">
              {t('byTehsil')}
            </h2>
            <TableWrap>
              <Table>
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH>{t('tehsil')}</TH>
                    <TH className="text-end">{t('total')}</TH>
                    <TH className="text-end">{t('overdue')}</TH>
                    <TH className="text-end">{t('closed')}</TH>
                    <TH className="text-end">{t('metricClosureRate')}</TH>
                  </TR>
                </THead>
                <TBody>
                  {[...m.byTehsil]
                    .sort((a, b) => b.total - a.total)
                    .map((row) => {
                      const closure =
                        row.total > 0
                          ? Math.round((row.closed / row.total) * 100)
                          : 0;
                      return (
                        <TR key={row.tehsilId}>
                          <TD className="font-medium">{row.tehsilName}</TD>
                          <TD className="tnum text-end">{row.total}</TD>
                          <TD
                            className={cn(
                              'tnum text-end',
                              row.overdue > 0
                                ? 'font-medium text-sla-overdue'
                                : 'text-muted-foreground',
                            )}
                          >
                            {row.overdue}
                          </TD>
                          <TD className="tnum text-end text-muted-foreground">
                            {row.closed}
                          </TD>
                          <TD className="tnum text-end text-muted-foreground">
                            {closure}%
                          </TD>
                        </TR>
                      );
                    })}
                </TBody>
              </Table>
            </TableWrap>
          </section>
        </>
      )}
    </AppShell>
  );
}

export default function AdminMetricsPage() {
  return (
    <RoleGate allow={['admin']}>
      <AdminMetrics />
    </RoleGate>
  );
}
