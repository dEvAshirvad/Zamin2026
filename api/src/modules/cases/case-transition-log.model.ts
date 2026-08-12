import { model, models, Schema } from 'mongoose';

import type { CaseStage } from './case.helpers';

import { CASE_STAGES } from './case.helpers';

export interface CaseTransitionLogDoc {
  caseId: string;
  tehsilId: string;
  fromStage: CaseStage;
  toStage: CaseStage;
  actorUserId: string;
  actorRole: string;
  note?: string | null;
  ecourtReference?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const caseTransitionLogSchema = new Schema<CaseTransitionLogDoc>(
  {
    caseId: { type: String, required: true, index: true },
    tehsilId: { type: String, required: true, index: true },
    fromStage: { type: String, required: true, enum: [...CASE_STAGES] },
    toStage: { type: String, required: true, enum: [...CASE_STAGES] },
    actorUserId: { type: String, required: true },
    actorRole: { type: String, required: true },
    note: { type: String, default: null, trim: true },
    ecourtReference: { type: String, default: null, trim: true },
  },
  { collection: 'case_transition_logs', timestamps: true },
);

caseTransitionLogSchema.index({ caseId: 1, createdAt: -1 });
caseTransitionLogSchema.index({ tehsilId: 1, createdAt: -1 });

export const CaseTransitionLogModel
  = models.CaseTransitionLog
    ?? model<CaseTransitionLogDoc>('CaseTransitionLog', caseTransitionLogSchema);
