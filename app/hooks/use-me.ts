'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchMe } from '@/lib/auth-client';
import { queryKeys } from '@/lib/query-keys';

export function useMe() {
  return useQuery({
    queryKey: queryKeys.session,
    queryFn: fetchMe,
    retry: false,
    staleTime: 30_000,
  });
}
