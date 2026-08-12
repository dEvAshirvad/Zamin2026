'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { CaseLifecycleTimeline } from '@/components/cases/case-lifecycle-timeline';
import { CaseTable } from '@/components/cases/case-table';
import { RoleGate } from '@/components/role-gate';
import { TableSkeleton } from '@/components/ui/feedback';
import { ToggleChip } from '@/components/ui/toggle-chip';
import { useMe } from '@/hooks/use-me';
import { useLocale } from '@/hooks/use-locale';
import { apiGet } from '@/lib/api';
import type { PaginatedCases } from '@/lib/cases';
import { queryKeys } from '@/lib/query-keys';

function RiHome() {
  const { data: me } = useMe();
  const { t } = useLocale();
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
          detailBase="/ri/cases"
          overdueOnly={overdueOnly}
        />
      )}
      <CaseLifecycleTimeline />
    </AppShell>
  );
}

export default function RiPage() {
  return (
    <RoleGate allow={['ri']}>
      <RiHome />
    </RoleGate>
  );
}
