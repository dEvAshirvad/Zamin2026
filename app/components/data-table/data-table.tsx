'use client';

import {
  useTable,
  type ColumnDef,
  type PaginationState,
  type RowData,
  type Updater,
} from '@tanstack/react-table';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { EmptyState, TableSkeleton } from '@/components/ui/feedback';
import {
  Table,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/components/ui/table';
import { useLocale } from '@/hooks/use-locale';
import { PAGE_SIZE } from '@/lib/page-size';
import { cn } from '@/lib/utils';

import { dataTableFeatures, type DataTableFeatures } from './features';
import { Label } from 'react-aria-components';

type DataTableProps<TData extends RowData> = {
  columns: ColumnDef<DataTableFeatures, TData, unknown>[];
  data: TData[];
  pageCount: number;
  rowCount: number;
  pagination: PaginationState;
  onPaginationChange: (updater: Updater<PaginationState>) => void;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  toolbar?: React.ReactNode;
  className?: string;
  onRowClick?: (row: TData) => void;
};

export function DataTable<TData extends RowData>({
  columns,
  data,
  pageCount,
  rowCount,
  pagination,
  onPaginationChange,
  search,
  onSearchChange,
  searchPlaceholder,
  isLoading,
  emptyTitle,
  emptyDescription,
  toolbar,
  className,
  onRowClick,
}: DataTableProps<TData>) {
  const { t } = useLocale();

  const table = useTable({
    features: dataTableFeatures,
    data,
    columns,
    manualPagination: true,
    pageCount,
    rowCount,
    state: { pagination },
    onPaginationChange,
    initialState: {
      pagination: { pageIndex: 0, pageSize: PAGE_SIZE },
    },
  });

  const page = pagination.pageIndex + 1;
  const totalPages = Math.max(1, pageCount);
  const from =
    rowCount === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1;
  const to = Math.min(
    rowCount,
    (pagination.pageIndex + 1) * pagination.pageSize
  );

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="">
          <Label>{t('search')}</Label>
          <Input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder ?? t('searchPlaceholder')}
            aria-label={t('search')}
            className="max-w-sm h-8"
          />
        </div>
        {toolbar}
      </div>

      {isLoading ? (
        <TableSkeleton cols={Math.min(columns.length, 6)} />
      ) : rowCount === 0 && data.length === 0 ? (
        <EmptyState
          title={emptyTitle ?? t('noResults')}
          description={emptyDescription}
        />
      ) : (
        <>
          <TableWrap>
            <Table>
              <THead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TR key={headerGroup.id} className="hover:bg-transparent">
                    {headerGroup.headers.map((header) => (
                      <TH key={header.id} colSpan={header.colSpan}>
                        {header.isPlaceholder ? null : (
                          <table.FlexRender header={header} />
                        )}
                      </TH>
                    ))}
                  </TR>
                ))}
              </THead>
              <TBody>
                {table.getRowModel().rows.length === 0 ? (
                  <TR className="hover:bg-transparent">
                    <TD
                      colSpan={columns.length}
                      className="h-24 text-center text-muted-foreground"
                    >
                      {t('noResults')}
                    </TD>
                  </TR>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TR
                      key={row.id}
                      className={
                        onRowClick ? 'group cursor-pointer' : undefined
                      }
                      onClick={
                        onRowClick ? () => onRowClick(row.original) : undefined
                      }
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TD key={cell.id}>
                          <table.FlexRender cell={cell} />
                        </TD>
                      ))}
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </TableWrap>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="tnum text-xs text-muted-foreground">
              {t('showingRows', { from, to, total: rowCount })}
            </p>
            <div className="flex items-center gap-2">
              <span className="tnum text-xs text-muted-foreground">
                {t('pageOf', { page, totalPages })}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onPress={() => table.previousPage()}
                isDisabled={!table.getCanPreviousPage()}
              >
                {t('previous')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onPress={() => table.nextPage()}
                isDisabled={!table.getCanNextPage()}
              >
                {t('next')}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
