export type SlaStatus = 'closed' | 'overdue' | 'on_track';
export type StageSlaStatus = 'none' | 'on_track' | 'overdue';
export type AlertStatus = 'none' | 'OVERDUE';
export type GuardianType = 'पिता' | 'पति';

export interface KhasraRow {
  khasraNumber: string;
  rakba: number;
}

export interface NeighborRow {
  ownerName: string;
  address: string;
}

export interface CaseListItem {
  id: string;
  caseNo: string;
  tehsilId: string;
  applicantName: string;
  village: string;
  khasras: KhasraRow[] | string[];
  totalRakba?: number;
  neighbors?: NeighborRow[];
  feeAmount: number;
  filedAt: string;
  stage: string;
  assignedRiId: string | null;
  assignedRiName?: string | null;
  assignedPatwariId?: string | null;
  assignedPatwariName?: string | null;
  demarcationDate?: string | null;
  demarcationTime?: string | null;
  stageChangedAt?: string | null;
  stageDueAt?: string | null;
  reportDueAt?: string | null;
  lastTransitionNote?: string | null;
  objectionReason?: string | null;
  guaranteeDueAt: string;
  superiorAlert?: boolean;
  alertStatus?: AlertStatus;
  slaStatus?: SlaStatus;
  daysToGuarantee?: number;
  stageSlaStatus?: StageSlaStatus;
  createdAt: string;
}

export interface CaseDetail extends CaseListItem {
  createdByUserId: string;
  applicantContact: string | null;
  applicantGuardianType?: GuardianType | null;
  applicantGuardianName?: string | null;
  applicantResidence?: string | null;
  officeName?: string | null;
  district?: string | null;
  state?: string | null;
  patwariHalkaNumber?: string | null;
  tehsildarName?: string | null;
  issueDate?: string | null;
  noticePdfObjectKey?: string | null;
  reportPdfObjectKey?: string | null;
  noticePdfDownloadUrl?: string | null;
  reportPdfDownloadUrl?: string | null;
  allowedNext?: string[];
  updatedAt: string;
}

export interface TehsilRi {
  id: string;
  name: string;
  email: string;
  tehsilId: string | null;
}

export type TehsilPatwari = TehsilRi;

export interface PaginatedCases {
  success: boolean;
  data: CaseListItem[];
  meta?: {
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

export interface ApiSuccess<T> {
  success: boolean;
  data: T;
}

export function khasraCount(khasras: CaseListItem['khasras']): number {
  return khasras?.length ?? 0;
}

export function khasraLabel(khasras: CaseListItem['khasras']): string {
  if (!khasras?.length) return '—';
  return khasras
    .map((k) =>
      typeof k === 'string' ? k : `${k.khasraNumber} (${k.rakba})`,
    )
    .join(', ');
}

export const STAGE_LABELS: Record<string, string> = {
  SUBMITTED: 'Submitted',
  MEMO_ISSUED: 'Memo issued',
  NOTICE_ISSUED: 'Notice issued',
  HEARING_SCHEDULED: 'Notice issued',
  OBJECTION_CLOSED: 'Objection closed',
  DEMARCATION_WINDOW_OPEN: 'Demarcation window',
  DEMARCATION_DONE: 'Demarcation done',
  REPORT_SUBMITTED: 'Report submitted',
  ORDER_ISSUED: 'Order issued',
};
