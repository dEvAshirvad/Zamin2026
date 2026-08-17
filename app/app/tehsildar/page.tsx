'use client';

import { PlusIcon, XIcon } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import {
  CaseListFilters,
  type CaseListFilterValues,
} from '@/components/cases/case-list-filters';
import { CaseLifecycleTimeline } from '@/components/cases/case-lifecycle-timeline';
import { CaseTable } from '@/components/cases/case-table';
import { RoleGate } from '@/components/role-gate';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorNote, TableSkeleton } from '@/components/ui/feedback';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useLocale } from '@/hooks/use-locale';
import { useMe } from '@/hooks/use-me';
import { listQuery } from '@/hooks/use-server-table-state';
import { api, apiGet } from '@/lib/api';
import type { MeUser } from '@/lib/auth-client';
import type {
  ApiSuccess,
  CaseListItem,
  GuardianType,
  PaginatedCases,
} from '@/lib/cases';
import { queryKeys } from '@/lib/query-keys';

interface CreateCaseInput {
  applicantName: string;
  applicantContact: string | null;
  applicantGuardianType: GuardianType;
  applicantGuardianName: string;
  applicantResidence: string;
  filedAt: string;
  officeName: string | null;
  district: string | null;
  state: string | null;
  tehsildarName: string | null;
}

function TehsildarHome() {
  const { data: me } = useMe();

  if (!me) return null;
  return <TehsildarWorkspace me={me} />;
}

function TehsildarWorkspace({ me }: { me: MeUser }) {
  const { t } = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [applicantName, setApplicantName] = useState('');
  const [applicantContact, setApplicantContact] = useState('');
  const [applicantGuardianType, setApplicantGuardianType] =
    useState<GuardianType>('पिता');
  const [applicantGuardianName, setApplicantGuardianName] = useState('');
  const [address, setAddress] = useState('');
  const [filedAt, setFiledAt] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const officeName = me.tehsil?.name ?? '';
  const district = 'रायपुर';
  const state = 'छत्तीसगढ़';
  const tehsildarName = me.name;
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CaseListFilterValues>({
    stage: '',
    overdueOnly: false,
    tehsilId: '',
  });
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const casesQuery = useQuery({
    queryKey: [
      ...queryKeys.cases,
      'tehsildar',
      { ...filters, q: debouncedSearch },
    ] as const,
    queryFn: async () => {
      const res = await apiGet<PaginatedCases>(
        `/api/v1/cases${listQuery({
          limit: 50,
          overdue: filters.overdueOnly || undefined,
          alert: filters.alertOverdue ? 'OVERDUE' : undefined,
          stage: filters.stage || undefined,
          q: debouncedSearch.trim() || undefined,
        })}`,
      );
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const body: CreateCaseInput = {
        applicantName: applicantName.trim(),
        applicantContact: applicantContact.trim() || null,
        applicantGuardianType,
        applicantGuardianName: applicantGuardianName.trim(),
        applicantResidence: address.trim(),
        filedAt: new Date(`${filedAt}T00:00:00.000Z`).toISOString(),
        officeName: officeName.trim() || null,
        district: district.trim() || null,
        state: state.trim() || null,
        tehsildarName: tehsildarName.trim() || null,
      };
      const { data } = await api.post<ApiSuccess<CaseListItem>>(
        '/api/v1/cases',
        body,
        { headers: { 'Content-Type': 'application/json' } },
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

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!address.trim()) {
      setError(t('address'));
      return;
    }
    if (!filedAt) {
      setError(t('applicationDate'));
      return;
    }
    setError(null);
    createMutation.mutate();
  }

  const cases = casesQuery.data ?? [];
  const newCaseButton = (
    <Button type="button" onPress={() => setShowForm((value) => !value)}>
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
                  onChange={(event) => setApplicantName(event.target.value)}
                />
              </Field>
              <Field label={`${t('contactOptional')} (${t('optional')})`}>
                <Input
                  value={applicantContact}
                  onChange={(event) => setApplicantContact(event.target.value)}
                />
              </Field>
              <Field label={t('guardianType')}>
                <Select
                  value={applicantGuardianType}
                  onChange={(event) =>
                    setApplicantGuardianType(
                      event.target.value as GuardianType,
                    )
                  }
                >
                  <option value="पिता">{t('father')}</option>
                  <option value="पति">{t('husband')}</option>
                </Select>
              </Field>
              <Field label={t('guardianName')}>
                <Input
                  required
                  value={applicantGuardianName}
                  onChange={(event) =>
                    setApplicantGuardianName(event.target.value)
                  }
                />
              </Field>
              <Field label={t('address')} className="sm:col-span-2">
                <Textarea
                  required
                  rows={3}
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                />
              </Field>
              <Field label={t('applicationDate')}>
                <Input
                  required
                  type="date"
                  value={filedAt}
                  onChange={(event) => setFiledAt(event.target.value)}
                />
              </Field>

              {/* Office defaults kept for PDF later — not shown at intake. */}
              <input type="hidden" name="officeName" value={officeName} />
              <input type="hidden" name="district" value={district} />
              <input type="hidden" name="state" value={state} />
              <input type="hidden" name="tehsildarName" value={tehsildarName} />

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

      <div className="flex flex-col gap-3">
        <Field label={t('search')} className="max-w-md">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('searchCases')}
          />
        </Field>
        <CaseListFilters value={filters} onChange={setFilters} />
      </div>

      {casesQuery.isLoading ? (
        <TableSkeleton cols={6} />
      ) : (
        <CaseTable
          cases={cases}
          detailBase="/tehsildar/cases"
          overdueOnly={filters.overdueOnly}
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
