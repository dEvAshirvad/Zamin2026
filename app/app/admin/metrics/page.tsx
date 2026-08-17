'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { MetricsCharts } from '@/components/admin/metrics-charts';
import { AppShell } from '@/components/app-shell';
import { useTehsils } from '@/components/cases/case-list-filters';
import { RoleGate } from '@/components/role-gate';
import { EmptyState, ErrorNote, Skeleton } from '@/components/ui/feedback';
import { Field, Input, Select } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Stat } from '@/components/ui/stat';
import { Table, TableWrap, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { ToggleChip } from '@/components/ui/toggle-chip';
import { useLocale } from '@/hooks/use-locale';
import { useMe } from '@/hooks/use-me';
import { apiGet } from '@/lib/api';
import type { ApiSuccess } from '@/lib/cases';
import { formatDateTime, stageLabel } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type StaffStageCount = { stage: string; count: number };

interface StaffReportRow {
  staffId: string;
  name: string;
  role: 'ri' | 'patwari';
  allotted: number;
  open: number;
  closed: number;
  overdue: number;
  reportOverdue: number;
  superiorAlert: number;
  closureRate: number;
  avgOpenAgeDays: number | null;
  byStage: StaffStageCount[];
}

interface CaseMetrics {
  total: number;
  closed: number;
  overdue: number;
  reportOverdue?: number;
  superiorAlert?: number;
  byStage: Array<{ stage: string; count: number }>;
  byTehsil: Array<{
    tehsilId: string;
    tehsilName: string;
    total: number;
    overdue: number;
    closed: number;
    reportOverdue?: number;
    superiorAlert?: number;
  }>;
  byStaff?: StaffReportRow[];
  analysis?: {
    open: number;
    closureRate: number;
    overdueRate: number;
    reportOverdueRate: number;
    avgOpenAgeDays: number | null;
    avgCloseDays: number | null;
    topCloser: {
      staffId: string;
      name: string;
      role: 'ri' | 'patwari';
      closureRate: number;
      allotted: number;
    } | null;
    heaviestLoad: {
      staffId: string;
      name: string;
      role: 'ri' | 'patwari';
      allotted: number;
      open: number;
    } | null;
    loadImbalance: number;
  };
  generatedAt: string;
}

type PeriodMode = 'month' | 'range';

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function stageCount(row: StaffReportRow, stage: string) {
  return row.byStage.find((s) => s.stage === stage)?.count ?? 0;
}

function AdminMetrics() {
  const { data: me } = useMe();
  const { locale, t } = useLocale();
  const tehsilsQuery = useTehsils(true);

  const [periodMode, setPeriodMode] = useState<PeriodMode>('month');
  const [month, setMonth] = useState(currentMonth);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selectedTehsils, setSelectedTehsils] = useState<string[]>([]);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (periodMode === 'month' && month) {
      params.set('month', month);
    } else {
      if (from) params.set('from', from);
      if (to) params.set('to', to);
    }
    if (selectedTehsils.length > 0) {
      params.set('tehsilIds', selectedTehsils.join(','));
    }
    return params.toString();
  }, [periodMode, month, from, to, selectedTehsils]);

  const metricsQuery = useQuery({
    queryKey: ['admin-metrics-cases', queryParams] as const,
    queryFn: async () => {
      const res = await apiGet<ApiSuccess<CaseMetrics>>(
        `/api/v1/admin/metrics/cases${queryParams ? `?${queryParams}` : ''}`,
      );
      return res.data;
    },
  });

  if (!me) return null;
  const m = metricsQuery.data;
  const open = m ? Math.max(0, m.total - m.closed) : 0;
  const analysis = m?.analysis;
  const byStaff = m?.byStaff ?? [];
  const tehsils = tehsilsQuery.data ?? [];

  return (
    <AppShell
      me={me}
      title={t('caseMetrics')}
      description={
        m ? `${t('when')} · ${formatDateTime(locale, m.generatedAt)}` : undefined
      }
    >
      <section className="flex flex-col gap-3 border border-border bg-card p-3">
        <div className="flex flex-wrap items-end gap-3">
          <Field label={t('metricPeriodMode')} className="sm:max-w-40">
            <Select
              value={periodMode}
              onChange={(e) => setPeriodMode(e.target.value as PeriodMode)}
            >
              <option value="month">{t('metricFilterMonth')}</option>
              <option value="range">{t('metricFilterRange')}</option>
            </Select>
          </Field>
          {periodMode === 'month' ? (
            <Field label={t('metricFilterMonth')} className="sm:max-w-44">
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </Field>
          ) : (
            <>
              <Field label={t('metricFilterFrom')} className="sm:max-w-44">
                <Input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </Field>
              <Field label={t('metricFilterTo')} className="sm:max-w-44">
                <Input
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(e) => setTo(e.target.value)}
                />
              </Field>
            </>
          )}
          <Button
            type="button"
            variant="outline"
            className="h-9"
            onPress={() => {
              setPeriodMode('month');
              setMonth(currentMonth());
              setFrom('');
              setTo('');
              setSelectedTehsils([]);
            }}
          >
            {t('metricFilterReset')}
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {t('metricFilterTehsils')}
          </p>
          <div className="flex flex-wrap gap-2">
            <ToggleChip
              pressed={selectedTehsils.length === 0}
              onPressedChange={(on) => {
                if (on) setSelectedTehsils([]);
              }}
              className={
                selectedTehsils.length === 0
                  ? 'border-transparent bg-foreground text-background [&_span]:bg-background'
                  : undefined
              }
            >
              {t('metricFilterAllTehsils')}
            </ToggleChip>
            {tehsils.map((tehsil) => {
              const pressed = selectedTehsils.includes(tehsil.id);
              return (
                <ToggleChip
                  key={tehsil.id}
                  pressed={pressed}
                  onPressedChange={(on) => {
                    setSelectedTehsils((prev) =>
                      on
                        ? [...prev, tehsil.id]
                        : prev.filter((id) => id !== tehsil.id),
                    );
                  }}
                  className={
                    pressed
                      ? 'border-transparent bg-foreground text-background [&_span]:bg-background'
                      : undefined
                  }
                >
                  {tehsil.name}
                </ToggleChip>
              );
            })}
          </div>
        </div>
      </section>

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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

          {analysis ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label={t('metricReportOverdue')}
                value={m.reportOverdue ?? 0}
                tone={(m.reportOverdue ?? 0) > 0 ? 'overdue' : 'default'}
                hint={`${analysis.reportOverdueRate}%`}
              />
              <Stat
                label={t('metricSuperiorAlerts')}
                value={m.superiorAlert ?? 0}
                tone={(m.superiorAlert ?? 0) > 0 ? 'overdue' : 'default'}
              />
              <Stat
                label={t('metricAvgOpenAge')}
                value={analysis.avgOpenAgeDays ?? '—'}
                hint={t('metricDaysUnit')}
              />
              <Stat
                label={t('metricAvgCloseDays')}
                value={analysis.avgCloseDays ?? '—'}
                hint={t('metricDaysUnit')}
              />
            </div>
          ) : null}

          {analysis?.topCloser || analysis?.heaviestLoad ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {analysis.topCloser ? (
                <Stat
                  label={t('metricTopCloser')}
                  value={`${analysis.topCloser.closureRate}%`}
                  hint={`${analysis.topCloser.name} · ${t(analysis.topCloser.role)} · ${analysis.topCloser.allotted} ${t('total').toLowerCase()}`}
                  tone="ontrack"
                />
              ) : null}
              {analysis.heaviestLoad ? (
                <Stat
                  label={t('metricHeaviestLoad')}
                  value={analysis.heaviestLoad.allotted}
                  hint={`${analysis.heaviestLoad.name} · ${t(analysis.heaviestLoad.role)} · ${analysis.heaviestLoad.open} ${t('openCases').toLowerCase()} · ${t('metricLoadImbalance')} ${analysis.loadImbalance}×`}
                />
              ) : null}
            </div>
          ) : null}

          <MetricsCharts metrics={m} />

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold text-xl tracking-tight">
              {t('metricStaffReport')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('metricStaffReportHint')}
            </p>
            {byStaff.length === 0 ? (
              <EmptyState title={t('metricNoStaffRows')} />
            ) : (
              <TableWrap>
                <Table>
                  <THead>
                    <TR className="hover:bg-transparent">
                      <TH>{t('name')}</TH>
                      <TH>{t('role')}</TH>
                      <TH className="text-end">{t('metricAllotted')}</TH>
                      <TH className="text-end">{t('openCases')}</TH>
                      <TH className="text-end">{t('closed')}</TH>
                      <TH className="text-end">{t('metricClosureRate')}</TH>
                      <TH className="text-end">{t('overdue')}</TH>
                      <TH className="text-end">{t('metricReportOverdue')}</TH>
                      <TH className="text-end">{t('metricSuperiorAlerts')}</TH>
                      <TH className="text-end">{t('metricAvgOpenAge')}</TH>
                      <TH className="text-end">
                        {stageLabel(locale, 'HEARING_SCHEDULED')}
                      </TH>
                      <TH className="text-end">
                        {stageLabel(locale, 'REPORT_SUBMITTED')}
                      </TH>
                      <TH className="text-end">
                        {stageLabel(locale, 'ORDER_ISSUED')}
                      </TH>
                      <TH className="text-end">
                        {stageLabel(locale, 'OBJECTION_CLOSED')}
                      </TH>
                    </TR>
                  </THead>
                  <TBody>
                    {byStaff.map((row) => (
                      <TR key={`${row.role}-${row.staffId}`}>
                        <TD className="font-medium">{row.name}</TD>
                        <TD className="text-muted-foreground">{t(row.role)}</TD>
                        <TD className="tnum text-end">{row.allotted}</TD>
                        <TD className="tnum text-end">{row.open}</TD>
                        <TD className="tnum text-end text-muted-foreground">
                          {row.closed}
                        </TD>
                        <TD className="tnum text-end text-muted-foreground">
                          {row.closureRate}%
                        </TD>
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
                        <TD
                          className={cn(
                            'tnum text-end',
                            row.reportOverdue > 0
                              ? 'font-medium text-sla-overdue'
                              : 'text-muted-foreground',
                          )}
                        >
                          {row.reportOverdue}
                        </TD>
                        <TD
                          className={cn(
                            'tnum text-end',
                            row.superiorAlert > 0
                              ? 'font-medium text-sla-overdue'
                              : 'text-muted-foreground',
                          )}
                        >
                          {row.superiorAlert}
                        </TD>
                        <TD className="tnum text-end text-muted-foreground">
                          {row.avgOpenAgeDays ?? '—'}
                        </TD>
                        <TD className="tnum text-end text-muted-foreground">
                          {stageCount(row, 'HEARING_SCHEDULED')}
                        </TD>
                        <TD className="tnum text-end text-muted-foreground">
                          {stageCount(row, 'REPORT_SUBMITTED')}
                        </TD>
                        <TD className="tnum text-end text-muted-foreground">
                          {stageCount(row, 'ORDER_ISSUED')}
                        </TD>
                        <TD className="tnum text-end text-muted-foreground">
                          {stageCount(row, 'OBJECTION_CLOSED')}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </TableWrap>
            )}
          </section>

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
                    <TH className="text-end">{t('metricReportOverdue')}</TH>
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
                            {row.reportOverdue ?? 0}
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
