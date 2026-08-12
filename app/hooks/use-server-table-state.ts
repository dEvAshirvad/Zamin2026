'use client';

import { useEffect, useState } from 'react';
import type { PaginationState, Updater } from '@tanstack/react-table';

import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { PAGE_SIZE } from '@/lib/page-size';

/** Shared search + pagination state for server-driven DataTables. */
export function useServerTableState(debounceMs = 300) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, debounceMs);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });

  useEffect(() => {
    setPagination((prev) =>
      prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 },
    );
  }, [debouncedSearch]);

  function onPaginationChange(updater: Updater<PaginationState>) {
    setPagination((prev) =>
      typeof updater === 'function' ? updater(prev) : updater,
    );
  }

  return {
    search,
    setSearch,
    debouncedSearch,
    pagination,
    onPaginationChange,
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
  };
}

export function listQuery(params: Record<string, string | number | boolean | undefined | null>) {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '' || value === false) {
      continue;
    }
    sp.set(key, String(value));
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}
