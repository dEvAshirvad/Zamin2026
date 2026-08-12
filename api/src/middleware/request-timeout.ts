import type { NextFunction, Request, Response } from 'express';

import env from '@/configs/env';
import APIError from '@/configs/errors/APIError';
import { CORE_ERRORS } from '@/configs/errors/CORE_ERRORS';

export default function requestTimeoutMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const timeoutMs = env.REQUEST_TIMEOUT_MS;
  const timer = setTimeout(() => {
    if (res.headersSent) {
      return;
    }
    next(
      new APIError({
        ...CORE_ERRORS.REQUEST_TIMEOUT,
        META: { path: req.originalUrl, method: req.method, timeoutMs },
      }),
    );
  }, timeoutMs);

  const clear = () => clearTimeout(timer);
  res.on('finish', clear);
  res.on('close', clear);
  next();
}
