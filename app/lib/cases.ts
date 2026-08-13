export type SlaStatus = 'closed' | 'overdue' | 'on_track';
export type StageSlaStatus = 'none' | 'on_track' | 'overdue';

export interface CaseListItem {
  id: string;
  caseNo: string;
  tehsilId: string;
  applicantName: string;
  village: string;
  khasras: string[];
  feeAmount: number;
  challanReference: string;
  filedAt: string;
  stage: string;
  assignedRiId: string | null;
  hearingAt?: string | null;
  stageChangedAt?: string | null;
  stageDueAt?: string | null;
  lastTransitionNote?: string | null;
  guaranteeDueAt: string;
  ecourtUploaded: boolean;
  ecourtReference?: string | null;
  slaStatus?: SlaStatus;
  daysToGuarantee?: number;
  stageSlaStatus?: StageSlaStatus;
  createdAt: string;
}

export interface CaseDetail extends CaseListItem {
  createdByUserId: string;
  applicantContact: string | null;
  mapObjectKey: string | null;
  challanObjectKey: string | null;
  mapDownloadUrl: string | null;
  challanDownloadUrl: string | null;
  /** Display name for assigned RI (detail / transition responses). */
  assignedRiName?: string | null;
  allowedNext?: string[];
  updatedAt: string;
}

export interface TehsilRi {
  id: string;
  name: string;
  email: string;
  tehsilId: string | null;
}

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

export const STAGE_LABELS: Record<string, string> = {
  SUBMITTED: 'Submitted',
  MEMO_ISSUED: 'Memo issued',
  NOTICE_ISSUED: 'Notice issued',
  HEARING_SCHEDULED: 'Hearing scheduled',
  OBJECTIONS_WINDOW: 'Objections window',
  DEMARCATION_DONE: 'Demarcation done',
  ORDER_ISSUED: 'Order issued',
  ECOURT_UPLOADED: 'eCourt uploaded',
};
