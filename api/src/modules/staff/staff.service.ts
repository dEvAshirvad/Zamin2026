import { randomUUID } from 'node:crypto';

import type { PlatformRole } from '@/lib/auth/roles';
import type { PaginationQuery } from '@/lib/paginator';

import { db } from '@/configs/db/mongodb';
import { config } from '@/configs/env';
import APIError from '@/configs/errors/APIError';
import {
  countTehsildarsInTehsil,
  createStaffUser,
  findUserByEmail,
  findUserById,
  generateTempPassword,
  setUserPassword,
  userDocId,
} from '@/lib/auth/create-staff-user';
import { sendEmail } from '@/lib/email';
import { escapeRegex } from '@/lib/escape-regex';
import { createPaginationResult } from '@/lib/paginator';
import { resolveOrCreateByName } from '@/modules/tehsils/tehsil.service';
import { HttpErrorStatusCode } from '@/types/errors/errors.types';

import { StaffCredentialModel } from './staff-credential.model';
import { parseStaffImportFile } from './staff-import.parse';

export type StaffImportRole = Extract<PlatformRole, 'tehsildar' | 'ri' | 'patwari'>;

export interface ImportRowResult {
  line: number;
  email: string;
  status: 'created' | 'skipped';
  reason?: string;
  userId?: string;
  tehsilId?: string;
}

export interface ImportResult {
  batchId: string;
  role: StaffImportRole;
  created: number;
  skipped: number;
  rows: ImportRowResult[];
  warnings: string[];
}

async function maybeSendInvite(opts: {
  name: string;
  email: string;
  password: string;
  role: PlatformRole;
}) {
  if (!config.staff.inviteEmailEnabled) {
    return;
  }
  await sendEmail({
    to: opts.email,
    subject: 'Your Simankan login',
    html: `<p>Hi ${opts.name},</p>
<p>Your ${opts.role} account is ready.</p>
<p>Email: <strong>${opts.email}</strong><br/>Temporary password: <strong>${opts.password}</strong></p>
<p>Sign in and change your password after first login.</p>`,
  });
}

export async function importStaffFromFile(
  filePath: string,
  role: StaffImportRole,
): Promise<ImportResult> {
  const parsed = await parseStaffImportFile(filePath);
  const batchId = randomUUID();
  const rows: ImportRowResult[] = [];
  const warnings: string[] = [];
  let created = 0;
  let skipped = 0;

  for (const row of parsed) {
    const existing = await findUserByEmail(row.email);
    if (existing) {
      skipped++;
      rows.push({
        line: row.line,
        email: row.email,
        status: 'skipped',
        reason: 'email already registered',
      });
      continue;
    }

    const tehsil = await resolveOrCreateByName(row.tehsil);
    const tehsilId = String(tehsil._id);

    const user = await createStaffUser({
      name: row.name,
      email: row.email,
      role,
      tehsilId,
    });

    await StaffCredentialModel.findOneAndUpdate(
      { userId: user.userId },
      {
        userId: user.userId,
        email: user.email,
        name: user.name,
        role: user.role,
        tehsilId: user.tehsilId,
        passwordPlain: user.passwordPlain,
        importBatchId: batchId,
      },
      { upsert: true, new: true },
    );

    await maybeSendInvite({
      name: user.name,
      email: user.email,
      password: user.passwordPlain,
      role,
    });

    if (role === 'tehsildar' && config.staff.warnMultipleTehsildar) {
      const count = await countTehsildarsInTehsil(tehsilId);
      if (count > 1) {
        warnings.push(
          `Tehsil "${tehsil.name}" now has ${count} tehsildars (suggested: one)`,
        );
      }
    }

    created++;
    rows.push({
      line: row.line,
      email: user.email,
      status: 'created',
      userId: user.userId,
      tehsilId,
    });
  }

  return { batchId, role, created, skipped, rows, warnings };
}

export async function listStaff(filters: {
  role?: PlatformRole;
  tehsilId?: string;
  q?: string;
  pagination: PaginationQuery;
}) {
  const query: Record<string, unknown> = {
    role: { $in: ['tehsildar', 'ri', 'patwari', 'admin'] },
  };
  if (filters.role) {
    query.role = filters.role;
  }
  if (filters.tehsilId) {
    query.tehsilId = filters.tehsilId;
  }
  const q = filters.q?.trim();
  if (q) {
    const re = new RegExp(escapeRegex(q), 'i');
    query.$or = [{ name: re }, { email: re }];
  }

  const { page, limit } = filters.pagination;
  const skip = (page - 1) * limit;
  const col = db.collection('user');
  const projection = {
    id: 1,
    name: 1,
    email: 1,
    role: 1,
    tehsilId: 1,
    createdAt: 1,
    emailVerified: 1,
  };

  const [users, total] = await Promise.all([
    col
      .find(query)
      .project(projection)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    col.countDocuments(query),
  ]);

  return createPaginationResult(
    users.map(u => ({
      id: userDocId(u),
      name: u.name as string,
      email: u.email as string,
      role: u.role as PlatformRole,
      tehsilId: (u.tehsilId as string | null) ?? null,
      emailVerified: Boolean(u.emailVerified),
      createdAt: u.createdAt as Date,
    })),
    total,
    page,
    limit,
  );
}

export async function credentialsCsv(): Promise<string> {
  const docs = await StaffCredentialModel.find().sort({ email: 1 }).lean();
  const header = 'email,name,role,tehsilId,password,userId,importBatchId';
  const lines = docs.map(d =>
    [
      csvEscape(d.email),
      csvEscape(d.name),
      csvEscape(d.role),
      csvEscape(d.tehsilId ?? ''),
      csvEscape(d.passwordPlain),
      csvEscape(d.userId),
      csvEscape(d.importBatchId),
    ].join(','),
  );
  return [header, ...lines].join('\n');
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function revealPassword(userId: string) {
  const cred = await StaffCredentialModel.findOne({ userId }).lean();
  if (!cred) {
    throw new APIError({
      STATUS: HttpErrorStatusCode.NOT_FOUND,
      CODE: 'CREDENTIAL_NOT_FOUND',
      TITLE: 'CREDENTIAL_NOT_FOUND',
      MESSAGE: 'No stored temporary password for this user',
    });
  }
  return {
    userId: cred.userId,
    email: cred.email,
    name: cred.name,
    role: cred.role,
    password: cred.passwordPlain,
  };
}

export async function resetStaffPassword(userId: string) {
  const user = await findUserById(userId);
  if (!user) {
    throw new APIError({
      STATUS: HttpErrorStatusCode.NOT_FOUND,
      CODE: 'USER_NOT_FOUND',
      TITLE: 'USER_NOT_FOUND',
      MESSAGE: 'User not found',
    });
  }

  const passwordPlain = generateTempPassword();
  await setUserPassword(userId, passwordPlain);

  const role = (user.role as PlatformRole) ?? 'ri';
  const email = String(user.email);
  const name = String(user.name ?? email);

  await StaffCredentialModel.findOneAndUpdate(
    { userId },
    {
      userId,
      email,
      name,
      role,
      tehsilId: (user.tehsilId as string | null) ?? null,
      passwordPlain,
      importBatchId: randomUUID(),
    },
    { upsert: true, new: true },
  );

  await maybeSendInvite({ name, email, password: passwordPlain, role });

  return { userId, email, name, role, password: passwordPlain };
}
