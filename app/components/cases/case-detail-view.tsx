'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  ArrowLeftIcon,
  DownloadSimpleIcon,
  MapTrifoldIcon,
  ReceiptIcon,
} from '@phosphor-icons/react';

import { SlaBadge } from '@/components/cases/sla-badge';
import { SlaMeter } from '@/components/cases/sla-meter';
import { StageStepper } from '@/components/cases/stage-stepper';
import { StageChip } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocale } from '@/hooks/use-locale';
import type { CaseDetail } from '@/lib/cases';
import { formatDate, formatDateTime, stageLabel } from '@/lib/i18n';

function Detail({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-micro text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-foreground">{children}</dd>
    </div>
  );
}

function DocLink({
  href,
  icon,
  label,
  emptyLabel,
}: {
  href: string | null;
  icon: ReactNode;
  label: string;
  emptyLabel: string;
}) {
  if (!href) {
    return (
      <span className="inline-flex items-center gap-2 rounded-none border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
        {icon}
        {emptyLabel}
      </span>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-none border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
    >
      {icon}
      {label}
      <DownloadSimpleIcon size={14} className="text-muted-foreground" />
    </a>
  );
}

export function CaseDetailView({
  detail,
  backHref,
}: {
  detail: CaseDetail;
  backHref: string;
}) {
  const { locale, t } = useLocale();

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={backHref}
        className="inline-flex w-fit items-center gap-1.5 rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
      >
        <ArrowLeftIcon size={15} className="rtl:rotate-180" />
        {t('backToList')}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <p className="font-mono text-xs text-muted-foreground">
            {detail.caseNo}
          </p>
          <h2 className="font-semibold text-xl leading-7 tracking-tight">
            {detail.applicantName}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('village')} {detail.village} · {t('filedAt')}{' '}
            {formatDate(locale, detail.filedAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StageChip>{stageLabel(locale, detail.stage)}</StageChip>
          <SlaBadge item={detail} size="md" />
        </div>
      </div>

      <SlaMeter detail={detail} />

      <Card>
        <CardHeader>
          <CardTitle>{t('pipeline')}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 py-5">
          <StageStepper current={detail.stage} />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label={t('khasras')}>
              <span className="font-mono text-xs">
                {detail.khasras.join(', ')}
              </span>
            </Detail>
            <Detail label={t('fee')}>
              <span className="tnum">₹{detail.feeAmount}</span>
            </Detail>
            <Detail label={t('challanRef')}>
              <span className="font-mono text-xs">
                {detail.challanReference}
              </span>
            </Detail>
            <Detail label={t('contact')}>
              {detail.applicantContact || '—'}
            </Detail>
            <Detail label={t('assignedRi')}>
              {detail.assignedRiId || '—'}
            </Detail>
            <Detail label={t('hearing')}>
              {formatDateTime(locale, detail.hearingAt)}
            </Detail>
            <Detail label={t('stageDue')}>
              {detail.stageDueAt ? (
                <span className="flex flex-wrap items-center gap-2">
                  {formatDate(locale, detail.stageDueAt)}
                  {detail.stageSlaStatus === 'overdue' ? (
                    <span className="text-xs text-sla-overdue">
                      {t('stageLate')}
                    </span>
                  ) : null}
                </span>
              ) : (
                '—'
              )}
            </Detail>
            <Detail label={t('ecourtRef')}>
              {detail.ecourtReference || '—'}
            </Detail>
            <Detail label={t('lastNote')}>
              {detail.lastTransitionNote || '—'}
            </Detail>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('documents')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <DocLink
            href={detail.mapDownloadUrl}
            icon={<MapTrifoldIcon size={16} />}
            label={t('downloadMap')}
            emptyLabel={t('noMap')}
          />
          <DocLink
            href={detail.challanDownloadUrl}
            icon={<ReceiptIcon size={16} />}
            label={t('downloadChallan')}
            emptyLabel={t('noChallan')}
          />
        </CardContent>
      </Card>
    </div>
  );
}
