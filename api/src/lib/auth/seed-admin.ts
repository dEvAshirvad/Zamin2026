import { config } from '@/configs/env';
import logger from '@/configs/logger/winston';
import {
  countAdmins,
  createStaffUser,
  findUserByEmail,
} from '@/lib/auth/create-staff-user';

/** Seed platform admin once. Skip when any admin exists or env incomplete. */
export async function seedAdminIfMissing(): Promise<void> {
  const email = config.admin.email?.trim().toLowerCase();
  const password = config.admin.password;

  if (!email || !password) {
    logger.info('Admin seed skipped (ADMIN_EMAIL / ADMIN_PASSWORD not set)');
    return;
  }

  if (password.length < 8) {
    logger.warn('Admin seed skipped (ADMIN_PASSWORD must be at least 8 characters)');
    return;
  }

  const adminCount = await countAdmins();
  if (adminCount > 0) {
    logger.info('Admin seed skipped (admin already exists)');
    return;
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    logger.info('Admin seed skipped (ADMIN_EMAIL already registered)');
    return;
  }

  await createStaffUser({
    name: config.admin.name || 'Admin',
    email,
    role: 'admin',
    tehsilId: null,
    password,
  });

  logger.info(`Admin seeded: ${email}`);
}
