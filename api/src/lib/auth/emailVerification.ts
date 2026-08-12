import type { BetterAuthOptions } from 'better-auth';

import { sendEmail } from '@/lib/email';

const emailVerification: BetterAuthOptions['emailVerification'] = {
  sendVerificationEmail: async ({ user, url }) => {
    await sendEmail({
      to: user.email,
      subject: 'Verify your projectZamin email',
      html: `<p>Hi ${user.name || 'there'},</p>
<p>Verify your email to finish setting up projectZamin:</p>
<p><a href="${url}">Verify email</a></p>
<p>This link expires in one hour.</p>`,
    });
  },
  sendOnSignUp: true,
  autoSignInAfterVerification: true,
  expiresIn: 3600,
};

export default emailVerification;
