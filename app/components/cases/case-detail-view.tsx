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
import { api } from '@/lib/api';
import type { CaseDetail } from '@/lib/cases';
import { khasraLabel } from '@/lib/cases';
import { formatDate, formatDateTime, stageLabel } from '@/lib/i18n';

function isEmptyValue(value: ReactNode): boolean {
  if (value == null || value === false) return true;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' || trimmed === '—';
  }
  return false;
}

function Detail({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactNode;
}) {
  if (isEmptyValue(children)) return null;
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
  icon,
  label,
  onClick,
  busy,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  busy?: boolean;
}) {
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

function filenameFromDisposition(
  header: string | undefined,
  fallback: string,
): string {
  const match = /filename\*?=(?:UTF-8''|")?([^\";]+)"?/i.exec(header ?? '');
  if (!match?.[1]) return fallback;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

async function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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
  const [reportBusy, setReportBusy] = useState(false);

  const addressRaw
    = detail.applicantResidence?.trim() || detail.village?.trim() || '';
  const address = addressRaw && addressRaw !== '—' ? addressRaw : null;
  const guardian = detail.applicantGuardianType
    ? `${detail.applicantGuardianType} ${detail.applicantGuardianName ?? ''}`.trim()
    : detail.applicantGuardianName?.trim();
  const assignee
    = detail.assignedRiName
    || detail.assignedPatwariName
    || detail.assignedRiId
    || detail.assignedPatwariId
    || null;
  const assigneeExtra
    = detail.assignedRiName && detail.assignedPatwariName
      ? ` · ${detail.assignedPatwariName}`
      : '';
  const demarcation = detail.demarcationDate
    ? `${formatDate(locale, detail.demarcationDate)}${
        detail.demarcationTime ? ` · ${detail.demarcationTime}` : ''
      }`
    : null;
  const note = detail.lastTransitionNote || detail.objectionReason || null;
  const showNotice = Boolean(detail.noticePdfObjectKey);
  const showReport = Boolean(detail.reportPdfObjectKey);
  const showDocuments = showNotice || showReport;

  async function downloadNotice() {
    setNoticeBusy(true);
    try {
      // Download stored notice (uploaded at memo stage). Do not regenerate —
      // that would overwrite the uploaded file.
      const res = await api.get(`/api/v1/cases/${detail.id}/files/notice`, {
        responseType: 'blob',
      });
      saveBlob(
        res.data,
        filenameFromDisposition(
          res.headers['content-disposition'],
          `notice-${detail.caseNo}`,
        ),
      );
    } finally {
      setNoticeBusy(false);
    }
  }

  async function downloadReport() {
    setReportBusy(true);
    try {
      const res = await api.get(`/api/v1/cases/${detail.id}/files/report`, {
        responseType: 'blob',
      });
      saveBlob(
        res.data,
        filenameFromDisposition(
          res.headers['content-disposition'],
          `report-${detail.caseNo}`,
        ),
      );
    } finally {
      setReportBusy(false);
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
            {t('filedAt')} {formatDate(locale, detail.filedAt)}
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
            <Detail label={t('address')}>{address}</Detail>
            <Detail label={t('guardianName')}>{guardian}</Detail>
            <Detail label={t('contact')}>{detail.applicantContact}</Detail>
            {(detail.khasras?.length ?? 0) > 0 ? (
              <Detail label={t('khasras')}>
                <span className="font-mono text-xs">
                  {khasraLabel(detail.khasras)}
                </span>
              </Detail>
            ) : null}
            {(detail.khasras?.length ?? 0) > 0 && detail.totalRakba != null ? (
              <Detail label={t('totalRakba')}>
                <span className="tnum">{detail.totalRakba}</span>
              </Detail>
            ) : null}
            {(detail.khasras?.length ?? 0) > 0 ? (
              <Detail label={t('fee')}>
                <span className="tnum">₹{detail.feeAmount}</span>
              </Detail>
            ) : null}
            <Detail label={t('assignStaff')}>
              {assignee ? `${assignee}${assigneeExtra}` : null}
            </Detail>
            <Detail label={t('noticeDate')}>
              {detail.issueDate
                ? formatDate(locale, detail.issueDate)
                : null}
            </Detail>
            <Detail label={t('demarcationDate')}>{demarcation}</Detail>
            <Detail label={t('patwariHalka')}>
              {detail.patwariHalkaNumber}
            </Detail>
            <Detail label={t('reportDue')}>
              {detail.reportDueAt
                ? formatDateTime(locale, detail.reportDueAt)
                : null}
            </Detail>
            {(detail.neighbors ?? []).length > 0 ? (
              <Detail label={t('neighbors')}>
                {detail.neighbors!
                  .map((n) => `${n.ownerName} (${n.address})`)
                  .join('; ')}
              </Detail>
            ) : null}
            <Detail label={t('lastNote')}>{note}</Detail>
            {detail.superiorAlert ? (
              <Detail label={t('superiorAlertRaised')}>
                {t('superiorAlertRaised')}
              </Detail>
            ) : null}
          </dl>
        </CardContent>
      </Card>

      {showDocuments ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('documents')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {showNotice ? (
              <DocLink
                icon={<FileTextIcon size={16} />}
                label={t('downloadNotice')}
                onClick={() => void downloadNotice()}
                busy={noticeBusy}
              />
            ) : null}
            {showReport ? (
              <DocLink
                icon={<FileTextIcon size={16} />}
                label={t('downloadReport')}
                onClick={() => void downloadReport()}
                busy={reportBusy}
              />
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
