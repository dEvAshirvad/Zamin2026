import type { BetterAuthOptions } from 'better-auth/types';

/**
 * Platform identity fields on the better-auth user.
 * - `role` / `tehsilId` are server-set only (`input: false`)
 */
const user = {
  additionalFields: {
    role: {
      type: ['admin', 'tehsildar', 'ri', 'patwari'],
      required: false,
      input: false,
      defaultValue: 'ri',
    },
    tehsilId: {
      type: 'string',
      required: false,
      input: false,
    },
  },
} satisfies BetterAuthOptions['user'];

const session = {
  expiresIn: 60 * 60 * 24 * 7,
} satisfies BetterAuthOptions['session'];

export { session, user };
