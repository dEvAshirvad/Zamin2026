'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState, type ReactNode } from 'react';
import { ArrowRightIcon, CheckCircleIcon } from '@phosphor-icons/react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorNote } from '@/components/ui/feedback';
import { Field, Input, Select } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/hooks/use-locale';
import { apiGet, apiPost } from '@/lib/api';
import type { ApiSuccess, CaseDetail, TehsilRi } from '@/lib/cases';
import { stageLabel, type MessageKey } from '@/lib/i18n';
import { queryKeys } from '@/lib/query-keys';

const ACTION_KEY: Record<string, MessageKey> = {
  MEMO_ISSUED: 'action.memo',
  HEARING_SCHEDULED: 'action.notice',
  OBJECTIONS_WINDOW: 'action.objections',
  DEMARCATION_DONE: 'action.demarcation',
  ORDER_ISSUED: 'action.order',
  ECOURT_UPLOADED: 'action.ecourt',
};

/** Stages where RI pipeline is finished — tehsildar owns the next moves. */
const RI_DONE_STAGES = new Set([
  'DEMARCATION_DONE',
  'ORDER_ISSUED',
  'ECOURT_UPLOADED',
]);

/** Each allowed transition gets its own bounded block. */
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
      <CardContent className="relative min-h-36">
        <div
          className="pointer-events-none select-none space-y-3 blur-[2px] opacity-40"
          aria-hidden
        >
          <div className="rounded-none border border-border bg-muted/30 p-3">
            <div className="inline-flex h-9 items-center border border-transparent bg-primary px-4 text-xs font-medium tracking-wider text-primary-foreground uppercase">
              {t('action.objections')} →
            </div>
          </div>
          <div className="rounded-none border border-border bg-muted/30 p-3">
            <div className="inline-flex h-9 items-center border border-transparent bg-primary px-4 text-xs font-medium tracking-wider text-primary-foreground uppercase">
              {t('action.demarcation')} →
            </div>
          </div>
        </div>
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

export function CaseTransitions({
  detail,
  mode,
}: {
  detail: CaseDetail;
  mode: 'tehsildar' | 'ri' | 'admin';
}) {
  const queryClient = useQueryClient();
  const { locale, t } = useLocale();
  const [assignedRiId, setAssignedRiId] = useState('');
  const [hearingAt, setHearingAt] = useState('');
  const [ecourtReference, setEcourtReference] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const next = detail.allowedNext ?? [];
  const riWorkDone =
    mode === 'ri' &&
    (RI_DONE_STAGES.has(detail.stage) ||
      (detail.allowedNext != null && next.length === 0));

  const risQuery = useQuery({
    queryKey: ['tehsil-ris'] as const,
    queryFn: async () => {
      const res = await apiGet<ApiSuccess<TehsilRi[]>>('/api/v1/tehsils/me/ris');
      return res.data;
    },
    enabled: mode === 'tehsildar' && next.includes('MEMO_ISSUED'),
  });

  const mutation = useMutation({
    mutationFn: async (toStage: string) => {
      const body: Record<string, string> = { toStage };
      if (toStage === 'MEMO_ISSUED' && assignedRiId) {
        body.assignedRiId = assignedRiId;
      }
      if (toStage === 'HEARING_SCHEDULED') {
        if (!hearingAt) {
          throw Object.assign(new Error('hearingAt required'), {
            friendlyMessage: t('hearingRequired'),
          });
        }
        body.hearingAt = new Date(hearingAt).toISOString();
      }
      if (toStage === 'ECOURT_UPLOADED' && ecourtReference.trim()) {
        body.ecourtReference = ecourtReference.trim();
      }
      if (note.trim()) {
        body.note = note.trim();
      }
      const data = await apiPost<ApiSuccess<CaseDetail>>(
        `/api/v1/cases/${detail.id}/transitions`,
        body,
      );
      return data.data;
    },
    onSuccess: async (updated) => {
      setError(null);
      setNote('');
      setEcourtReference('');
      queryClient.setQueryData(queryKeys.case(detail.id), updated);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.case(detail.id),
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.cases });
      await queryClient.invalidateQueries({
        queryKey: ['cases', detail.id, 'transitions'],
      });
    },
    onError: (err: { friendlyMessage?: string; message?: string }) => {
      const msg = err.friendlyMessage ?? err.message ?? t('transitionFailed');
      // Stale UI after handoff: freeze panel instead of leaving dead buttons.
      if (
        mode === 'ri' &&
        /already complete|not assigned to you/i.test(msg)
      ) {
        queryClient.setQueryData(
          queryKeys.case(detail.id),
          (prev: CaseDetail | undefined) =>
            prev
              ? { ...prev, stage: 'DEMARCATION_DONE', allowedNext: [] }
              : prev,
        );
        setError(null);
        return;
      }
      setError(msg);
    },
  });

  if (riWorkDone) {
    return <RiWorkDonePanel />;
  }

  if (next.length === 0) return null;

  function labelFor(stage: string): string {
    const key = ACTION_KEY[stage];
    return key ? t(key) : stageLabel(locale, stage);
  }

  function submit(event: FormEvent, toStage: string) {
    event.preventDefault();
    mutation.mutate(toStage);
  }

  const plainStages = next.filter((s) => !(s in FIELDED_STAGES));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('advanceCase')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ErrorNote>{error}</ErrorNote>

        {next.includes('MEMO_ISSUED') ? (
          <ActionBlock
            label={labelFor('MEMO_ISSUED')}
            pending={mutation.isPending}
            onSubmit={(e) => submit(e, 'MEMO_ISSUED')}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('riOptional')} hint={t('riOptionalHint')}>
                <Select
                  value={assignedRiId}
                  onChange={(e) => setAssignedRiId(e.target.value)}
                >
                  <option value="">{t('autoAssign')}</option>
                  {(risQuery.data ?? []).map((ri) => (
                    <option key={ri.id} value={ri.id}>
                      {ri.name} ({ri.email})
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={`${t('noteOptional')} (${t('optional')})`}>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </Field>
            </div>
          </ActionBlock>
        ) : null}

        {next.includes('HEARING_SCHEDULED') ? (
          <ActionBlock
            label={labelFor('HEARING_SCHEDULED')}
            pending={mutation.isPending}
            onSubmit={(e) => submit(e, 'HEARING_SCHEDULED')}
          >
            <Field label={t('hearingDateTime')} className="sm:max-w-xs">
              <Input
                type="datetime-local"
                required
                value={hearingAt}
                onChange={(e) => setHearingAt(e.target.value)}
              />
            </Field>
          </ActionBlock>
        ) : null}

        {next.includes('ECOURT_UPLOADED') ? (
          <ActionBlock
            label={labelFor('ECOURT_UPLOADED')}
            pending={mutation.isPending}
            onSubmit={(e) => submit(e, 'ECOURT_UPLOADED')}
          >
            <Field
              label={`${t('ecourtReference')} (${t('optional')})`}
              className="sm:max-w-xs"
            >
              <Input
                value={ecourtReference}
                onChange={(e) => setEcourtReference(e.target.value)}
                placeholder={t('ecourtReferencePlaceholder')}
              />
            </Field>
          </ActionBlock>
        ) : null}

        {plainStages.map((stage) => (
          <ActionBlock
            key={stage}
            label={labelFor(stage)}
            pending={mutation.isPending}
            onSubmit={(e) => submit(e, stage)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

/** Stages that render their own input fields above. */
const FIELDED_STAGES = {
  MEMO_ISSUED: true,
  HEARING_SCHEDULED: true,
  ECOURT_UPLOADED: true,
} as const;
