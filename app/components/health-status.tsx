'use client';

import { useHealth } from '@/hooks/use-health';
import type { ApiError } from '@/lib/api';

export function HealthStatus() {
  const { data, isLoading, isError, error, refetch, isFetching } = useHealth();

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Checking API on :3001…</p>
    );
  }

  if (isError) {
    const message =
      (error as ApiError)?.friendlyMessage || 'API unreachable';
    return (
      <div className="space-y-2 text-sm">
        <p className="text-destructive">{message}</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="text-ring underline underline-offset-3 hover:text-foreground"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <p className="text-sm text-muted-foreground">
      API{' '}
      <span className="font-medium text-sla-ontrack">{data?.status}</span>
      {typeof data?.uptime === 'number' ? (
        <> · uptime {Math.floor(data.uptime)}s</>
      ) : null}
      {isFetching ? <span className="text-muted-foreground/70"> · refreshing</span> : null}
    </p>
  );
}
