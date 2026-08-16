'use client';

import { useQuery } from '@tanstack/react-query';
import { use } from 'react';

import { AppShell } from '@/components/app-shell';
import { CaseDetailView } from '@/components/cases/case-detail-view';
import { CaseTransitionHistory } from '@/components/cases/case-transition-history';
import { CaseTransitions } from '@/components/cases/case-transitions';
import { RoleGate } from '@/components/role-gate';
import { useLocale } from '@/hooks/use-locale';
import { useMe } from '@/hooks/use-me';
import { apiGet } from '@/lib/api';
import type { ApiSuccess, CaseDetail } from '@/lib/cases';
import { queryKeys } from '@/lib/query-keys';

function PatwariCaseDetail({ id }: { id: string }) {
  const { data: me } = useMe();
  const { t } = useLocale();
  const detailQuery = useQuery({
    queryKey: queryKeys.case(id),
    queryFn: async () => {
      const res = await apiGet<ApiSuccess<CaseDetail>>(`/api/v1/cases/${id}`);
      return res.data;
    },
  });

  if (!me) return null;

  return (
    <AppShell me={me} title={t('caseDetail')}>
      {detailQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      ) : detailQuery.data ? (
        <div className="mx-auto max-w-3xl space-y-6">
          <CaseDetailView detail={detailQuery.data} backHref="/patwari" />
          <CaseTransitions detail={detailQuery.data} mode="patwari" />
          <CaseTransitionHistory caseId={id} />
        </div>
      ) : (
        <p className="text-sm text-destructive">Case not found</p>
      )}
    </AppShell>
  );
}

export default function PatwariCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <RoleGate allow={['patwari']}>
      <PatwariCaseDetail id={id} />
    </RoleGate>
  );
}
