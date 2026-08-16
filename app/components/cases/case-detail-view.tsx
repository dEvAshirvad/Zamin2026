'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import {
  ArrowLeftIcon,
  DownloadSimpleIcon,
  FileTextIcon,
} from '@phosphor-icons/react';

import { SlaBadge } from '@/components/cases/sla-badge';
import { SlaMeter } from '@/components/cases/sla-meter';
import { StageStepper } from '@/components/cases/stage-stepper';
import { StageChip } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocale } from '@/hooks/use-locale';
import { apiPost } from '@/lib/api';
import type { ApiSuccess, CaseDetail } from '@/lib/cases';
import { khasraLabel } from '@/lib/cases';
import { formatDate, formatDateTime, stageLabel } from '@/lib/i18n';

function Detail({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-micro text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 wrap-break-word text-sm text-foreground">
        {children}
      </dd>
    </div>
  );
}

function DocLink({
  href,
  icon,
  label,
  emptyLabel,
  onClick,
  busy,
}: {
  href: string | null | undefined;
  icon: ReactNode;
  label: string;
  emptyLabel: string;
  onClick?: () => void;
  busy?: boolean;
}) {
  if (!href && !onClick) {
    return (
      <span className="inline-flex items-center gap-2 rounded-none border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
        {icon}
        {emptyLabel}
      </span>
    );
  }
  if (onClick) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={onClick}
        className="inline-flex items-center gap-2 rounded-none border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 disabled:opacity-60"
      >
        {icon}
        {busy ? '…' : label}
        <DownloadSimpleIcon size={14} className="text-muted-foreground" />
      </button>
    );
  }
  return (
    <a
      href={href!}
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
  const [noticeBusy, setNoticeBusy] = useState(false);

  async function downloadFreshNotice() {
    setNoticeBusy(true);
    try {
      const res = await apiPost<
        ApiSuccess<{ noticePdfDownloadUrl: string }>
      >(`/api/v1/cases/${detail.id}/notice-pdf`);
      const url = res.data.noticePdfDownloadUrl;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    catch {
      if (detail.noticePdfDownloadUrl)
        window.open(detail.noticePdfDownloadUrl, '_blank', 'noopener,noreferrer');
    }
    finally {
      setNoticeBusy(false);
    }
  }

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
          {detail.alertStatus === 'OVERDUE' ? (
            <span className="border border-sla-overdue/40 bg-sla-overdue/10 px-2 py-0.5 text-xs text-sla-overdue">
              {t('alertOverdue')}
            </span>
          ) : null}
          <SlaBadge item={detail} size="md" />
        </div>
      </div>

      <SlaMeter detail={detail} />

      <Card>
        <CardHeader>
          <CardTitle>{t('pipeline')}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 py-5">
          <StageStepper
            current={detail.stage}
            alertOverdue={detail.alertStatus === 'OVERDUE'}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label={t('khasras')}>
              <span className="font-mono text-xs">
                {khasraLabel(detail.khasras)}
              </span>
            </Detail>
            <Detail label={t('totalRakba')}>
              <span className="tnum">{detail.totalRakba ?? '—'}</span>
            </Detail>
            <Detail label={t('fee')}>
              <span className="tnum">₹{detail.feeAmount}</span>
            </Detail>
            <Detail label={t('guardianName')}>
              {detail.applicantGuardianType
                ? `${detail.applicantGuardianType} ${detail.applicantGuardianName ?? ''}`
                : (detail.applicantGuardianName || '—')}
            </Detail>
            <Detail label={t('applicantResidence')}>
              {detail.applicantResidence || '—'}
            </Detail>
            <Detail label={t('contact')}>
              {detail.applicantContact || '—'}
            </Detail>
            <Detail label={t('assignedRi')}>
              {detail.assignedRiName || detail.assignedRiId || '—'}
            </Detail>
            <Detail label={t('assignedPatwari')}>
              {detail.assignedPatwariName || detail.assignedPatwariId || '—'}
            </Detail>
            <Detail label={t('demarcationDate')}>
              {formatDate(locale, detail.demarcationDate)}
              {detail.demarcationTime ? ` · ${detail.demarcationTime}` : ''}
            </Detail>
            <Detail label={t('patwariHalka')}>
              {detail.patwariHalkaNumber || '—'}
            </Detail>
            <Detail label={t('reportDue')}>
              {detail.reportDueAt
                ? formatDateTime(locale, detail.reportDueAt)
                : '—'}
            </Detail>
            <Detail label={t('neighbors')}>
              {(detail.neighbors ?? []).length
                ? detail.neighbors!
                    .map((n) => `${n.ownerName} (${n.address})`)
                    .join('; ')
                : '—'}
            </Detail>
            <Detail label={t('lastNote')}>
              {detail.lastTransitionNote || detail.objectionReason || '—'}
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
            href={detail.noticePdfDownloadUrl}
            icon={<FileTextIcon size={16} />}
            label={t('downloadNotice')}
            emptyLabel={t('noNotice')}
            onClick={
              detail.noticePdfObjectKey || detail.noticePdfDownloadUrl
                ? downloadFreshNotice
                : undefined
            }
            busy={noticeBusy}
          />
          <DocLink
            href={detail.reportPdfDownloadUrl}
            icon={<FileTextIcon size={16} />}
            label={t('downloadReport')}
            emptyLabel={t('noReport')}
          />
        </CardContent>
      </Card>
    </div>
  );
}
