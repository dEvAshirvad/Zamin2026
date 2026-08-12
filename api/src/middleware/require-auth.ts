import type { NextFunction, Request, Response } from 'express';

import { fromNodeHeaders } from 'better-auth/node';

import type { PlatformRole } from '@/lib/auth/roles';

import APIError from '@/configs/errors/APIError';
import { AUTHORIZATION_ERRORS } from '@/configs/errors/AUTHORIZATION_ERRORS';
import { auth } from '@/lib/auth';

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session?.user || !session.session) {
      return next(
        new APIError({
          ...AUTHORIZATION_ERRORS.AUTHORIZATION_ERROR,
        }),
      );
    }

    const user = session.user;
    const sessionRecord = session.session;

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      image: user.image,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      role: (user.role ?? null) as PlatformRole | null,
      tehsilId: (user.tehsilId ?? null) as string | null,
    };
    req.session = {
      id: sessionRecord.id,
      userId: sessionRecord.userId,
      token: sessionRecord.token,
      expiresAt: sessionRecord.expiresAt,
      createdAt: sessionRecord.createdAt,
      updatedAt: sessionRecord.updatedAt,
      ipAddress: sessionRecord.ipAddress,
      userAgent: sessionRecord.userAgent,
    };

    return next();
  }
  catch (error) {
    return next(error);
  }
}
