import type { NextFunction, Request, Response } from 'express';

import { describe, expect, it, vi } from 'vitest';

import APIError from '@/configs/errors/APIError';
import { CORE_ERRORS } from '@/configs/errors/CORE_ERRORS';
import { errorHandler } from '@/middleware/error-handler';

function createMockRes() {
  const res = {
    headersSent: false,
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
    body: undefined as unknown,
    req: { id: 'req-test-1' } as Request,
  };
  return res as Response & { body: unknown };
}

describe('errorHandler', () => {
  it('serializes APIError to standard envelope', () => {
    const req = { id: 'req-test-1' } as Request;
    const res = createMockRes();
    const next = vi.fn() as NextFunction;

    errorHandler(
      new APIError({ ...CORE_ERRORS.NOT_FOUND }),
      req,
      res,
      next,
    );

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource was not found.',
      },
      requestId: 'req-test-1',
    });
  });
});
