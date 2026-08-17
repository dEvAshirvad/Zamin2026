/* eslint-disable node/no-process-env */
import { config as loadDotenv } from 'dotenv';
import { expand } from 'dotenv-expand';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

function findMonorepoRoot(startDir: string): string {
  let dir = startDir;
  for (;;) {
    if (existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return startDir;
    }
    dir = parent;
  }
}

function resolveEnvFile(): string {
  const fileName = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
  const cwd = process.cwd();
  const root = findMonorepoRoot(cwd);
  const candidates = [
    path.resolve(root, fileName),
    path.resolve(cwd, fileName),
    // legacy: api/.env.test during migration
    path.resolve(root, 'api', fileName),
  ];
  return candidates.find(existsSync) ?? path.resolve(root, fileName);
}

expand(
  loadDotenv({
    path: resolveEnvFile(),
  }),
);

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  // Reverse proxy hop count (0 in local, usually 1 behind LB/proxy).
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(32).default(1),
  DEVICE_ID: z.string().min(1).default('laptop-1'),
  COOKIE_DOMAIN: z.string().optional(),
  CORS_ORIGINS: z.string().optional(),
  // Used by docker-compose mongodb_container init (not read by the Node app directly)
  MONGO_INITDB_DATABASE: z.string().default('projectzamin'),
  MONGO_INITDB_ROOT_USERNAME: z.string().default('root'),
  MONGO_INITDB_ROOT_PASSWORD: z.string().default('root'),
  MONGODB_URI: z.string().url('MONGODB_URI must be a valid URL'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional().default(''),
  IDEMPOTENCY_TTL_SECONDS: z.coerce.number().int().positive().default(86400),
  AUDIT_LOGGING_DISABLED: z
    .string()
    .optional()
    .default('false')
    .transform(v => ['true', '1', 'yes'].includes(String(v).toLowerCase())),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  SHUTDOWN_DRAIN_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  S3_OPERATION_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  HTTP_CLIENT_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  INTERNAL_API_TOKEN: z.string().optional(),
  // MinIO (S3-compatible object storage)
  MINIO_ENDPOINT: z.string().url().optional(),
  MINIO_PUBLIC_ENDPOINT: z
    .string()
    .optional()
    .transform(v => (v && v.trim() ? v.trim() : undefined))
    .pipe(z.string().url().optional()),
  MINIO_REGION: z.string().default('us-east-1'),
  MINIO_BUCKET: z.string().optional(),
  MINIO_ACCESS_KEY_ID: z.string().optional(),
  MINIO_SECRET_ACCESS_KEY: z.string().optional(),
  MINIO_FORCE_PATH_STYLE: z
    .string()
    .optional()
    .default('true')
    .transform(v => ['true', '1', 'yes'].includes(String(v).toLowerCase())),
  MINIO_PRESIGN_UPLOAD_EXPIRES_SECONDS: z.coerce
    .number()
    .int()
    .min(60)
    .max(3600)
    .default(900),
  MINIO_PRESIGN_DOWNLOAD_EXPIRES_SECONDS: z.coerce
    .number()
    .int()
    .min(60)
    .max(3600)
    .default(300),
  /**
   * Email transport switch:
   * - auto (default): Resend if RESEND_API_KEY set, else Nodemailer if SMTP_* set
   * - resend: force Resend
   * - nodemailer: force SMTP / Nodemailer
   */
  EMAIL_PROVIDER: z.enum(['auto', 'resend', 'nodemailer']).default('auto'),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().min(3).optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_SECURE: z
    .string()
    .optional()
    .default('true')
    .transform(v => ['true', '1', 'yes'].includes(String(v).toLowerCase())),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  EMAIL_FROM_NAME: z.string().optional(),
  BETTER_AUTH_SECRET: z.string().min(16).optional(),
  BETTER_AUTH_SECRETS: z.string().optional(),
  BETTER_AUTH_URL: z.string().url().optional(),
  /** Frontend origin for CORS / cookies docs */
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  ADMIN_NAME: z.string().min(1).optional().default('Admin'),
  WARN_MULTIPLE_TEHSILDAR: z
    .string()
    .optional()
    .default('true')
    .transform(v => ['true', '1', 'yes'].includes(String(v).toLowerCase())),
  INVITE_EMAIL_ENABLED: z
    .string()
    .optional()
    .default('false')
    .transform(v => ['true', '1', 'yes'].includes(String(v).toLowerCase())),
})
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') {
      const redisPassword = data.REDIS_PASSWORD?.trim();
      if (!redisPassword || redisPassword.length < 12) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'REDIS_PASSWORD is required in production (min 12 characters).',
          path: ['REDIS_PASSWORD'],
        });
      }

      const authSecret = data.BETTER_AUTH_SECRET?.trim();
      const authSecrets = data.BETTER_AUTH_SECRETS?.trim();
      if (!authSecrets && (!authSecret || authSecret.length < 32)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'BETTER_AUTH_SECRET (min 32 chars) or BETTER_AUTH_SECRETS is required in production.',
          path: ['BETTER_AUTH_SECRET'],
        });
      }

      if (!data.BETTER_AUTH_URL?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'BETTER_AUTH_URL is required in production.',
          path: ['BETTER_AUTH_URL'],
        });
      }
    }

    const minioFields = [
      data.MINIO_ENDPOINT,
      data.MINIO_BUCKET,
      data.MINIO_ACCESS_KEY_ID,
      data.MINIO_SECRET_ACCESS_KEY,
    ];
    const anyMinioConfigured = minioFields.some(Boolean);
    const allMinioConfigured = minioFields.every(Boolean);
    if (anyMinioConfigured && !allMinioConfigured) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'If enabling MinIO storage, set MINIO_ENDPOINT, MINIO_BUCKET, MINIO_ACCESS_KEY_ID, and MINIO_SECRET_ACCESS_KEY.',
        path: ['MINIO_ENDPOINT'],
      });
    }

    if (data.EMAIL_PROVIDER === 'resend' && !data.RESEND_API_KEY?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'EMAIL_PROVIDER=resend requires RESEND_API_KEY.',
        path: ['RESEND_API_KEY'],
      });
    }

    if (data.EMAIL_PROVIDER === 'nodemailer') {
      const smtpReady = [
        data.SMTP_HOST,
        data.SMTP_USER,
        data.SMTP_PASSWORD,
      ].every(v => Boolean(v?.trim()));
      if (!smtpReady) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'EMAIL_PROVIDER=nodemailer requires SMTP_HOST, SMTP_USER, and SMTP_PASSWORD.',
          path: ['SMTP_HOST'],
        });
      }
    }
  });

