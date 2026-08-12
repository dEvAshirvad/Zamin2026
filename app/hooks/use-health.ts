'use client';

import { useQuery } from '@tanstack/react-query';

import { apiGet } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export type HealthResponse = {
  success?: boolean;
  data?: {
    status: string;
    uptime: number;
  };
  status?: string;
  uptime?: number;
};

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: async () => {
      const payload = await apiGet<HealthResponse>('/health');
      // Support both envelope and flat Respond shapes
      return {
        status: payload.data?.status ?? payload.status ?? 'unknown',
        uptime: payload.data?.uptime ?? payload.uptime ?? 0,
      };
    },
    refetchInterval: 30_000,
  });
}
