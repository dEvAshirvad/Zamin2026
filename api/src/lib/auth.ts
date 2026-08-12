import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { openAPI } from 'better-auth/plugins';

import { db } from '@/configs/db/mongodb';
import env, { config } from '@/configs/env';
import origins from '@/configs/origins';
import emailVerification from '@/lib/auth/emailVerification';
import { authDbHooks, authHooks } from '@/lib/auth/hooks';
import emailAndPassword from '@/lib/auth/password';
import { session, user } from '@/lib/auth/schemas';

export const auth = betterAuth({
  appName: 'Simankan',
  baseURL: config.auth.baseURL,
  ...(config.auth.secret ? { secret: config.auth.secret } : {}),
  ...(config.auth.secrets ? { secrets: config.auth.secrets } : {}),
  database: mongodbAdapter(db),
  trustedOrigins: origins,
  emailAndPassword,
  user,
  session,
  hooks: authHooks,
  databaseHooks: authDbHooks,
  emailVerification,
  account: {
    accountLinking: {
      enabled: false,
    },
  },
  plugins: [openAPI()],
  advanced: {
    cookiePrefix: 'zamin',
    // Domain=localhost is rejected by browsers/supertest; only enable for real hosts.
    ...(config.cookieDomain
      && config.cookieDomain !== 'localhost'
      && !config.cookieDomain.endsWith('.localhost')
      ? {
          crossSubDomainCookies: {
            enabled: true,
            domain: config.cookieDomain,
          },
        }
      : {}),
    ...(env.NODE_ENV !== 'production' && {
      disableOriginCheck: true,
      disableCSRFCheck: true,
    }),
  },
});

export type Session = typeof auth.$Infer.Session;
