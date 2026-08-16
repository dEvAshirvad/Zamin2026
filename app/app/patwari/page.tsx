'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { AppShell } from '@/components/app-shell';
import {
  CaseListFilters,
  type CaseListFilterValues,
} from '@/components/cases/case-list-filters';
import { CaseLifecycleTimeline } from '@/components/cases/case-lifecycle-timeline';
import { CaseTable } from '@/components/cases/case-table';
import { RoleGate } from '@/components/role-gate';
import { Field, Input } from '@/components/ui/field';
import { TableSkeleton } from '@/components/ui/feedback';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { listQuery } from '@/hooks/use-server-table-state';
import { useMe } from '@/hooks/use-me';
import { useLocale } from '@/hooks/use-locale';
import { apiGet } from '@/lib/api';
import type { PaginatedCases } from '@/lib/cases';
import { queryKeys } from '@/lib/query-keys';

function PatwariHome() {
  const { data: me } = useMe();
  const { t } = useLocale();
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
      'patwari',
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

  if (!me) return null;

  const cases = casesQuery.data ?? [];

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
    >
      <div className="flex flex-col gap-3">
        <Field label={t('search')} className="max-w-md">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchCases')}
          />
        </Field>
        <CaseListFilters
          stages="ri"
          value={filters}
          onChange={setFilters}
        />
      </div>

      {casesQuery.isLoading ? (
        <TableSkeleton cols={6} />
      ) : (
        <CaseTable
          cases={cases}
          detailBase="/patwari/cases"
          overdueOnly={filters.overdueOnly}
        />
      )}
      <CaseLifecycleTimeline />
    </AppShell>
  );
}

export default function PatwariPage() {
  return (
    <RoleGate allow={['patwari']}>
      <PatwariHome />
    </RoleGate>
  );
}
