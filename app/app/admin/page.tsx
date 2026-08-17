'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type ChangeEvent } from 'react';
import {
  ArrowClockwiseIcon,
  DownloadSimpleIcon,
  EyeIcon,
  PlusIcon,
  TrashIcon,
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
import { Field, Input, Select } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import {
  Table,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/components/ui/table';
import { listQuery, useServerTableState } from '@/hooks/use-server-table-state';
import { useMe } from '@/hooks/use-me';
import { useLocale } from '@/hooks/use-locale';
import { api, apiDelete, apiGet, apiPost } from '@/lib/api';
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

interface CreatedStaff {
  userId: string;
  email: string;
  name: string;
  role: string;
  tehsilId: string;
  password: string;
  warnings: string[];
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

type StaffCreateRole = 'tehsildar' | 'ri' | 'patwari';

const columnHelper = createColumnHelper<DataTableFeatures, StaffRow>();

function isDeletableStaff(role: string) {
  return role === 'tehsildar' || role === 'ri' || role === 'patwari';
}

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
        'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-none border px-2.5 text-xs font-medium uppercase tracking-wider transition-colors ' +
        (variant === 'default'
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
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    role: 'tehsildar' as StaffCreateRole,
    tehsil: '',
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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
    queryKey: [
      ...queryKeys.staff,
      { q: debouncedSearch, page, limit },
    ] as const,
    queryFn: async () => {
      const res = await apiGet<PaginatedStaff>(
        `/api/v1/admin/staff${listQuery({ q: debouncedSearch, page, limit })}`
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
      role: 'tehsildars' | 'ris' | 'patwaris';
      file: File;
    }) => {
      const body = new FormData();
      body.append('file', file);
      const { data } = await api.post<ApiSuccess<ImportResult>>(
        `/api/v1/admin/staff/import/${role}`,
        body,
        { headers: { 'Content-Type': undefined } }
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

  const createMutation = useMutation({
    mutationFn: async (body: typeof addForm) => {
      const res = await apiPost<ApiSuccess<CreatedStaff>>(
        '/api/v1/admin/staff',
        body
      );
      return res.data;
    },
    onSuccess: (created) => {
      setAddOpen(false);
      setAddForm({ name: '', email: '', role: 'tehsildar', tehsil: '' });
      setError(null);
      setCopied(false);
      setPasswordModal({ email: created.email, password: created.password });
      void queryClient.invalidateQueries({ queryKey: queryKeys.staff });
    },
    onError: (err: { friendlyMessage?: string }) => {
      setError(err.friendlyMessage ?? t('importFailed'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      const res = await apiDelete<
        ApiSuccess<{ deleted: number; skipped: unknown[] }>
      >('/api/v1/admin/staff', { userIds });
      return res.data;
    },
    onSuccess: () => {
      setSelectedIds(new Set());
      setError(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.staff });
    },
    onError: (err: { friendlyMessage?: string }) => {
      setError(err.friendlyMessage ?? t('deleteStaffFailed'));
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
        `/api/v1/admin/staff/${userId}/password`
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

  function toggleSelected(id: string, role: string) {
    if (!isDeletableStaff(role)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllOnPage(rows: StaffRow[]) {
    const deletable = rows.filter((r) => isDeletableStaff(r.role));
    const allSelected =
      deletable.length > 0 && deletable.every((r) => selectedIds.has(r.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const r of deletable) next.delete(r.id);
      } else {
        for (const r of deletable) next.add(r.id);
      }
      return next;
    });
  }

  const rows = staffQuery.data?.rows ?? [];
  const meta = staffQuery.data?.pagination;
  const pageDeletable = rows.filter((r) => isDeletableStaff(r.role));
  const allPageSelected =
    pageDeletable.length > 0 &&
    pageDeletable.every((r) => selectedIds.has(r.id));

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.display({
          id: 'select',
          header: () => (
            <input
              type="checkbox"
              aria-label={t('selectStaff')}
              checked={allPageSelected}
              disabled={pageDeletable.length === 0}
              onChange={() => toggleAllOnPage(rows)}
            />
          ),
          cell: ({ row }) => {
            const deletable = isDeletableStaff(row.original.role);
            return (
              <input
                type="checkbox"
                aria-label={t('selectStaff')}
                disabled={!deletable}
                checked={selectedIds.has(row.original.id)}
                onChange={() =>
                  toggleSelected(row.original.id, row.original.role)
                }
                onClick={(e) => e.stopPropagation()}
              />
            );
          },
        }),
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
          cell: ({ getValue }) => <Badge>{t(getValue() as MessageKey)}</Badge>,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selection + page rows drive checkbox column
    [t, selectedIds, allPageSelected, rows, pageDeletable.length]
  );

  if (!me) return null;

  function onFile(
    role: 'tehsildars' | 'ris' | 'patwaris',
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    importMutation.mutate({ role, file });
  }

  async function downloadBlob(path: string, filename: string) {
    setError(null);
    try {
      const res = await api.get(path, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(failMessage(err, 'downloadFailed'));
    }
  }

  function saveDownload(filename: string, blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** One API → three role template files (tehsildar, ri, patwari). */
  async function downloadImportTemplates(format: 'csv' | 'xlsx') {
    setError(null);
    try {
      const res = await apiGet<
        ApiSuccess<{
          format: string;
          files: Array<{
            filename: string;
            content: string;
            encoding: 'utf8' | 'base64';
          }>;
        }>
      >(`/api/v1/admin/staff/import-templates?format=${format}`);
      const files = res.data?.files ?? [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i]!;
        const blob =
          file.encoding === 'base64'
            ? new Blob(
                [Uint8Array.from(atob(file.content), (c) => c.charCodeAt(0))],
                {
                  type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                }
              )
            : new Blob([file.content], {
                type: 'text/csv;charset=utf-8',
              });
        saveDownload(file.filename, blob);
        // brief gap so the browser doesn't coalesce / block multi-download
        if (i < files.length - 1) {
          await new Promise((r) => setTimeout(r, 250));
        }
      }
    } catch (err) {
      setError(failMessage(err, 'downloadFailed'));
    }
  }

  function onDeleteSelected() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    if (
      !window.confirm(t('deleteStaffConfirm', { n: ids.length }))
    ) {
      return;
    }
    deleteMutation.mutate(ids);
  }

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
          <Button
            type="button"
            variant="outline"
            onPress={() =>
              downloadBlob(
                '/api/v1/admin/staff/credentials.csv',
                'staff-credentials.csv'
              )
            }
          >
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
            <Button
              type="button"
              variant="outline"
              onPress={() => void downloadImportTemplates('csv')}
            >
              <DownloadSimpleIcon size={14} />
              {t('downloadTemplate')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onPress={() => void downloadImportTemplates('xlsx')}
            >
              <DownloadSimpleIcon size={14} />
              {t('downloadTemplateXlsx')}
            </Button>
            <Button type="button" onPress={() => setAddOpen(true)}>
              <PlusIcon size={14} />
              {t('addStaff')}
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
            <UploadButton
              label={t('uploadPatwaris')}
              variant="outline"
              onFile={(e) => onFile('patwaris', e)}
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-xl tracking-tight">{t('staff')}</h2>
          <Button
            type="button"
            variant="outline"
            isDisabled={selectedIds.size === 0 || deleteMutation.isPending}
            onPress={onDeleteSelected}
          >
            <TrashIcon size={14} />
            {t('deleteSelected')}
            {selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
          </Button>
        </div>
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
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={t('addStaffTitle')}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onPress={() => setAddOpen(false)}
            >
              {t('close')}
            </Button>
            <Button
              type="button"
              isDisabled={
                createMutation.isPending ||
                !addForm.name.trim() ||
                !addForm.email.trim() ||
                !addForm.tehsil.trim()
              }
              onPress={() => createMutation.mutate(addForm)}
            >
              {createMutation.isPending
                ? t('creatingStaff')
                : t('addStaffSubmit')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Field label={t('name')}>
            <Input
              value={addForm.name}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, name: e.target.value }))
              }
              autoComplete="off"
            />
          </Field>
          <Field label={t('email')}>
            <Input
              type="email"
              value={addForm.email}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, email: e.target.value }))
              }
              autoComplete="off"
            />
          </Field>
          <Field label={t('role')}>
            <Select
              value={addForm.role}
              onChange={(e) =>
                setAddForm((f) => ({
                  ...f,
                  role: e.target.value as StaffCreateRole,
                }))
              }
            >
              <option value="tehsildar">{t('tehsildar')}</option>
              <option value="ri">{t('ri')}</option>
              <option value="patwari">{t('patwari')}</option>
            </Select>
          </Field>
          <Field label={t('tehsilName')}>
            <Input
              value={addForm.tehsil}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, tehsil: e.target.value }))
              }
              autoComplete="off"
            />
          </Field>
        </div>
      </Modal>

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
