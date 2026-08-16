'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { ToggleChip } from '@/components/ui/toggle-chip';
import { Select } from '@/components/ui/field';
import { useLocale } from '@/hooks/use-locale';
import { apiGet } from '@/lib/api';
import { stageLabel, STAGE_ORDER } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Label } from 'react-aria-components';

/** RI inbox only covers these stages. */
const RI_STAGE_OPTIONS = [
  'MEMO_ISSUED',
  'NOTICE_ISSUED',
  'HEARING_SCHEDULED',
  'DEMARCATION_WINDOW_OPEN',
  'DEMARCATION_DONE',
] as const;

export type TehsilOption = { id: string; name: string };

export type CaseListFilterValues = {
  stage: string;
  overdueOnly: boolean;
  tehsilId: string;
  alertOverdue?: boolean;
};

/** Shared cache: always an array (never Map) under `['tehsils']`. */
export function useTehsils(enabled = true) {
  return useQuery({
    // `v2`: prior cache sometimes held a Map under `['tehsils']`.
    queryKey: ['tehsils', 'list'] as const,
    queryFn: async () => {
      const res = await apiGet<{
        success: boolean;
        data: Array<{ id?: string; _id?: string; name?: string }>;
      }>('/api/v1/tehsils');
      return (res.data ?? [])
        .map((row) => ({
          id: String(row.id ?? row._id ?? ''),
          name: String(row.name ?? ''),
        }))
        .filter((row) => row.id) as TehsilOption[];
    },
    enabled,
    staleTime: 60_000,
  });
}

/** id → name lookup derived from the shared tehsils query. */
export function useTehsilMap(enabled = true) {
  const tehsilsQuery = useTehsils(enabled);
  const map = useMemo(() => {
    const next = new Map<string, string>();
    for (const row of tehsilsQuery.data ?? []) {
      next.set(row.id, row.name || row.id);
    }
    return next;
  }, [tehsilsQuery.data]);
  return { ...tehsilsQuery, data: map };
}

export function CaseListFilters({
  value,
  onChange,
  showTehsil = false,
  stages = 'all',
  className,
}: {
  value: CaseListFilterValues;
  onChange: (next: CaseListFilterValues) => void;
  /** Admin: tehsil dropdown. */
  showTehsil?: boolean;
  stages?: 'all' | 'ri';
  className?: string;
}) {
  const { locale, t } = useLocale();
  const stageOptions = stages === 'ri' ? RI_STAGE_OPTIONS : STAGE_ORDER;

  const tehsilsQuery = useTehsils(showTehsil);

  const dirty =
    Boolean(value.stage)
    || value.overdueOnly
    || Boolean(value.tehsilId)
    || Boolean(value.alertOverdue);

  return (
    <div className={cn('flex flex-wrap items-end gap-3', className)}>
      <div className="flex min-w-40 flex-col">
        <Label>{t('filterStage')}</Label>
        <Select
          value={value.stage}
          className="h-8"
          onChange={(e) => onChange({ ...value, stage: e.target.value })}
        >
          <option value="">{t('filterAllStages')}</option>
          {stageOptions.map((stage) => (
            <option key={stage} value={stage}>
              {stageLabel(locale, stage)}
            </option>
          ))}
        </Select>
      </div>

      {showTehsil ? (
        <div className="flex min-w-44 flex-col">
          <Label>{t('filterTehsil')}</Label>
          <Select
            value={value.tehsilId}
            onChange={(e) => onChange({ ...value, tehsilId: e.target.value })}
            disabled={tehsilsQuery.isLoading}
          >
            <option value="">{t('filterAllTehsils')}</option>
            {(tehsilsQuery.data ?? []).map((tehsil) => (
              <option key={tehsil.id} value={tehsil.id}>
                {tehsil.name}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      <ToggleChip
        pressed={value.overdueOnly}
        onPressedChange={(pressed) =>
          onChange({ ...value, overdueOnly: pressed })
        }
      >
        {t('overdueOnly')}
      </ToggleChip>

      <ToggleChip
        pressed={Boolean(value.alertOverdue)}
        onPressedChange={(pressed) =>
          onChange({ ...value, alertOverdue: pressed })
        }
      >
        {t('filterAlertOverdue')}
      </ToggleChip>

      {dirty ? (
        <button
          type="button"
          className="text-xs tracking-wider text-muted-foreground uppercase underline-offset-2 hover:text-foreground hover:underline"
          onClick={() =>
            onChange({
              stage: '',
              overdueOnly: false,
              tehsilId: '',
              alertOverdue: false,
            })
          }
        >
          {t('clearFilters')}
        </button>
      ) : null}
    </div>
  );
}
