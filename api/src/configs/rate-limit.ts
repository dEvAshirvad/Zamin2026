import { rateLimit } from 'express-rate-limit';

import APIError from '@/configs/errors/APIError';
import { CORE_ERRORS } from '@/configs/errors/CORE_ERRORS';

function rateLimitHandler() {
  return (_req: unknown, _res: unknown, next: (error?: Error) => void) => {
    next(
      new APIError({
        ...CORE_ERRORS.TOO_MANY_REQUESTS,
      }),
    );
  };
}

/** Global ceiling for all routes. */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler(),
});

/** Write/mutation routes under /api/v1. */
export const mutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: req =>
    ['GET', 'HEAD', 'OPTIONS'].includes(req.method.toUpperCase()),
  handler: rateLimitHandler(),
});

/** Stricter limit for auth endpoints (mount on /api/v1/auth). */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler(),
});

/** Stricter limit for upload endpoints. */
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler(),
});
