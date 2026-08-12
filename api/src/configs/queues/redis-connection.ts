import type { ConnectionOptions } from 'bullmq';

import env from '@/configs/env';

/**
 * Dedicated BullMQ Redis options.
 * Do not reuse the API ioredis client (maxRetriesPerRequest must be null for workers).
 */
export function createBullMqConnection(): ConnectionOptions {
  return {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
  };
}
