'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { CaretRightIcon } from '@phosphor-icons/react';
import { createColumnHelper } from '@tanstack/react-table';

import { AppShell } from '@/components/app-shell';
import {
  CaseListFilters,
  useTehsilMap,
  type CaseListFilterValues,
} from '@/components/cases/case-list-filters';
import { SlaBadge } from '@/components/cases/sla-badge';
import { CaseLifecycleTimeline } from '@/components/cases/case-lifecycle-timeline';
import { DataTable } from '@/components/data-table/data-table';
import type { DataTableFeatures } from '@/components/data-table/features';
import { RoleGate } from '@/components/role-gate';
import { StageChip } from '@/components/ui/badge';
import { listQuery, useServerTableState } from '@/hooks/use-server-table-state';
import { useMe } from '@/hooks/use-me';
import { useLocale } from '@/hooks/use-locale';
import { apiGet } from '@/lib/api';
import type { CaseListItem, PaginatedCases } from '@/lib/cases';
import { stageLabel } from '@/lib/i18n';
import { queryKeys } from '@/lib/query-keys';

const columnHelper = createColumnHelper<DataTableFeatures, CaseListItem>();

function AdminCases() {
  const { data: me } = useMe();
  const { locale, t } = useLocale();
  const router = useRouter();
  const [filters, setFilters] = useState<CaseListFilterValues>({
    stage: '',
    overdueOnly: false,
    tehsilId: '',
  });
  const {
    search,
    setSearch,
    debouncedSearch,
    pagination,
    onPaginationChange,
    page,
    limit,
  } = useServerTableState();

  const tehsilsQuery = useTehsilMap(true);

  const casesQuery = useQuery({
    queryKey: [
      ...queryKeys.cases,
      'admin',
      {
        overdueOnly: filters.overdueOnly,
        stage: filters.stage,
        tehsilId: filters.tehsilId,
        q: debouncedSearch,
        page,
        limit,
      },
    ] as const,
    queryFn: async () => {
      const res = await apiGet<PaginatedCases>(
        `/api/v1/cases${listQuery({
          page,
          limit,
          q: debouncedSearch,
          overdue: filters.overdueOnly || undefined,
          alert: filters.alertOverdue ? 'OVERDUE' : undefined,
          stage: filters.stage || undefined,
          tehsilId: filters.tehsilId || undefined,
        })}`,
      );
      return {
        rows: res.data ?? [],
        pagination: res.meta?.pagination,
      };
    },
  });

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor('caseNo', {
          header: t('caseNo'),
          cell: ({ row, getValue }) => (
            <Link
              href={`/admin/cases/${row.original.id}`}
              className="rounded-sm font-mono text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
              onClick={(e) => e.stopPropagation()}
            >
              {getValue()}
            </Link>
          ),
        }),
        columnHelper.accessor('applicantName', {
          header: t('applicant'),
          cell: ({ row }) => (
            <span>
              <span className="block font-medium text-foreground">
                {row.original.applicantName}
              </span>
              <span className="block text-xs text-muted-foreground">
                {t('village')} {row.original.village} ·{' '}
                {row.original.khasras.length} {t('khasras')}
              </span>
            </span>
          ),
        }),
        columnHelper.accessor('tehsilId', {
          header: t('tehsil'),
          cell: ({ getValue }) => (
            <span className="text-sm text-muted-foreground">
              {tehsilsQuery.data?.get(getValue()) ?? getValue()}
            </span>
          ),
        }),
        columnHelper.accessor('feeAmount', {
          header: () => <span className="block text-end">{t('fee')}</span>,
          cell: ({ getValue }) => (
            <span className="tnum block whitespace-nowrap text-end text-muted-foreground">
              ₹{getValue()}
            </span>
          ),
        }),
        columnHelper.accessor('stage', {
          header: t('stage'),
          cell: ({ getValue }) => (
            <StageChip>{stageLabel(locale, getValue())}</StageChip>
          ),
        }),
        columnHelper.display({
          id: 'sla',
          header: t('sla'),
          cell: ({ row }) => <SlaBadge item={row.original} />,
        }),
        columnHelper.display({
          id: 'open',
          header: () => null,
          cell: ({ row }) => (
            <span className="flex justify-end">
              <Link
                href={`/admin/cases/${row.original.id}`}
                aria-label={t('open')}
                className="inline-flex rounded-sm p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
                onClick={(e) => e.stopPropagation()}
              >
                <CaretRightIcon size={15} className="rtl:rotate-180" />
              </Link>
            </span>
          ),
        }),
      ]),
    [locale, t, tehsilsQuery.data],
  );

  if (!me) return null;

  const rows = casesQuery.data?.rows ?? [];
  const meta = casesQuery.data?.pagination;
  const total = meta?.total ?? 0;

  return (
    <AppShell
      me={me}
      title={t('allCases')}
      actions={
        <div>
          {casesQuery.isLoading
            ? undefined
            : total === 1
              ? t('caseCountOne')
              : t('caseCount', { n: total })}
        </div>
      }
    >
      <DataTable
        columns={columns}
        data={rows}
        pageCount={meta?.totalPages ?? 0}
        rowCount={total}
        pagination={pagination}
        onPaginationChange={onPaginationChange}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('searchCases')}
        isLoading={casesQuery.isLoading}
        emptyTitle={filters.overdueOnly ? t('noOverdueCases') : t('noCases')}
        emptyDescription={
          filters.overdueOnly ? t('noOverdueCasesHint') : t('noCasesHint')
        }
        onRowClick={(row) => router.push(`/admin/cases/${row.id}`)}
        toolbar={
          <CaseListFilters
            showTehsil
            value={filters}
            onChange={(next) => {
              setFilters(next);
              onPaginationChange((prev) => ({ ...prev, pageIndex: 0 }));
            }}
          />
        }
      />
      <CaseLifecycleTimeline className="mt-2" />
    </AppShell>
  );
}

export default function AdminCasesPage() {
  return (
    <RoleGate allow={['admin']}>
      <AdminCases />
    </RoleGate>
  );
}