export type env = z.infer<typeof EnvSchema>;

function parseBetterAuthSecrets(
  raw: string | undefined,
): Array<{ version: number; value: string }> | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return undefined;
  }

  const secrets = trimmed
    .split(',')
    .map((part) => {
      const [versionRaw, ...valueParts] = part.trim().split(':');
      const version = Number(versionRaw);
      const value = valueParts.join(':');
      if (!Number.isInteger(version) || version < 1 || !value) {
        return null;
      }
      return { version, value };
    })
    .filter((entry): entry is { version: number; value: string } => entry != null);

  return secrets.length > 0 ? secrets : undefined;
}

// eslint-disable-next-line ts/no-redeclare
const { data: env, error } = EnvSchema.safeParse(process.env);

if (error) {
  console.error('❌ Invalid env:');
  console.error(JSON.stringify(error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export default env!;

function formatFromAddress(
  email: string | undefined,
  name: string | undefined,
): string | undefined {
  const address = email?.trim();
  if (!address) {
    return undefined;
  }
  const displayName = name?.trim();
  return displayName ? `${displayName} <${address}>` : address;
}

/** Grouped, typed config derived from validated env (single source of truth). */
export const config = {
  nodeEnv: env.NODE_ENV,
  /** @deprecated use config.email.resendApiKey */
  resendApiKey: env.RESEND_API_KEY,
  /** @deprecated use config.email.resendFromEmail */
  resendFromEmail: env.RESEND_FROM_EMAIL,
  email: {
    provider: env.EMAIL_PROVIDER,
    resendApiKey: env.RESEND_API_KEY,
    resendFromEmail: env.RESEND_FROM_EMAIL,
    from: env.EMAIL_FROM,
    fromName: env.EMAIL_FROM_NAME,
    fromFormatted: formatFromAddress(env.EMAIL_FROM, env.EMAIL_FROM_NAME),
    smtp: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      user: env.SMTP_USER,
      password: env.SMTP_PASSWORD,
    },
  },
  port: env.PORT,
  deviceId: env.DEVICE_ID,
  cookieDomain: env.COOKIE_DOMAIN,
  corsOrigins: env.CORS_ORIGINS,
  trustProxyHops: env.TRUST_PROXY_HOPS,
  logLevel: env.LOG_LEVEL,
  internalApiToken: env.INTERNAL_API_TOKEN,
  requestTimeoutMs: env.REQUEST_TIMEOUT_MS,
  shutdownDrainTimeoutMs: env.SHUTDOWN_DRAIN_TIMEOUT_MS,
  auth: {
    secret: env.BETTER_AUTH_SECRET,
    secrets: parseBetterAuthSecrets(env.BETTER_AUTH_SECRETS),
    baseURL:
      env.BETTER_AUTH_URL
      ?? `http://localhost:${env.PORT}`,
  },
  admin: {
    email: env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD,
    name: env.ADMIN_NAME,
  },
  staff: {
    warnMultipleTehsildar: env.WARN_MULTIPLE_TEHSILDAR,
    inviteEmailEnabled: env.INVITE_EMAIL_ENABLED,
  },
  db: {
    uri: env.MONGODB_URI,
    initDatabase: env.MONGO_INITDB_DATABASE,
    initUsername: env.MONGO_INITDB_ROOT_USERNAME,
    initPassword: env.MONGO_INITDB_ROOT_PASSWORD,
  },
  redis: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
  },
  minio: {
    endpoint: env.MINIO_ENDPOINT,
    publicEndpoint: env.MINIO_PUBLIC_ENDPOINT,
    region: env.MINIO_REGION,
    bucket: env.MINIO_BUCKET,
    accessKeyId: env.MINIO_ACCESS_KEY_ID,
    secretAccessKey: env.MINIO_SECRET_ACCESS_KEY,
    forcePathStyle: env.MINIO_FORCE_PATH_STYLE,
    uploadExpiresSeconds: env.MINIO_PRESIGN_UPLOAD_EXPIRES_SECONDS,
    downloadExpiresSeconds: env.MINIO_PRESIGN_DOWNLOAD_EXPIRES_SECONDS,
    operationTimeoutMs: env.S3_OPERATION_TIMEOUT_MS,
  },
  idempotencyTtlSeconds: env.IDEMPOTENCY_TTL_SECONDS,
  httpClientTimeoutMs: env.HTTP_CLIENT_TIMEOUT_MS,
} as const;
