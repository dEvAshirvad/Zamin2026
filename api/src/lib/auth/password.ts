import type { BetterAuthOptions } from 'better-auth/types';

import bcrypt from 'bcrypt';
import { APIError } from 'better-auth/api';

import { sendEmail } from '@/lib/email';

const password = {
  async hash(passwordValue: string) {
    const hashedPassword = await bcrypt.hash(passwordValue, 12);
    if (!hashedPassword) {
      throw new APIError('INTERNAL_SERVER_ERROR', {
        message: 'Failed to hash password',
      });
    }
    return hashedPassword;
  },
  async verify({
    password: passwordValue,
    hash,
  }: {
    password: string;
    hash: string;
  }) {
    return bcrypt.compare(passwordValue, hash);
  },
};

const emailAndPassword: BetterAuthOptions['emailAndPassword'] = {
  enabled: true,
  disableSignUp: true,
  requireEmailVerification: true,
  password,
  sendResetPassword: async ({ user, url }) => {
    await sendEmail({
      to: user.email,
      subject: 'Reset your projectZamin password',
      html: `<p>Hi ${user.name || 'there'},</p>
<p>Reset your password:</p>
<p><a href="${url}">Reset password</a></p>
<p>If you did not request this, you can ignore this email.</p>`,
    });
  },
};

export default emailAndPassword;
