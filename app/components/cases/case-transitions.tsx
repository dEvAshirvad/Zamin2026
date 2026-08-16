'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState, type ReactNode } from 'react';
import { ArrowRightIcon, CheckCircleIcon } from '@phosphor-icons/react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorNote } from '@/components/ui/feedback';
import { Field, FileInput, Input, Select } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/hooks/use-locale';
import { api, apiGet, apiPost } from '@/lib/api';
import type {
  ApiSuccess,
  CaseDetail,
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
  'OBJECTION_CLOSED',
  'DEMARCATION_WINDOW_OPEN',
  'REPORT_SUBMITTED',
]);

const RI_DONE_STAGES = new Set([
  'OBJECTION_CLOSED',
  'REPORT_SUBMITTED',
  'ORDER_ISSUED',
]);

function ActionBlock({
  label,
  onSubmit,
  pending,
  children,
}: {
  label: string;
  onSubmit: (e: FormEvent) => void;
  pending: boolean;
  children?: ReactNode;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-none border border-border bg-muted/30 p-3"
    >
      {children}
      <Button type="submit" isDisabled={pending} className="w-fit">
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
  file?: File | null,
) {
  if (file) {
    const form = new FormData();
    for (const [k, v] of Object.entries(body)) form.append(k, v);
    form.append('report', file);
    const { data } = await api.post<ApiSuccess<CaseDetail>>(
      `/api/v1/cases/${caseId}/transitions`,
      form,
      { headers: { 'Content-Type': undefined } },
    );
    return data.data;
  }
  const data = await apiPost<ApiSuccess<CaseDetail>>(
    `/api/v1/cases/${caseId}/transitions`,
    body,
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
  const [assignedRiId, setAssignedRiId] = useState('');
  const [assignedPatwariId, setAssignedPatwariId] = useState('');
  const [objectionReason, setObjectionReason] = useState('');
  const [rescheduleAt, setRescheduleAt] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [reportFile, setReportFile] = useState<File | null>(null);
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
      const res = await apiGet<ApiSuccess<TehsilRi[]>>('/api/v1/tehsils/me/ris');
      return res.data;
    },
    enabled: staffEnabled,
  });
  const patwarisQuery = useQuery({
    queryKey: ['tehsil-patwaris'] as const,
    queryFn: async () => {
      const res = await apiGet<ApiSuccess<TehsilPatwari[]>>(
        '/api/v1/tehsils/me/patwaris',
      );
      return res.data;
    },
    enabled: staffEnabled,
  });

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.case(detail.id) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.cases });
    await queryClient.invalidateQueries({
      queryKey: ['cases', detail.id, 'transitions'],
    });
  }

  const mutation = useMutation({
    mutationFn: async (toStage: string) => {
      const body: Record<string, string> = { toStage };
      if (toStage === 'MEMO_ISSUED') {
        if (!assignedRiId || !assignedPatwariId) {
          throw Object.assign(new Error('assign'), {
            friendlyMessage: t('assignBothRequired'),
          });
        }
        body.assignedRiId = assignedRiId;
        body.assignedPatwariId = assignedPatwariId;
      }
      if (toStage === 'OBJECTION_CLOSED') {
        if (!objectionReason.trim()) {
          throw Object.assign(new Error('objection'), {
            friendlyMessage: t('objectionRequired'),
          });
        }
        body.objectionReason = objectionReason.trim();
      }
      if (note.trim()) body.note = note.trim();

      if (toStage === 'REPORT_SUBMITTED') {
        if (!reportFile) {
          throw Object.assign(new Error('report'), {
            friendlyMessage: t('reportRequired'),
          });
        }
        return postTransition(detail.id, body, reportFile);
      }
      return postTransition(detail.id, body);
    },
    onSuccess: async (updated) => {
      setError(null);
      setNote('');
      setObjectionReason('');
      setReportFile(null);
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
      const data = await apiPost<ApiSuccess<CaseDetail>>(
        `/api/v1/cases/${detail.id}/reschedule`,
        {
          demarcationDate: datePart,
          demarcationTime: timePart.slice(0, 5) || '12:00',
          reason: rescheduleReason.trim(),
        },
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
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('riRequired')}>
                <Select
                  required
                  value={assignedRiId}
                  onChange={(e) => setAssignedRiId(e.target.value)}
                >
                  <option value="">—</option>
                  {(risQuery.data ?? []).map((ri) => (
                    <option key={ri.id} value={ri.id}>
                      {ri.name} ({ri.email})
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t('patwariRequired')}>
                <Select
                  required
                  value={assignedPatwariId}
                  onChange={(e) => setAssignedPatwariId(e.target.value)}
                >
                  <option value="">—</option>
                  {(patwarisQuery.data ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.email})
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
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

        {next.includes('DEMARCATION_WINDOW_OPEN') ? (
          <>
            <ActionBlock
              label={labelFor('DEMARCATION_WINDOW_OPEN')}
              pending={mutation.isPending}
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate('DEMARCATION_WINDOW_OPEN');
              }}
            >
              <p className="text-xs text-muted-foreground">
                {t('demarcationOnlyToday')}
                {demarcationYmd ? ` (${demarcationYmd})` : ''}
              </p>
            </ActionBlock>
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
              <Button
                type="submit"
                variant="outline"
                isDisabled={rescheduleMutation.isPending}
                className="w-fit"
              >
                {t('action.demarcationNo')}
              </Button>
            </form>
          </>
        ) : null}

        {next.includes('REPORT_SUBMITTED') ? (
          <ActionBlock
            label={labelFor('REPORT_SUBMITTED')}
            pending={mutation.isPending}
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate('REPORT_SUBMITTED');
            }}
          >
            <Field label={t('reportFile')} className="sm:max-w-md">
              <FileInput
                accept=".pdf,application/pdf"
                required
                onChange={(e) => setReportFile(e.target.files?.[0] ?? null)}
              />
            </Field>
          </ActionBlock>
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
            {stage === 'HEARING_SCHEDULED' && demarcationYmd ? (
              <p className="text-xs text-muted-foreground">
                {t('demarcationDate')}: {demarcationYmd}
                {detail.demarcationTime ? ` · ${detail.demarcationTime}` : ''}
              </p>
            ) : null}
            <Field label={`${t('noteOptional')} (${t('optional')})`}>
              <Input value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          </ActionBlock>
        ))}
      </CardContent>
    </Card>
  );
}
