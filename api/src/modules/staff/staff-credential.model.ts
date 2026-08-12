import { model, models, Schema } from 'mongoose';

import type { PlatformRole } from '@/lib/auth/roles';

export interface StaffCredentialDoc {
  userId: string;
  email: string;
  name: string;
  role: PlatformRole;
  tehsilId: string | null;
  passwordPlain: string;
  importBatchId: string;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const staffCredentialSchema = new Schema<StaffCredentialDoc>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, index: true },
    name: { type: String, required: true },
    role: { type: String, required: true, enum: ['admin', 'tehsildar', 'ri'] },
    tehsilId: { type: String, default: null },
    passwordPlain: { type: String, required: true },
    importBatchId: { type: String, required: true, index: true },
  },
  { collection: 'staff_credentials' },
);

export const StaffCredentialModel
  = models.StaffCredential
    ?? model<StaffCredentialDoc>('StaffCredential', staffCredentialSchema);
