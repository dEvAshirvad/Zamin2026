import { model, models, Schema } from 'mongoose';

import type { CaseStage, GuardianType, KhasraRow, NeighborRow } from './case.helpers';

import { CASE_STAGES } from './case.helpers';

export interface CaseDoc {
  caseNo: string;
  tehsilId: string;
  createdByUserId: string;
  applicantName: string;
  applicantContact?: string | null;
  applicantGuardianType?: GuardianType | null;
  applicantGuardianName?: string | null;
  applicantResidence?: string | null;
  village: string;
  khasras: KhasraRow[];
  totalRakba: number;
  neighbors: NeighborRow[];
  feeAmount: number;
  /** Legacy unused — kept null for old docs. */
  challanReference?: string | null;
  filedAt: Date;
  stage: CaseStage;
  assignedRiId?: string | null;
  assignedPatwariId?: string | null;
  /** Legacy unused. */
  mapObjectKey?: string | null;
  /** Legacy unused. */
  challanObjectKey?: string | null;
  noticePdfObjectKey?: string | null;
  reportPdfObjectKey?: string | null;
  demarcationDate?: Date | null;
  demarcationTime?: string | null;
  officeName?: string | null;
  district?: string | null;
  state?: string | null;
  patwariHalkaNumber?: string | null;
  tehsildarName?: string | null;
  tehsildarOrderDate?: Date | null;
  issueDate?: Date | null;
  stageChangedAt?: Date | null;
  stageDueAt?: Date | null;
  reportDueAt?: Date | null;
  lastTransitionNote?: string | null;
  objectionReason?: string | null;
  /** Set when demarcation is rescheduled after report deadline (admin alert). */
  superiorAlert?: boolean;
  guaranteeDueAt: Date;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const khasraSchema = new Schema<KhasraRow>(
  {
    khasraNumber: { type: String, required: true, trim: true },
    rakba: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const neighborSchema = new Schema<NeighborRow>(
  {
    ownerName: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const caseSchema = new Schema<CaseDoc>(
  {
    caseNo: { type: String, required: true, unique: true, index: true },
    tehsilId: { type: String, required: true, index: true },
    createdByUserId: { type: String, required: true, index: true },
    applicantName: { type: String, required: true, trim: true },
    applicantContact: { type: String, default: null, trim: true },
    applicantGuardianType: {
      type: String,
      enum: ['पिता', 'पति', null],
      default: null,
    },
    applicantGuardianName: { type: String, default: null, trim: true },
    applicantResidence: { type: String, default: null, trim: true },
    village: { type: String, required: true, trim: true },
    khasras: { type: [khasraSchema], required: true },
    totalRakba: { type: Number, required: true, min: 0 },
    neighbors: { type: [neighborSchema], default: [] },
    feeAmount: { type: Number, required: true, min: 0 },
    challanReference: { type: String, default: null, trim: true },
    filedAt: { type: Date, required: true },
    stage: {
      type: String,
      required: true,
      enum: [...CASE_STAGES],
      default: 'SUBMITTED',
      index: true,
    },
    assignedRiId: { type: String, default: null, index: true },
    assignedPatwariId: { type: String, default: null, index: true },
    mapObjectKey: { type: String, default: null },
    challanObjectKey: { type: String, default: null },
    noticePdfObjectKey: { type: String, default: null },
    reportPdfObjectKey: { type: String, default: null },
    demarcationDate: { type: Date, default: null, index: true },
    demarcationTime: { type: String, default: '12:00' },
    officeName: { type: String, default: null, trim: true },
    district: { type: String, default: 'रायपुर', trim: true },
    state: { type: String, default: 'छत्तीसगढ़', trim: true },
    patwariHalkaNumber: { type: String, default: null, trim: true },
    tehsildarName: { type: String, default: null, trim: true },
    tehsildarOrderDate: { type: Date, default: null },
    issueDate: { type: Date, default: null },
    stageChangedAt: { type: Date, default: null },
    stageDueAt: { type: Date, default: null, index: true },
    reportDueAt: { type: Date, default: null, index: true },
    lastTransitionNote: { type: String, default: null, trim: true },
    objectionReason: { type: String, default: null, trim: true },
    superiorAlert: { type: Boolean, default: false, index: true },
    guaranteeDueAt: { type: Date, required: true, index: true },
  },
  { collection: 'cases' },
);

caseSchema.index({ tehsilId: 1, createdAt: -1 });

export const CaseModel = models.Case ?? model<CaseDoc>('Case', caseSchema);
