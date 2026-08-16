'use client';

import { PlusIcon, XIcon } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { FormEvent, useMemo, useState } from 'react';

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

interface KhasraFormRow {
  khasraNumber: string;
  rakba: string;
}

interface NeighborFormRow {
  ownerName: string;
  address: string;
}

interface CreateCaseInput {
  applicantName: string;
  applicantContact: string | null;
  applicantGuardianType: GuardianType;
  applicantGuardianName: string;
  applicantResidence: string;
  village: string;
  khasras: { khasraNumber: string; rakba: number }[];
  neighbors: NeighborFormRow[];
  totalRakba: number;
  demarcationDate: string;
  demarcationTime: string;
  patwariHalkaNumber: string;
  officeName: string | null;
  district: string | null;
  state: string | null;
  tehsildarName: string | null;
}

const emptyKhasra = (): KhasraFormRow => ({ khasraNumber: '', rakba: '' });
const emptyNeighbor = (): NeighborFormRow => ({ ownerName: '', address: '' });

function nextUtcDate(date: string): string {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

/** Split datetime-local into stored date + HH:mm. */
function splitDemarcationAt(value: string): {
  demarcationDate: string;
  demarcationTime: string;
} {
  const [datePart, timePart = '12:00'] = value.split('T');
  const demarcationTime = timePart.slice(0, 5) || '12:00';
  return { demarcationDate: datePart!, demarcationTime };
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
  const [applicantResidence, setApplicantResidence] = useState('');
  const [village, setVillage] = useState('');
  const [khasras, setKhasras] = useState<KhasraFormRow[]>([emptyKhasra()]);
  const [neighbors, setNeighbors] = useState<NeighborFormRow[]>([
    emptyNeighbor(),
  ]);
  const [demarcationAt, setDemarcationAt] = useState('');
  const [patwariHalkaNumber, setPatwariHalkaNumber] = useState('');
  const [officeName] = useState(me.tehsil?.name ?? '');
  const [district] = useState('रायपुर');
  const [state] = useState('छत्तीसगढ़');
  const [tehsildarName] = useState(me.name);
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

  const totalRakba = useMemo(
    () =>
      khasras.reduce((total, row) => {
        const rakba = Number(row.rakba);
        return total + (Number.isFinite(rakba) ? rakba : 0);
      }, 0),
    [khasras],
  );

  const createMutation = useMutation({
    mutationFn: async () => {
      const { demarcationDate, demarcationTime }
        = splitDemarcationAt(demarcationAt);
      const body: CreateCaseInput = {
        applicantName: applicantName.trim(),
        applicantContact: applicantContact.trim() || null,
        applicantGuardianType,
        applicantGuardianName: applicantGuardianName.trim(),
        applicantResidence: applicantResidence.trim() || village.trim(),
        village: village.trim(),
        khasras: khasras.map((row) => ({
          khasraNumber: row.khasraNumber.trim(),
          rakba: Number(row.rakba),
        })),
        neighbors: neighbors.map((row) => ({
          ownerName: row.ownerName.trim(),
          address: row.address.trim(),
        })),
        totalRakba,
        demarcationDate,
        demarcationTime,
        patwariHalkaNumber: patwariHalkaNumber.trim(),
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

  const earliestDemarcationDay = nextUtcDate(
    new Date().toISOString().slice(0, 10),
  );
  const earliestDemarcationAt = `${earliestDemarcationDay}T12:00`;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!demarcationAt) {
      setError(t('demarcationAt'));
      return;
    }
    const { demarcationDate } = splitDemarcationAt(demarcationAt);
    if (demarcationDate < earliestDemarcationDay) {
      setError(t('demarcationAt'));
      return;
    }
    setError(null);
    createMutation.mutate();
  }

  function updateKhasra(index: number, patch: Partial<KhasraFormRow>) {
    setKhasras((rows) =>
      rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row,
      ),
    );
  }

  function updateNeighbor(index: number, patch: Partial<NeighborFormRow>) {
    setNeighbors((rows) =>
      rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row,
      ),
    );
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
              <Field label={t('village')}>
                <Input
                  required
                  value={village}
                  onChange={(event) => {
                    const nextVillage = event.target.value;
                    setApplicantResidence((current) =>
                      !current || current === village ? nextVillage : current,
                    );
                    setVillage(nextVillage);
                  }}
                />
              </Field>
              <Field label={t('applicantResidence')}>
                <Input
                  value={applicantResidence}
                  onChange={(event) =>
                    setApplicantResidence(event.target.value)
                  }
                />
              </Field>

              <section className="grid gap-3 border border-border p-3 sm:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{t('khasras')}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onPress={() =>
                      setKhasras((rows) => [...rows, emptyKhasra()])
                    }
                  >
                    <PlusIcon />
                    {t('addKhasra')}
                  </Button>
                </div>
                {khasras.map((row, index) => (
                  <div
                    key={index}
                    className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
                  >
                    <Field label={t('khasras')}>
                      <Input
                        required
                        value={row.khasraNumber}
                        onChange={(event) =>
                          updateKhasra(index, {
                            khasraNumber: event.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label={t('rakba')}>
                      <Input
                        required
                        type="number"
                        min="0.0001"
                        step="any"
                        value={row.rakba}
                        onChange={(event) =>
                          updateKhasra(index, { rakba: event.target.value })
                        }
                      />
                    </Field>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="self-end"
                      aria-label={`Remove khasra ${index + 1}`}
                      isDisabled={khasras.length === 1}
                      onPress={() =>
                        setKhasras((rows) =>
                          rows.filter((_, rowIndex) => rowIndex !== index),
                        )
                      }
                    >
                      <XIcon />
                    </Button>
                  </div>
                ))}
                <p className="tnum text-sm text-muted-foreground">
                  {t('totalRakba')}:{' '}
                  <strong className="font-semibold text-foreground">
                    {totalRakba}
                  </strong>
                  {' · '}
                  {t('feeFor', { n: khasras.length })}:{' '}
                  <strong className="font-semibold text-foreground">
                    ₹{khasras.length * 50}
                  </strong>
                </p>
              </section>

              <section className="grid gap-3 border border-border p-3 sm:col-span-2">
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
                        onChange={(event) =>
                          updateNeighbor(index, {
                            ownerName: event.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label={t('neighborAddress')}>
                      <Textarea
                        required
                        rows={1}
                        value={row.address}
                        onChange={(event) =>
                          updateNeighbor(index, { address: event.target.value })
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
                        setNeighbors((rows) =>
                          rows.filter((_, rowIndex) => rowIndex !== index),
                        )
                      }
                    >
                      <XIcon />
                    </Button>
                  </div>
                ))}
              </section>

              <Field label={t('demarcationAt')} className="sm:col-span-2 sm:max-w-md">
                <Input
                  required
                  type="datetime-local"
                  min={earliestDemarcationAt}
                  value={demarcationAt}
                  onChange={(event) => setDemarcationAt(event.target.value)}
                />
              </Field>
              <Field label={t('patwariHalka')}>
                <Input
                  required
                  value={patwariHalkaNumber}
                  onChange={(event) =>
                    setPatwariHalkaNumber(event.target.value)
                  }
                />
              </Field>

              <details className="border border-border p-3 sm:col-span-2">
                <summary className="cursor-pointer text-sm font-medium">
                  {t('officeDefaults')}
                </summary>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <Field label={t('signatoryOffice')}>
                    <Input value={officeName} disabled readOnly />
                  </Field>
                  <Field label={t('district')}>
                    <Input value={district} disabled readOnly />
                  </Field>
                  <Field label={t('state')}>
                    <Input value={state} disabled readOnly />
                  </Field>
                  <Field label={t('tehsildarNameField')}>
                    <Input value={tehsildarName} disabled readOnly />
                  </Field>
                </div>
              </details>

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
