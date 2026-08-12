'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { useLocale } from '@/hooks/use-locale';
import { stageLabel, type Locale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export type MetricsPayload = {
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
};

function pct(n: number, d: number) {
  if (d <= 0) return 0;
  return Math.round((n / d) * 100);
}

function RateRadial({
  value,
  label,
  hint,
  color,
  tone,
}: {
  value: number;
  label: string;
  hint: string;
  color: string;
  tone?: 'default' | 'overdue' | 'ontrack';
}) {
  const config = {
    rate: { label, color },
  } satisfies ChartConfig;

  const clamped = Math.max(0, Math.min(100, value));
  // Full-radius bar; arc length encodes the rate (ponytail: angle, not domain).
  const data = [{ name: 'rate', rate: 100, fill: color }];
  const endAngle = 90 - (clamped / 100) * 360;

  return (
    <Card
      className={cn(
        tone === 'overdue' && 'border-sla-overdue/40',
        tone === 'ontrack' && 'border-sla-ontrack/40',
      )}
    >
      <CardHeader className="border-0 pb-0">
        <CardTitle className="text-sm font-medium tracking-wide">
          {label}
        </CardTitle>
        <CardDescription>{hint}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <ChartContainer
          config={config}
          className="mx-auto aspect-square max-h-45"
        >
          <RadialBarChart
            data={data}
            startAngle={90}
            endAngle={endAngle === 90 ? 89.999 : endAngle}
            innerRadius="68%"
            outerRadius="100%"
          >
            <PolarGrid
              gridType="circle"
              radialLines={false}
              stroke="none"
              className="first:fill-muted last:fill-card"
              polarRadius={[86, 74]}
            />
            <RadialBar dataKey="rate" background cornerRadius={0} />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground tnum text-2xl font-semibold"
                        >
                          {clamped}%
                        </tspan>
                      </text>
                    );
                  }
                  return null;
                }}
              />
            </PolarRadiusAxis>
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={() => [`${clamped}%`, label]}
                />
              }
            />
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function StagePipelineChart({
  byStage,
  locale,
  title,
  description,
}: {
  byStage: MetricsPayload['byStage'];
  locale: Locale;
  title: string;
  description: string;
}) {
  const { t } = useLocale();
  const data = useMemo(
    () =>
      byStage.map((row) => ({
        stage: stageLabel(locale, row.stage),
        count: row.count,
        fill: 'var(--color-count)',
      })),
    [byStage, locale],
  );

  const config = {
    count: { label: t('count'), color: 'var(--chart-2)' },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="aspect-2/1 w-full min-h-65">
          <BarChart
            accessibilityLayer
            data={data}
            layout="vertical"
            margin={{ left: 8, right: 12, top: 4, bottom: 4 }}
          >
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="stage"
              type="category"
              tickLine={false}
              axisLine={false}
              width={118}
              tickMargin={6}
              className="text-[11px]"
            />
            <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
            <ChartTooltip
              cursor={{ fill: 'var(--muted)' }}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Bar dataKey="count" fill="var(--color-count)" radius={0} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function TehsilLoadChart({
  byTehsil,
  title,
  description,
}: {
  byTehsil: MetricsPayload['byTehsil'];
  title: string;
  description: string;
}) {
  const { t } = useLocale();
  const data = useMemo(
    () =>
      [...byTehsil]
        .sort((a, b) => b.total - a.total)
        .slice(0, 8)
        .map((row) => ({
          tehsil: row.tehsilName,
          total: row.total,
          overdue: row.overdue,
          closed: row.closed,
        })),
    [byTehsil],
  );

  const config = {
    total: { label: t('total'), color: 'var(--chart-2)' },
    overdue: { label: t('overdue'), color: 'var(--sla-overdue)' },
    closed: { label: t('closed'), color: 'var(--chart-1)' },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="aspect-2/1 w-full min-h-70">
          <BarChart accessibilityLayer data={data} margin={{ left: 4, right: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="tehsil"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval={0}
              angle={data.length > 4 ? -28 : 0}
              textAnchor={data.length > 4 ? 'end' : 'middle'}
              height={data.length > 4 ? 64 : 28}
              tickFormatter={(v: string) =>
                v.length > 12 ? `${v.slice(0, 11)}…` : v
              }
            />
            <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={36} />
            <ChartTooltip
              cursor={{ fill: 'var(--muted)' }}
              content={<ChartTooltipContent />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="total" fill="var(--color-total)" radius={0} />
            <Bar dataKey="overdue" fill="var(--color-overdue)" radius={0} />
            <Bar dataKey="closed" fill="var(--color-closed)" radius={0} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function TehsilRadarChart({
  byTehsil,
  title,
  description,
}: {
  byTehsil: MetricsPayload['byTehsil'];
  title: string;
  description: string;
}) {
  const { t } = useLocale();

  const top = useMemo(
    () =>
      [...byTehsil]
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)
        .map((r, i) => ({ ...r, seriesKey: `t${i}` })),
    [byTehsil],
  );

  const data = useMemo(() => {
    const districtTotal = Math.max(1, byTehsil.reduce((s, r) => s + r.total, 0));
    return [
      {
        metric: t('metricClosureRate'),
        ...Object.fromEntries(
          top.map((r) => [r.seriesKey, pct(r.closed, r.total)]),
        ),
      },
      {
        metric: t('metricOnTrackRate'),
        ...Object.fromEntries(
          top.map((r) => {
            const open = Math.max(0, r.total - r.closed);
            const onTrack = Math.max(0, open - r.overdue);
            return [r.seriesKey, pct(onTrack, open || 1)];
          }),
        ),
      },
      {
        metric: t('metricCaseloadShare'),
        ...Object.fromEntries(
          top.map((r) => [r.seriesKey, pct(r.total, districtTotal)]),
        ),
      },
    ];
  }, [byTehsil, t, top]);

  const config = useMemo(() => {
    const colors = [
      'var(--chart-1)',
      'var(--chart-2)',
      'var(--chart-3)',
      'var(--chart-4)',
      'var(--chart-5)',
    ];
    return Object.fromEntries(
      top.map((r, i) => [
        r.seriesKey,
        { label: r.tehsilName, color: colors[i % colors.length] },
      ]),
    ) satisfies ChartConfig;
  }, [top]);

  if (top.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={config}
          className="mx-auto aspect-square max-h-85 w-full"
        >
          <RadarChart data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={false}
              axisLine={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {top.map((r) => (
              <Radar
                key={r.seriesKey}
                dataKey={r.seriesKey}
                fill={`var(--color-${r.seriesKey})`}
                fillOpacity={0.12}
                stroke={`var(--color-${r.seriesKey})`}
                strokeWidth={1.5}
              />
            ))}
          </RadarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export function MetricsCharts({ metrics }: { metrics: MetricsPayload }) {
  const { locale, t } = useLocale();
  const open = Math.max(0, metrics.total - metrics.closed);
  const closureRate = pct(metrics.closed, metrics.total);
  const overdueShare = pct(metrics.overdue, metrics.total);
  const onTrackOpen = pct(Math.max(0, open - metrics.overdue), open || 1);

  const bottleneck = useMemo(() => {
    const active = metrics.byStage.filter((s) => s.stage !== 'ECOURT_UPLOADED');
    if (active.length === 0) return null;
    return active.reduce((a, b) => (b.count > a.count ? b : a));
  }, [metrics.byStage]);

  const riskiest = useMemo(() => {
    if (metrics.byTehsil.length === 0) return null;
    return metrics.byTehsil.reduce((a, b) =>
      pct(b.overdue, b.total) > pct(a.overdue, a.total) ? b : a,
    );
  }, [metrics.byTehsil]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <RateRadial
          value={closureRate}
          label={t('metricClosureRate')}
          hint={t('metricClosureHint', { closed: metrics.closed, total: metrics.total })}
          color="var(--chart-2)"
          tone="ontrack"
        />
        <RateRadial
          value={overdueShare}
          label={t('metricOverdueShare')}
          hint={t('metricOverdueHint', {
            overdue: metrics.overdue,
            total: metrics.total,
          })}
          color="var(--sla-overdue)"
          tone={metrics.overdue > 0 ? 'overdue' : 'default'}
        />
        <RateRadial
          value={onTrackOpen}
          label={t('metricOnTrackRate')}
          hint={t('metricOnTrackHint', { open })}
          color="var(--sla-ontrack)"
          tone="ontrack"
        />
      </div>

      {(bottleneck || riskiest) && (
        <div className="grid gap-3 md:grid-cols-2">
          {bottleneck ? (
            <Card>
              <CardHeader className="border-0">
                <CardTitle className="text-sm">{t('metricBottleneck')}</CardTitle>
                <CardDescription>
                  {t('metricBottleneckHint', {
                    stage: stageLabel(locale, bottleneck.stage),
                    count: bottleneck.count,
                  })}
                </CardDescription>
              </CardHeader>
            </Card>
          ) : null}
          {riskiest && riskiest.overdue > 0 ? (
            <Card>
              <CardHeader className="border-0">
                <CardTitle className="text-sm">{t('metricRiskTehsil')}</CardTitle>
                <CardDescription>
                  {t('metricRiskTehsilHint', {
                    tehsil: riskiest.tehsilName,
                    rate: pct(riskiest.overdue, riskiest.total),
                    overdue: riskiest.overdue,
                  })}
                </CardDescription>
              </CardHeader>
            </Card>
          ) : null}
        </div>
      )}

      <StagePipelineChart
        byStage={metrics.byStage}
        locale={locale}
        title={t('byStage')}
        description={t('metricStageChartHint')}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <TehsilLoadChart
          byTehsil={metrics.byTehsil}
          title={t('metricTehsilLoad')}
          description={t('metricTehsilLoadHint')}
        />
        <TehsilRadarChart
          byTehsil={metrics.byTehsil}
          title={t('metricTehsilRadar')}
          description={t('metricTehsilRadarHint')}
        />
      </div>
    </div>
  );
}
