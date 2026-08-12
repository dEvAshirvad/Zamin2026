import { model, models, Schema } from 'mongoose';

import type { CaseStage } from './case.helpers';

import { CASE_STAGES } from './case.helpers';

export interface CaseDoc {
  caseNo: string;
  tehsilId: string;
  createdByUserId: string;
  applicantName: string;
  applicantContact?: string | null;
  village: string;
  khasras: string[];
  feeAmount: number;
  challanReference: string;
  filedAt: Date;
  stage: CaseStage;
  assignedRiId?: string | null;
  mapObjectKey?: string | null;
  challanObjectKey?: string | null;
  hearingAt?: Date | null;
  stageChangedAt?: Date | null;
  stageDueAt?: Date | null;
  lastTransitionNote?: string | null;
  guaranteeDueAt: Date;
  ecourtUploaded: boolean;
  ecourtReference?: string | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const caseSchema = new Schema<CaseDoc>(
  {
    caseNo: { type: String, required: true, unique: true, index: true },
    tehsilId: { type: String, required: true, index: true },
    createdByUserId: { type: String, required: true, index: true },
    applicantName: { type: String, required: true, trim: true },
    applicantContact: { type: String, default: null, trim: true },
    village: { type: String, required: true, trim: true },
    khasras: { type: [String], required: true },
    feeAmount: { type: Number, required: true, min: 0 },
    challanReference: { type: String, required: true, trim: true },
    filedAt: { type: Date, required: true },
    stage: {
      type: String,
      required: true,
      enum: [...CASE_STAGES],
      default: 'SUBMITTED',
      index: true,
    },
    assignedRiId: { type: String, default: null, index: true },
    mapObjectKey: { type: String, default: null },
    challanObjectKey: { type: String, default: null },
    hearingAt: { type: Date, default: null },
    stageChangedAt: { type: Date, default: null },
    stageDueAt: { type: Date, default: null, index: true },
    lastTransitionNote: { type: String, default: null, trim: true },
    guaranteeDueAt: { type: Date, required: true, index: true },
    ecourtUploaded: { type: Boolean, default: false },
    ecourtReference: { type: String, default: null, trim: true },
  },
  { collection: 'cases' },
);

caseSchema.index({ tehsilId: 1, createdAt: -1 });

export const CaseModel = models.Case ?? model<CaseDoc>('Case', caseSchema);
