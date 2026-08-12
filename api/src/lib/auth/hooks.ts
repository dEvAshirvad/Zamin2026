import type { BetterAuthOptions } from 'better-auth';

export const authHooks: BetterAuthOptions['hooks'] = {};

export const authDbHooks: BetterAuthOptions['databaseHooks'] = {
  session: {
    create: {
      before: async (session) => {
        return {
          data: {
            ...session,
          },
        };
      },
    },
  },
};
