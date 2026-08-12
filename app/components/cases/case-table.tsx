'use client';

import Link from 'next/link';
import { CaretRightIcon } from '@phosphor-icons/react';

import { SlaBadge } from '@/components/cases/sla-badge';
import { StageChip } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/feedback';
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
import type { CaseListItem } from '@/lib/cases';
import { stageLabel } from '@/lib/i18n';
import { useRouter } from 'next/navigation';

export function CaseTable({
  cases,
  detailBase,
  overdueOnly = false,
  emptyAction,
}: {
  cases: CaseListItem[];
  detailBase: string;
  overdueOnly?: boolean;
  emptyAction?: React.ReactNode;
}) {
  const { locale, t } = useLocale();
  const router = useRouter();

  if (cases.length === 0) {
    return (
      <EmptyState
        title={overdueOnly ? t('noOverdueCases') : t('noCases')}
        description={overdueOnly ? t('noOverdueCasesHint') : t('noCasesHint')}
        action={overdueOnly ? undefined : emptyAction}
      />
    );
  }

  return (
    <TableWrap>
      <Table>
        <THead>
          <TR className="hover:bg-transparent">
            <TH>{t('caseNo')}</TH>
            <TH>{t('applicant')}</TH>
            <TH className="text-end">{t('fee')}</TH>
            <TH>{t('stage')}</TH>
            <TH>{t('sla')}</TH>
            <TH className="w-10" />
          </TR>
        </THead>
        <TBody>
          {cases.map((row) => (
            <TR
              key={row.id}
              className="group"
              onClick={() => router.push(`${detailBase}/${row.id}`)}
            >
              <TD className="font-mono text-xs text-muted-foreground">
                <Link
                  href={`${detailBase}/${row.id}`}
                  className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
                >
                  {row.caseNo}
                </Link>
              </TD>
              <TD>
                <Link
                  href={`${detailBase}/${row.id}`}
                  className="block rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
                >
                  <span className="block font-medium text-foreground">
                    {row.applicantName}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {t('village')} {row.village} · {row.khasras.length}{' '}
                    {t('khasras')}
                  </span>
                </Link>
              </TD>
              <TD className="tnum whitespace-nowrap text-end text-muted-foreground">
                ₹{row.feeAmount}
              </TD>
              <TD>
                <StageChip>{stageLabel(locale, row.stage)}</StageChip>
              </TD>
              <TD>
                <SlaBadge item={row} />
              </TD>
              <TD className="text-end">
                <Link
                  href={`${detailBase}/${row.id}`}
                  aria-label={t('open')}
                  className="inline-flex rounded-sm p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
                >
                  <CaretRightIcon size={15} className="rtl:rotate-180" />
                </Link>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </TableWrap>
  );
}
