'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';

import { AppShell } from '@/components/app-shell';
import { DataTable } from '@/components/data-table/data-table';
import type { DataTableFeatures } from '@/components/data-table/features';
import { RoleGate } from '@/components/role-gate';
import {
  listQuery,
  useServerTableState,
} from '@/hooks/use-server-table-state';
import { useLocale } from '@/hooks/use-locale';
import { useMe } from '@/hooks/use-me';
import { apiGet } from '@/lib/api';
import {
  formatDateTime,
  stageLabel,
  type MessageKey,
} from '@/lib/i18n';
import type { PaginationMeta } from '@/lib/page-size';
import { queryKeys } from '@/lib/query-keys';

interface TransitionLogItem {
  id: string;
  caseId: string;
  tehsilId: string;
  fromStage: string;
  toStage: string;
  actorUserId: string;
  actorRole: string;
  note: string | null;
  createdAt: string;
}

interface PaginatedAudit {
  success: boolean;
  data: TransitionLogItem[];
  meta?: { pagination: PaginationMeta };
}

const columnHelper = createColumnHelper<DataTableFeatures, TransitionLogItem>();

function AdminAudit() {
  const { data: me } = useMe();
  const { locale, t } = useLocale();
  const {
    search,
    setSearch,
    debouncedSearch,
    pagination,
    onPaginationChange,
    page,
    limit,
  } = useServerTableState();

  const auditQuery = useQuery({
    queryKey: [
      ...queryKeys.cases,
      'audit',
      { q: debouncedSearch, page, limit },
    ] as const,
    queryFn: async () => {
      const res = await apiGet<PaginatedAudit>(
        `/api/v1/admin/audit/transitions${listQuery({
          page,
          limit,
          q: debouncedSearch,
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
        columnHelper.accessor('createdAt', {
          header: t('when'),
          cell: ({ getValue }) => (
            <span className="tnum whitespace-nowrap text-muted-foreground">
              {formatDateTime(locale, getValue())}
            </span>
          ),
        }),
        columnHelper.accessor('caseId', {
          header: t('case'),
          cell: ({ getValue }) => {
            const id = getValue();
            return (
              <Link
                href={`/admin/cases/${id}`}
                className="rounded-none font-mono text-xs text-ring underline underline-offset-3 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
              >
                {id.slice(0, 8)}…
              </Link>
            );
          },
        }),
        columnHelper.display({
          id: 'transition',
          header: t('transition'),
          cell: ({ row }) => (
            <span className="whitespace-nowrap">
              <span className="text-muted-foreground">
                {stageLabel(locale, row.original.fromStage)}
              </span>
              <span className="mx-1.5 text-muted-foreground">→</span>
              <span className="font-medium">
                {stageLabel(locale, row.original.toStage)}
              </span>
            </span>
          ),
        }),
        columnHelper.accessor('actorRole', {
          header: t('actor'),
          cell: ({ getValue }) => t(getValue() as MessageKey),
        }),
        columnHelper.accessor('note', {
          header: t('note'),
          cell: ({ getValue }) => (
            <span className="text-muted-foreground">{getValue() || '—'}</span>
          ),
        }),
      ]),
    [locale, t],
  );

  if (!me) return null;

  const rows = auditQuery.data?.rows ?? [];
  const meta = auditQuery.data?.pagination;

  return (
    <AppShell me={me} title={t('auditLog')}>
      <DataTable
        columns={columns}
        data={rows}
        pageCount={meta?.totalPages ?? 0}
        rowCount={meta?.total ?? 0}
        pagination={pagination}
        onPaginationChange={onPaginationChange}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('searchAudit')}
        isLoading={auditQuery.isLoading}
        emptyTitle={t('noAudit')}
      />
    </AppShell>
  );
}

export default function AdminAuditPage() {
  return (
    <RoleGate allow={['admin']}>
      <AdminAudit />
    </RoleGate>
  );
}
