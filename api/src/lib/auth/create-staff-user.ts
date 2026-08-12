import bcrypt from 'bcrypt';
import { randomBytes, randomUUID } from 'node:crypto';

import type { PlatformRole } from '@/lib/auth/roles';

import { db } from '@/configs/db/mongodb';

export interface CreateStaffUserInput {
  name: string;
  email: string;
  role: PlatformRole;
  tehsilId: string | null;
  password?: string;
}

export interface CreateStaffUserResult {
  userId: string;
  email: string;
  name: string;
  role: PlatformRole;
  tehsilId: string | null;
  passwordPlain: string;
}

function generateTempPassword(): string {
  return randomBytes(9).toString('base64url');
}

/**
 * Create a Better Auth credential user (public signup is disabled).
 * Mongo adapter stores `id` as `_id` — account.userId must match user._id.
 */
export async function createStaffUser(
  input: CreateStaffUserInput,
): Promise<CreateStaffUserResult> {
  const email = input.email.trim().toLowerCase();
  const passwordPlain = input.password ?? generateTempPassword();
  const now = new Date();
  const userId = randomUUID();
  const accountId = randomUUID();
  const passwordHash = await bcrypt.hash(passwordPlain, 12);

  await db.collection('user').insertOne({
    _id: userId as unknown as import('mongodb').ObjectId,
    name: input.name.trim(),
    email,
    emailVerified: true,
    image: null,
    createdAt: now,
    updatedAt: now,
    role: input.role,
    tehsilId: input.tehsilId,
  });

  await db.collection('account').insertOne({
    _id: accountId as unknown as import('mongodb').ObjectId,
    accountId: userId,
    providerId: 'credential',
    userId,
    password: passwordHash,
    createdAt: now,
    updatedAt: now,
  });

  return {
    userId,
    email,
    name: input.name.trim(),
    role: input.role,
    tehsilId: input.tehsilId,
    passwordPlain,
  };
}

export async function findUserByEmail(email: string) {
  return db.collection('user').findOne({ email: email.trim().toLowerCase() });
}

export async function findUserById(userId: string) {
  return db.collection('user').findOne({
    $or: [
      { _id: userId as unknown as import('mongodb').ObjectId },
      { id: userId },
    ],
  });
}

export async function countAdmins(): Promise<number> {
  return db.collection('user').countDocuments({ role: 'admin' });
}

export async function countTehsildarsInTehsil(tehsilId: string): Promise<number> {
  return db.collection('user').countDocuments({ role: 'tehsildar', tehsilId });
}

export async function setUserPassword(userId: string, passwordPlain: string): Promise<void> {
  const passwordHash = await bcrypt.hash(passwordPlain, 12);
  const now = new Date();
  await db.collection('account').updateOne(
    { userId, providerId: 'credential' },
    { $set: { password: passwordHash, updatedAt: now } },
  );
  await db.collection('user').updateOne(
    {
      $or: [
        { _id: userId as unknown as import('mongodb').ObjectId },
        { id: userId },
      ],
    },
    { $set: { updatedAt: now } },
  );
}

export function userDocId(user: { _id?: unknown; id?: unknown }): string {
  if (typeof user.id === 'string' && user.id) {
    return user.id;
  }
  return String(user._id);
}

export { generateTempPassword };
