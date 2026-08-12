import { model, models, Schema } from 'mongoose';

export interface CaseCounterDoc {
  tehsilId: string;
  year: number;
  seq: number;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const caseCounterSchema = new Schema<CaseCounterDoc>(
  {
    tehsilId: { type: String, required: true, index: true },
    year: { type: Number, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { collection: 'case_counters' },
);

caseCounterSchema.index({ tehsilId: 1, year: 1 }, { unique: true });

export const CaseCounterModel
  = models.CaseCounter
    ?? model<CaseCounterDoc>('CaseCounter', caseCounterSchema);
