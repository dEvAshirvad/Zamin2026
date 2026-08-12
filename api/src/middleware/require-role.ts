import type { NextFunction, Request, Response } from 'express';

import type { PlatformRole } from '@/lib/auth/roles';

import APIError from '@/configs/errors/APIError';
import { AUTHORIZATION_ERRORS } from '@/configs/errors/AUTHORIZATION_ERRORS';
import { HttpErrorStatusCode } from '@/types/errors/errors.types';

export function requireRole(...roles: PlatformRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (!role || !roles.includes(role)) {
      return next(
        new APIError({
          STATUS: HttpErrorStatusCode.FORBIDDEN,
          CODE: 'ACCESS_DENIED',
          TITLE: 'ACCESS_DENIED',
          MESSAGE: AUTHORIZATION_ERRORS.AUTHORIZATION_ERROR.MESSAGE,
        }),
      );
    }
    return next();
  };
}
