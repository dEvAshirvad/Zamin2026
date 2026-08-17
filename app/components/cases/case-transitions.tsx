'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  PlusIcon,
  XIcon,
} from '@phosphor-icons/react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorNote } from '@/components/ui/feedback';
import {
  Field,
  FileInput,
  Input,
  Select,
  Textarea,
} from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/hooks/use-locale';
import { api, apiGet, apiPost } from '@/lib/api';
import type {
  ApiSuccess,
  CaseDetail,
  NeighborRow,
  TehsilPatwari,
  TehsilRi,
} from '@/lib/cases';
import { formatDate, stageLabel, type MessageKey } from '@/lib/i18n';
import { queryKeys } from '@/lib/query-keys';

const ACTION_KEY: Record<string, MessageKey> = {
  MEMO_ISSUED: 'action.memo',
  NOTICE_ISSUED: 'action.notice',
  HEARING_SCHEDULED: 'action.notice',
  OBJECTION_CLOSED: 'action.objection',
  DEMARCATION_WINDOW_OPEN: 'action.demarcationYes',
  DEMARCATION_DONE: 'action.demarcationDone',
  REPORT_SUBMITTED: 'action.report',
  ORDER_ISSUED: 'action.order',
};

const FIELD_OWNED = new Set([
  'MEMO_ISSUED',
  'HEARING_SCHEDULED',
  'OBJECTION_CLOSED',
  'DEMARCATION_WINDOW_OPEN',
  'DEMARCATION_DONE',
  'REPORT_SUBMITTED',
]);

const RI_DONE_STAGES = new Set([
  'OBJECTION_CLOSED',
  'REPORT_SUBMITTED',
  'ORDER_ISSUED',
]);

type StaffOption = (TehsilRi | TehsilPatwari) & { role: 'ri' | 'patwari' };

const emptyNeighbor = (): NeighborRow => ({ ownerName: '', address: '' });

