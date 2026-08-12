'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlusIcon, XIcon } from '@phosphor-icons/react';

import { AppShell } from '@/components/app-shell';
import { CaseLifecycleTimeline } from '@/components/cases/case-lifecycle-timeline';
import { CaseTable } from '@/components/cases/case-table';
import { RoleGate } from '@/components/role-gate';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorNote, TableSkeleton } from '@/components/ui/feedback';
import { Field, FileInput, Input, Textarea } from '@/components/ui/field';
import { ToggleChip } from '@/components/ui/toggle-chip';
import { useMe } from '@/hooks/use-me';
import { useLocale } from '@/hooks/use-locale';
import { api, apiGet } from '@/lib/api';
import type { ApiSuccess, CaseListItem, PaginatedCases } from '@/lib/cases';
import { queryKeys } from '@/lib/query-keys';

function TehsildarHome() {
  const { data: me } = useMe();
  const { t } = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [applicantName, setApplicantName] = useState('');
  const [applicantContact, setApplicantContact] = useState('');
  const [village, setVillage] = useState('');
  const [khasrasText, setKhasrasText] = useState('');
  const [challanReference, setChallanReference] = useState('');
  const [filedAt, setFiledAt] = useState('');
  const [mapFile, setMapFile] = useState<File | null>(null);
  const [challanFile, setChallanFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [overdueOnly, setOverdueOnly] = useState(false);

  const casesQuery = useQuery({
    queryKey: [...queryKeys.cases, { overdueOnly }] as const,
    queryFn: async () => {
      const q = overdueOnly
        ? '/api/v1/cases?limit=50&overdue=true'
        : '/api/v1/cases?limit=50';
      const res = await apiGet<PaginatedCases>(q);
      return res.data;
    },
  });

  const khasraCount = useMemo(
    () =>
      khasrasText
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean).length,
    [khasrasText],
  );

  const createMutation = useMutation({
    mutationFn: async () => {
      const body = new FormData();
      body.append('applicantName', applicantName.trim());
      if (applicantContact.trim()) {
        body.append('applicantContact', applicantContact.trim());
      }
      body.append('village', village.trim());
      body.append('khasras', khasrasText);
      body.append('challanReference', challanReference.trim());
      if (filedAt) {
        body.append('filedAt', new Date(filedAt).toISOString());
      }
      if (mapFile) body.append('map', mapFile);
      if (challanFile) body.append('challan', challanFile);
      const { data } = await api.post<ApiSuccess<CaseListItem>>(
        '/api/v1/cases',
        body,
        { headers: { 'Content-Type': undefined } },
      );
      return data.data;
    },
    onSuccess: (created) => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.cases });
      router.push(`/tehsildar/cases/${created.id}`);
    },
    onError: (err: { friendlyMessage?: string }) => {
      setError(err.friendlyMessage ?? t('createCaseFailed'));
    },
  });

  if (!me) return null;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    createMutation.mutate();
  }

  const cases = casesQuery.data ?? [];
  const newCaseButton = (
    <Button type="button" onPress={() => setShowForm((v) => !v)}>
      {showForm ? <XIcon size={14} /> : <PlusIcon size={14} />}
      {showForm ? t('hideForm') : t('newCase')}
    </Button>
  );

  return (
    <AppShell
      me={me}
      title={t('navCases')}
      description={
        casesQuery.isLoading
          ? undefined
          : cases.length === 1
            ? t('caseCountOne')
            : t('caseCount', { n: cases.length })
      }
      actions={newCaseButton}
    >
      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('newCase')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
              <Field label={t('applicantName')}>
                <Input
                  required
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                />
              </Field>
              <Field label={`${t('contactOptional')} (${t('optional')})`}>
                <Input
                  value={applicantContact}
                  onChange={(e) => setApplicantContact(e.target.value)}
                />
              </Field>
              <Field label={t('village')}>
                <Input
                  required
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                />
              </Field>
              <Field label={t('challanRef')}>
                <Input
                  required
                  value={challanReference}
                  onChange={(e) => setChallanReference(e.target.value)}
                />
              </Field>

              <Field
                label={t('khasras')}
                hint={t('khasrasHint')}
                className="sm:col-span-2"
              >
                <Textarea
                  required
                  rows={3}
                  value={khasrasText}
                  onChange={(e) => setKhasrasText(e.target.value)}
                  placeholder={t('khasrasPlaceholder')}
                />
              </Field>

              {khasraCount > 0 ? (
                <p className="tnum -mt-2 text-sm text-muted-foreground sm:col-span-2">
                  {t('feeFor', { n: khasraCount })}:{' '}
                  <strong className="font-semibold text-foreground">
                    ₹{khasraCount * 50}
                  </strong>
                </p>
              ) : null}

              <Field label={`${t('filedAt')} (${t('optional')})`}>
                <Input
                  type="datetime-local"
                  value={filedAt}
                  onChange={(e) => setFiledAt(e.target.value)}
                />
              </Field>
              <div />
              <Field label={`${t('mapFile')} (${t('optional')})`}>
                <FileInput
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => setMapFile(e.target.files?.[0] ?? null)}
                />
              </Field>
              <Field label={`${t('challanFile')} (${t('optional')})`}>
                <FileInput
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => setChallanFile(e.target.files?.[0] ?? null)}
                />
              </Field>

              <div className="sm:col-span-2">
                <ErrorNote>{error}</ErrorNote>
              </div>
              <div className="sm:col-span-2">
                <Button
                  type="submit"
                  size="lg"
                  isDisabled={createMutation.isPending}
                >
                  {createMutation.isPending
                    ? t('creatingCase')
                    : t('createCase')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <ToggleChip pressed={overdueOnly} onPressedChange={setOverdueOnly}>
          {t('overdueOnly')}
        </ToggleChip>
      </div>

      {casesQuery.isLoading ? (
        <TableSkeleton cols={6} />
      ) : (
        <CaseTable
          cases={cases}
          detailBase="/tehsildar/cases"
          overdueOnly={overdueOnly}
          emptyAction={newCaseButton}
        />
      )}
      <CaseLifecycleTimeline />
    </AppShell>
  );
}

export default function TehsildarPage() {
  return (
    <RoleGate allow={['tehsildar']}>
      <TehsildarHome />
    </RoleGate>
  );
}
