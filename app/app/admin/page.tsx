'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type ChangeEvent } from 'react';
import {
  ArrowClockwiseIcon,
  DownloadSimpleIcon,
  EyeIcon,
  UploadSimpleIcon,
} from '@phosphor-icons/react';
import { createColumnHelper } from '@tanstack/react-table';

import { AppShell } from '@/components/app-shell';
import { DataTable } from '@/components/data-table/data-table';
import type { DataTableFeatures } from '@/components/data-table/features';
import { RoleGate } from '@/components/role-gate';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorNote } from '@/components/ui/feedback';
import { Modal } from '@/components/ui/modal';
import { Table, TableWrap, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import {
  listQuery,
  useServerTableState,
} from '@/hooks/use-server-table-state';
import { useMe } from '@/hooks/use-me';
import { useLocale } from '@/hooks/use-locale';
import { api, apiGet, apiPost } from '@/lib/api';
import type { MessageKey } from '@/lib/i18n';
import type { PaginationMeta } from '@/lib/page-size';
import { queryKeys } from '@/lib/query-keys';

interface StaffRow {
  id: string;
  name: string;
  email: string;
  role: string;
  tehsilId: string | null;
}

interface ImportResult {
  batchId: string;
  role: string;
  created: number;
  skipped: number;
  warnings: string[];
  rows: Array<{
    line: number;
    email: string;
    status: string;
    reason?: string;
    userId?: string;
  }>;
}

interface ApiSuccess<T> {
  success: boolean;
  data: T;
}

interface PaginatedStaff {
  success: boolean;
  data: StaffRow[];
  meta?: { pagination: PaginationMeta };
}

const columnHelper = createColumnHelper<DataTableFeatures, StaffRow>();

/** File pickers styled as buttons — the native control can't be. */
function UploadButton({
  label,
  variant = 'default',
  onFile,
}: {
  label: string;
  variant?: 'default' | 'outline';
  onFile: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label
      className={
        'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-none border px-2.5 text-xs font-medium uppercase tracking-wider transition-colors '
        + (variant === 'default'
          ? 'border-primary bg-primary text-primary-foreground hover:bg-background hover:text-foreground'
          : 'border-border bg-card text-foreground hover:border-foreground hover:bg-foreground hover:text-background')
      }
    >
      <UploadSimpleIcon size={14} />
      {label}
      <input
        type="file"
        accept=".csv,.xlsx"
        className="hidden"
        onChange={onFile}
      />
    </label>
  );
}

function AdminPanel() {
  const { data: me } = useMe();
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [lastImport, setLastImport] = useState<ImportResult | null>(null);
  const [passwordModal, setPasswordModal] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    search,
    setSearch,
    debouncedSearch,
    pagination,
    onPaginationChange,
    page,
    limit,
  } = useServerTableState();

  const staffQuery = useQuery({
    queryKey: [...queryKeys.staff, { q: debouncedSearch, page, limit }] as const,
    queryFn: async () => {
      const res = await apiGet<PaginatedStaff>(
        `/api/v1/admin/staff${listQuery({ q: debouncedSearch, page, limit })}`,
      );
      return {
        rows: res.data ?? [],
        pagination: res.meta?.pagination,
      };
    },
  });

  const importMutation = useMutation({
    mutationFn: async ({
      role,
      file,
    }: {
      role: 'tehsildars' | 'ris';
      file: File;
    }) => {
      const body = new FormData();
      body.append('file', file);
      const { data } = await api.post<ApiSuccess<ImportResult>>(
        `/api/v1/admin/staff/import/${role}`,
        body,
        { headers: { 'Content-Type': undefined } },
      );
      return data.data;
    },
    onSuccess: (result) => {
      setLastImport(result);
      setError(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.staff });
    },
    onError: (err: { friendlyMessage?: string }) => {
      setError(err.friendlyMessage ?? t('importFailed'));
    },
  });

  function failMessage(err: unknown, fallback: MessageKey) {
    return err && typeof err === 'object' && 'friendlyMessage' in err
      ? String((err as { friendlyMessage?: string }).friendlyMessage)
      : t(fallback);
  }

  async function showPassword(userId: string) {
    setError(null);
    setCopied(false);
    try {
      const res = await apiGet<ApiSuccess<{ email: string; password: string }>>(
        `/api/v1/admin/staff/${userId}/password`,
      );
      setPasswordModal(res.data);
    } catch (err) {
      setError(failMessage(err, 'passwordLoadFailed'));
    }
  }

  async function resetPassword(userId: string) {
    setError(null);
    setCopied(false);
    try {
      const res = await apiPost<
        ApiSuccess<{ email: string; password: string }>
      >(`/api/v1/admin/staff/${userId}/reset-password`);
      setPasswordModal(res.data);
    } catch (err) {
      setError(failMessage(err, 'resetFailed'));
    }
  }

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor('name', {
          header: t('name'),
          cell: ({ getValue }) => (
            <span className="font-medium">{getValue()}</span>
          ),
        }),
        columnHelper.accessor('email', {
          header: t('email'),
          cell: ({ getValue }) => (
            <span className="font-mono text-xs text-muted-foreground">
              {getValue()}
            </span>
          ),
        }),
        columnHelper.accessor('role', {
          header: t('role'),
          cell: ({ getValue }) => (
            <Badge>{t(getValue() as MessageKey)}</Badge>
          ),
        }),
        columnHelper.display({
          id: 'actions',
          header: () => <span className="block text-end">{t('actions')}</span>,
          cell: ({ row }) => (
            <div
              className="flex flex-wrap justify-end gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                onPress={() => showPassword(row.original.id)}
              >
                <EyeIcon size={13} />
                {t('showPassword')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onPress={() => resetPassword(row.original.id)}
              >
                <ArrowClockwiseIcon size={13} />
                {t('resetPassword')}
              </Button>
            </div>
          ),
        }),
      ]),
    [t],
  );

  if (!me) return null;

  function onFile(
    role: 'tehsildars' | 'ris',
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    importMutation.mutate({ role, file });
  }

  async function downloadCredentials() {
    setError(null);
    try {
      const res = await api.get('/api/v1/admin/staff/credentials.csv', {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'staff-credentials.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(failMessage(err, 'downloadFailed'));
    }
  }

  function downloadTemplate() {
    const csv =
      'name,email,tehsil\n' +
      'Example Tehsildar,tehsildar.example@district.gov,Raipur\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'staff-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const rows = staffQuery.data?.rows ?? [];
  const meta = staffQuery.data?.pagination;

  return (
    <AppShell
      me={me}
      title={t('navStaff')}
      description={t('importStaffHint')}
      actions={
        <>
          <Badge variant={me.inviteEmailEnabled ? 'primary' : 'neutral'}>
            {t('inviteEmails')}:{' '}
            {me.inviteEmailEnabled ? t('inviteOn') : t('inviteOff')}
          </Badge>
          <Button type="button" variant="outline" onPress={downloadCredentials}>
            <DownloadSimpleIcon size={14} />
            {t('downloadPasswords')}
          </Button>
        </>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>{t('importStaff')}</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onPress={downloadTemplate}>
              <DownloadSimpleIcon size={14} />
              {t('downloadTemplate')}
            </Button>
            <UploadButton
              label={t('uploadTehsildars')}
              onFile={(e) => onFile('tehsildars', e)}
            />
            <UploadButton
              label={t('uploadRis')}
              variant="outline"
              onFile={(e) => onFile('ris', e)}
            />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">{t('inviteNote')}</p>
          {importMutation.isPending ? (
            <p className="text-sm text-muted-foreground">{t('importing')}</p>
          ) : null}
          <ErrorNote>{error}</ErrorNote>
        </CardContent>
      </Card>

      {lastImport ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('lastImport')}</CardTitle>
            <p className="tnum text-sm text-muted-foreground">
              {t('importSummary', {
                role: lastImport.role,
                created: lastImport.created,
                skipped: lastImport.skipped,
              })}
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {lastImport.warnings.length > 0 ? (
              <ul className="flex flex-col gap-1 rounded-none border border-sla-duesoon/40 bg-sla-duesoon-bg px-3 py-2 text-sm text-sla-duesoon">
                {lastImport.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            ) : null}
            <TableWrap>
              <Table>
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH>{t('line')}</TH>
                    <TH>{t('email')}</TH>
                    <TH>{t('status')}</TH>
                    <TH>{t('reason')}</TH>
                  </TR>
                </THead>
                <TBody>
                  {lastImport.rows.map((row) => (
                    <TR key={`${row.line}-${row.email}`}>
                      <TD className="tnum text-muted-foreground">{row.line}</TD>
                      <TD className="font-mono text-xs">{row.email}</TD>
                      <TD>
                        <Badge
                          variant={
                            row.status === 'created' ? 'primary' : 'neutral'
                          }
                        >
                          {row.status}
                        </Badge>
                      </TD>
                      <TD className="text-muted-foreground">
                        {row.reason ?? '—'}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          </CardContent>
        </Card>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-xl tracking-tight">{t('staff')}</h2>
        <DataTable
          columns={columns}
          data={rows}
          pageCount={meta?.totalPages ?? 0}
          rowCount={meta?.total ?? 0}
          pagination={pagination}
          onPaginationChange={onPaginationChange}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={t('searchStaff')}
          isLoading={staffQuery.isLoading}
          emptyTitle={t('noStaff')}
          emptyDescription={t('noStaffHint')}
        />
      </section>

      <Modal
        open={passwordModal !== null}
        onClose={() => setPasswordModal(null)}
        title={t('tempPassword')}
        description={passwordModal?.email}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onPress={async () => {
                if (!passwordModal) return;
                await navigator.clipboard.writeText(passwordModal.password);
                setCopied(true);
              }}
            >
              {copied ? t('copied') : t('copy')}
            </Button>
            <Button type="button" onPress={() => setPasswordModal(null)}>
              {t('close')}
            </Button>
          </>
        }
      >
        <p className="break-all rounded-none border border-border bg-muted px-3 py-2.5 font-mono text-sm">
          {passwordModal?.password}
        </p>
      </Modal>
    </AppShell>
  );
}

export default function AdminPage() {
  return (
    <RoleGate allow={['admin']}>
      <AdminPanel />
    </RoleGate>
  );
}