function formatRemaining(ms: number): string {
  if (ms <= 0) return '0h 0m';
  const totalMin = Math.floor(ms / 60_000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const mins = totalMin % 60;
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  return `${hours}h ${mins}m`;
}

function ReportCountdown({ dueAt }: { dueAt: string | null | undefined }) {
  const { t } = useLocale();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  if (!dueAt) return null;
  const dueMs = new Date(dueAt).getTime();
  const remaining = dueMs - now;
  const overdue = remaining <= 0;
  return (
    <p
      className={
        overdue
          ? 'border border-red-600/40 bg-red-600/10 px-3 py-2 text-sm text-red-600'
          : 'border border-red-600/40 bg-red-600/10 px-3 py-2 text-sm text-red-600'
      }
    >
      {overdue
        ? t('reportOverdueDeadline')
        : t('reportRemaining', { time: formatRemaining(remaining) })}
      {' · '}
      {t('reportDue')} {new Date(dueAt).toLocaleString()}
    </p>
  );
}

function ActionBlock({
  label,
  onSubmit,
  pending,
  submitDisabled,
  children,
}: {
  label: string;
  onSubmit: (e: FormEvent) => void;
  pending: boolean;
  submitDisabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-none border border-border bg-muted/30 p-3"
    >
      {children}
      <Button
        type="submit"
        isDisabled={pending || Boolean(submitDisabled)}
        className="w-fit"
      >
        {label}
        <ArrowRightIcon size={14} className="rtl:rotate-180" />
      </Button>
    </form>
  );
}

function RiWorkDonePanel() {
  const { t } = useLocale();
  return (
    <Card className="relative overflow-hidden">
      <CardHeader>
        <CardTitle>{t('advanceCase')}</CardTitle>
      </CardHeader>
      <CardContent className="relative min-h-28">
        <div className="absolute inset-0 flex items-center justify-center px-4">
          <div className="max-w-sm border border-border bg-background/95 px-5 py-4 text-center shadow-overlay backdrop-blur-sm">
            <CheckCircleIcon
              size={28}
              weight="fill"
              className="mx-auto mb-2 text-ring"
              aria-hidden
            />
            <p className="font-heading text-base text-foreground">
              {t('riWorkDone')}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {t('riWorkDoneNote')}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

async function postTransition(
  caseId: string,
  body: Record<string, string>,
  files?: { notice?: File | null; report?: File | null }
) {
  const notice = files?.notice ?? null;
  const report = files?.report ?? null;
  if (notice || report) {
    const form = new FormData();
    for (const [k, v] of Object.entries(body)) form.append(k, v);
    if (notice) form.append('notice', notice);
    if (report) form.append('report', report);
    const { data } = await api.post<ApiSuccess<CaseDetail>>(
      `/api/v1/cases/${caseId}/transitions`,
      form,
      { headers: { 'Content-Type': undefined } }
    );
    return data.data;
  }
  const data = await apiPost<ApiSuccess<CaseDetail>>(
    `/api/v1/cases/${caseId}/transitions`,
    body
  );
  return data.data;
}

export function CaseTransitions({
  detail,
  mode,
}: {
  detail: CaseDetail;
  mode: 'tehsildar' | 'ri' | 'patwari' | 'admin';
}) {
  const queryClient = useQueryClient();
  const { locale, t } = useLocale();
  const [assignedStaffId, setAssignedStaffId] = useState('');
  const [objectionReason, setObjectionReason] = useState('');
  const [neighbors, setNeighbors] = useState<NeighborRow[]>([emptyNeighbor()]);
  const [issueDate, setIssueDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [demarcationAt, setDemarcationAt] = useState('');
  const [rescheduleAt, setRescheduleAt] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [noticeFile, setNoticeFile] = useState<File | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const next = detail.allowedNext ?? [];
  const fieldMode = mode === 'ri' || mode === 'patwari';
  const riWorkDone =
    fieldMode &&
    (RI_DONE_STAGES.has(detail.stage) ||
      (detail.allowedNext != null && next.length === 0));

  const staffEnabled = mode === 'tehsildar' && next.includes('MEMO_ISSUED');
  const risQuery = useQuery({
    queryKey: ['tehsil-ris'] as const,
    queryFn: async () => {
      const res = await apiGet<ApiSuccess<TehsilRi[]>>(
        '/api/v1/tehsils/me/ris'
      );
      return res.data;
    },
    enabled: staffEnabled,
  });
  const patwarisQuery = useQuery({
    queryKey: ['tehsil-patwaris'] as const,
    queryFn: async () => {
      const res = await apiGet<ApiSuccess<TehsilPatwari[]>>(
        '/api/v1/tehsils/me/patwaris'
      );
      return res.data;
    },
    enabled: staffEnabled,
  });

  const staffOptions = useMemo((): StaffOption[] => {
    const ris = (risQuery.data ?? []).map((ri) => ({
      ...ri,
      role: 'ri' as const,
    }));
    const patwaris = (patwarisQuery.data ?? []).map((p) => ({
      ...p,
      role: 'patwari' as const,
    }));
    return [...ris, ...patwaris].sort((a, b) => a.name.localeCompare(b.name));
  }, [risQuery.data, patwarisQuery.data]);

  async function invalidate() {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.case(detail.id),
    });
    await queryClient.invalidateQueries({ queryKey: queryKeys.cases });
    await queryClient.invalidateQueries({
      queryKey: ['cases', detail.id, 'transitions'],
    });
  }

  function noticeDraftBody(): Record<string, string> {
    const cleaned = neighbors
      .map((n) => ({
        ownerName: n.ownerName.trim(),
        address: n.address.trim(),
      }))
      .filter((n) => n.ownerName && n.address);
    if (!issueDate) {
      throw Object.assign(new Error('issueDate'), {
        friendlyMessage: t('noticeDate'),
      });
    }
    if (!demarcationAt) {
      throw Object.assign(new Error('demarcation'), {
        friendlyMessage: t('demarcationAt'),
      });
    }
    const [datePart, timePart = '12:00'] = demarcationAt.split('T');
    return {
      neighbors: JSON.stringify(cleaned),
      issueDate: new Date(`${issueDate}T00:00:00.000Z`).toISOString(),
      demarcationDate: datePart!,
      demarcationTime: timePart.slice(0, 5) || '12:00',
    };
  }

  async function downloadNoticeDraft() {
    setError(null);
    setPreviewBusy(true);
    try {
      const body = noticeDraftBody();
      const res = await api.post(
        `/api/v1/cases/${detail.id}/notice-preview`,
        body,
        { responseType: 'blob' }
      );
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `suchna-draft-${detail.caseNo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const e = err as { friendlyMessage?: string; message?: string };
      setError(e.friendlyMessage ?? e.message ?? t('transitionFailed'));
    } finally {
      setPreviewBusy(false);
    }
  }

  const mutation = useMutation({
    mutationFn: async (toStage: string) => {
      const body: Record<string, string> = { toStage };
      if (toStage === 'MEMO_ISSUED') {
        if (!assignedStaffId) {
          throw Object.assign(new Error('assign'), {
            friendlyMessage: t('assignStaffRequired'),
          });
        }
        body.assignedStaffId = assignedStaffId;
      }
      if (toStage === 'HEARING_SCHEDULED') {
        const cleaned = neighbors
          .map((n) => ({
            ownerName: n.ownerName.trim(),
            address: n.address.trim(),
          }))
          .filter((n) => n.ownerName && n.address);
        if (cleaned.length === 0) {
          throw Object.assign(new Error('neighbors'), {
            friendlyMessage: t('neighborsRequired'),
          });
        }
        if (!issueDate) {
          throw Object.assign(new Error('issueDate'), {
            friendlyMessage: t('noticeDate'),
          });
        }
        const applicationYmd = detail.filedAt?.slice(0, 10) ?? '';
        if (applicationYmd && issueDate < applicationYmd) {
          throw Object.assign(new Error('issueDate'), {
            friendlyMessage: t('noticeAfterApplication'),
          });
        }
        if (!demarcationAt) {
          throw Object.assign(new Error('demarcation'), {
            friendlyMessage: t('demarcationAt'),
          });
        }
        const [datePart, timePart = '12:00'] = demarcationAt.split('T');
        if (datePart && issueDate && datePart < issueDate) {
          throw Object.assign(new Error('demarcation'), {
            friendlyMessage: t('demarcationAfterNotice'),
          });
        }
        body.neighbors = JSON.stringify(cleaned);
        body.issueDate = new Date(`${issueDate}T00:00:00.000Z`).toISOString();
        body.demarcationDate = datePart!;
        body.demarcationTime = timePart.slice(0, 5) || '12:00';
        if (!noticeFile) {
          throw Object.assign(new Error('notice'), {
            friendlyMessage: t('noticeFileRequired'),
          });
        }
        return postTransition(detail.id, body, { notice: noticeFile });
      }
      if (toStage === 'OBJECTION_CLOSED') {
        if (!objectionReason.trim()) {
          throw Object.assign(new Error('objection'), {
            friendlyMessage: t('objectionRequired'),
          });
        }
        body.objectionReason = objectionReason.trim();
      }
      if (note.trim() && toStage !== 'HEARING_SCHEDULED') {
        body.note = note.trim();
      }

      if (toStage === 'REPORT_SUBMITTED') {
        const demYmd = detail.demarcationDate?.slice(0, 10);
        const todayIst = new Date().toLocaleDateString('en-CA', {
          timeZone: 'Asia/Kolkata',
        });
        if (demYmd && todayIst < demYmd) {
          throw Object.assign(new Error('report'), {
            friendlyMessage: t('reportUploadBeforeDemarcation'),
          });
        }
        if (!reportFile) {
          throw Object.assign(new Error('report'), {
            friendlyMessage: t('reportRequired'),
          });
        }
        return postTransition(detail.id, body, { report: reportFile });
      }
      return postTransition(detail.id, body);
    },
    onSuccess: async (updated) => {
      setError(null);
      setNote('');
      setObjectionReason('');
      setReportFile(null);
      setNoticeFile(null);
      setNeighbors([emptyNeighbor()]);
      setDemarcationAt('');
      queryClient.setQueryData(queryKeys.case(detail.id), updated);
      await invalidate();
    },
    onError: (err: { friendlyMessage?: string; message?: string }) => {
      setError(err.friendlyMessage ?? err.message ?? t('transitionFailed'));
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: async () => {
      if (!rescheduleAt) {
        throw Object.assign(new Error('date'), {
          friendlyMessage: t('rescheduleAt'),
        });
      }
      if (!rescheduleReason.trim()) {
        throw Object.assign(new Error('reason'), {
          friendlyMessage: t('rescheduleReasonRequired'),
        });
      }
      const [datePart, timePart = '12:00'] = rescheduleAt.split('T');
      const currentYmd = detail.demarcationDate?.slice(0, 10);
      if (currentYmd) {
        const currentTime = (detail.demarcationTime ?? '12:00').slice(0, 5);
        const nextStamp = `${datePart}T${(timePart.slice(0, 5) || '12:00')}`;
        const prevStamp = `${currentYmd}T${currentTime}`;
        if (nextStamp <= prevStamp) {
          throw Object.assign(new Error('date'), {
            friendlyMessage: t('rescheduleAfterDemarcation'),
          });
        }
      }
      const data = await apiPost<ApiSuccess<CaseDetail>>(
        `/api/v1/cases/${detail.id}/reschedule`,
        {
          demarcationDate: datePart,
          demarcationTime: timePart.slice(0, 5) || '12:00',
          reason: rescheduleReason.trim(),
        }
      );
      return data.data;
    },
    onSuccess: async (updated) => {
      setError(null);
      setRescheduleAt('');
      setRescheduleReason('');
      queryClient.setQueryData(queryKeys.case(detail.id), updated);
      await invalidate();
    },
    onError: (err: { friendlyMessage?: string; message?: string }) => {
      setError(err.friendlyMessage ?? err.message ?? t('transitionFailed'));
    },
  });

  if (riWorkDone) return <RiWorkDonePanel />;
  if (mode === 'admin' || next.length === 0) return null;

  function labelFor(stage: string): string {
    const key = ACTION_KEY[stage];
    return key ? t(key) : stageLabel(locale, stage);
  }

  const plainStages = next.filter((s) => !FIELD_OWNED.has(s));
  const demarcationYmd = detail.demarcationDate
    ? detail.demarcationDate.slice(0, 10)
    : '';
  const filedYmd = detail.filedAt?.slice(0, 10) ?? '';
  const earliestNoticeDay = filedYmd || undefined;
  const earliestDemarcationDay = issueDate
    ? `${issueDate}T00:00`
    : earliestNoticeDay
      ? `${earliestNoticeDay}T00:00`
      : undefined;
  const earliestRescheduleAt = (() => {
    if (!demarcationYmd) return undefined;
    const time = (detail.demarcationTime ?? '12:00').slice(0, 5);
    const [h, m] = time.split(':').map(Number);
    const d = new Date(
      `${demarcationYmd}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`,
    );
    d.setUTCMinutes(d.getUTCMinutes() + 1);
    return d.toISOString().slice(0, 16);
  })();
  const reportUploadOpen = (() => {
    if (!demarcationYmd) return true;
    const todayIst = new Date().toLocaleDateString('en-CA', {
      timeZone: 'Asia/Kolkata',
    });
    return todayIst >= demarcationYmd;
  })();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('advanceCase')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ErrorNote>{error}</ErrorNote>

        {detail.alertStatus === 'OVERDUE' ? (
          <p className="border border-sla-overdue/40 bg-sla-overdue/10 px-3 py-2 text-sm text-sla-overdue">
            {t('alertOverdue')}
            {detail.reportDueAt
              ? ` · ${t('reportDue')} ${formatDate(locale, detail.reportDueAt)}`
              : ''}
          </p>
        ) : null}

        {next.includes('MEMO_ISSUED') ? (
          <ActionBlock
            label={labelFor('MEMO_ISSUED')}
            pending={mutation.isPending}
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate('MEMO_ISSUED');
            }}
          >
            <Field label={t('assignStaff')}>
              <Select
                required
                value={assignedStaffId}
                onChange={(e) => setAssignedStaffId(e.target.value)}
              >
                <option value="">—</option>
                {staffOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({t(s.role)}) — {s.email}
                  </option>
                ))}
              </Select>
            </Field>
          </ActionBlock>
        ) : null}

        {next.includes('HEARING_SCHEDULED') ? (
          <ActionBlock
            label={labelFor('HEARING_SCHEDULED')}
            pending={mutation.isPending}
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate('HEARING_SCHEDULED');
            }}
          >
            <section className="grid gap-3 border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{t('neighbors')}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onPress={() =>
                    setNeighbors((rows) => [...rows, emptyNeighbor()])
                  }
                >
                  <PlusIcon />
                  {t('addNeighbor')}
                </Button>
              </div>
              {neighbors.map((row, index) => (
                <div
                  key={index}
                  className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
                >
                  <Field label={t('neighborName')}>
                    <Input
                      required
                      value={row.ownerName}
                      onChange={(e) =>
                        setNeighbors((rows) =>
                          rows.map((r, i) =>
                            i === index
                              ? { ...r, ownerName: e.target.value }
                              : r
                          )
                        )
                      }
                    />
                  </Field>
                  <Field label={t('neighborAddress')}>
                    <Textarea
                      required
                      rows={1}
                      value={row.address}
                      onChange={(e) =>
                        setNeighbors((rows) =>
                          rows.map((r, i) =>
                            i === index ? { ...r, address: e.target.value } : r
                          )
                        )
                      }
                    />
                  </Field>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="self-end"
                    aria-label={`Remove neighbor ${index + 1}`}
                    isDisabled={neighbors.length === 1}
                    onPress={() =>
                      setNeighbors((rows) => rows.filter((_, i) => i !== index))
                    }
                  >
                    <XIcon />
                  </Button>
                </div>
              ))}
            </section>
            <Field label={t('noticeDate')} className="sm:max-w-md">
              <Input
                required
                type="date"
                min={earliestNoticeDay}
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </Field>
            <Field label={t('demarcationAt')} className="sm:max-w-md">
              <Input
                required
                type="datetime-local"
                min={earliestDemarcationDay}
                value={demarcationAt}
                onChange={(e) => setDemarcationAt(e.target.value)}
              />
            </Field>
            {/* <div className="flex flex-col gap-1.5 sm:max-w-md">
              <p className="text-xs text-muted-foreground">
                {t('generateNoticeHint')}
              </p>
              <Button
                type="button"
                variant="outline"
                isDisabled={previewBusy || mutation.isPending}
                onPress={() => void downloadNoticeDraft()}
                className="w-fit"
              >
                {previewBusy ? t('generatingNotice') : t('generateNoticeDraft')}
              </Button>
            </div> */}
            <Field label={t('noticeFile')} className="sm:max-w-md">
              <FileInput
                accept=".pdf,.jpeg,.jpg,.png,application/pdf,image/jpeg,image/png"
                required
                onChange={(e) => setNoticeFile(e.target.files?.[0] ?? null)}
              />
            </Field>
          </ActionBlock>
        ) : null}

        {next.includes('OBJECTION_CLOSED') ? (
          <ActionBlock
            label={labelFor('OBJECTION_CLOSED')}
            pending={mutation.isPending}
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate('OBJECTION_CLOSED');
            }}
          >
            <Field label={t('objectionReason')}>
              <Input
                required
                value={objectionReason}
                onChange={(e) => setObjectionReason(e.target.value)}
              />
            </Field>
          </ActionBlock>
        ) : null}

        {next.includes('REPORT_SUBMITTED') ||
        detail.stage === 'HEARING_SCHEDULED' ? (
          <>
            {detail.stage === 'HEARING_SCHEDULED' ||
            next.includes('REPORT_SUBMITTED') ? (
              <ReportCountdown dueAt={detail.reportDueAt} />
            ) : null}
            {detail.superiorAlert ? (
              <p className="border border-sla-overdue/40 bg-sla-overdue/10 px-3 py-2 text-sm text-sla-overdue">
                {t('superiorAlertRaised')}
              </p>
            ) : null}
            {next.includes('REPORT_SUBMITTED') ? (
              <ActionBlock
                label={labelFor('REPORT_SUBMITTED')}
                pending={mutation.isPending}
                submitDisabled={!reportUploadOpen}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!reportUploadOpen) {
                    setError(t('reportUploadBeforeDemarcation'));
                    return;
                  }
                  mutation.mutate('REPORT_SUBMITTED');
                }}
              >
                <Field label={t('reportFile')} className="sm:max-w-md">
                  <FileInput
                    accept=".pdf,.jpeg,.jpg,.png,application/pdf,image/jpeg,image/png"
                    required
                    disabled={!reportUploadOpen}
                    onChange={(e) =>
                      setReportFile(e.target.files?.[0] ?? null)
                    }
                  />
                </Field>
                {!reportUploadOpen ? (
                  <p className="text-xs text-muted-foreground">
                    {t('reportUploadBeforeDemarcation')}
                  </p>
                ) : null}
                {detail.alertStatus === 'OVERDUE' ? (
                  <p className="text-xs text-sla-overdue">
                    {t('reportUploadOverdueHint')}
                  </p>
                ) : null}
              </ActionBlock>
            ) : null}
            {detail.stage === 'HEARING_SCHEDULED' ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  rescheduleMutation.mutate();
                }}
                className="flex flex-col gap-3 rounded-none border border-border bg-muted/30 p-3"
              >
                <Field
                  label={t('rescheduleAt')}
                  hint={
                    demarcationYmd
                      ? `${t('currentDemarcation')}: ${demarcationYmd}${
                          detail.demarcationTime
                            ? ` · ${detail.demarcationTime}`
                            : ''
                        }`
                      : undefined
                  }
                  className="sm:max-w-md"
                >
                  <Input
                    type="datetime-local"
                    required
                    min={earliestRescheduleAt}
                    value={rescheduleAt}
                    onChange={(e) => setRescheduleAt(e.target.value)}
                  />
                </Field>
                <Field label={t('rescheduleReason')}>
                  <Input
                    required
                    value={rescheduleReason}
                    onChange={(e) => setRescheduleReason(e.target.value)}
                    placeholder={t('rescheduleReasonPlaceholder')}
                  />
                </Field>
                {detail.alertStatus === 'OVERDUE' ? (
                  <p className="text-xs text-sla-overdue">
                    {t('rescheduleAfterOverdueHint')}
                  </p>
                ) : null}
                <Button
                  type="submit"
                  variant="outline"
                  isDisabled={rescheduleMutation.isPending}
                  className="w-fit"
                >
                  {t('action.demarcationNo')}
                </Button>
              </form>
            ) : null}
          </>
        ) : null}

        {/* Legacy mid-pipeline drain */}
        {next.includes('DEMARCATION_DONE') ? (
          <ActionBlock
            label={labelFor('DEMARCATION_DONE')}
            pending={mutation.isPending}
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate('DEMARCATION_DONE');
            }}
          />
        ) : null}

        {plainStages.map((stage) => (
          <ActionBlock
            key={stage}
            label={labelFor(stage)}
            pending={mutation.isPending}
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate(stage);
            }}
          >
            <Field label={`${t('noteOptional')} (${t('optional')})`}>
              <Input value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          </ActionBlock>
        ))}
      </CardContent>
    </Card>
  );
}
