import type {
  ErrorType,
  HttpErrorStatusCode,
  IAPIError,
} from '@/types/errors/errors.types';

export default class APIError extends Error {
  statusCode: HttpErrorStatusCode;
  code: string;
  title: string;
  errors?: ErrorType;
  success: boolean;
  isOperational: boolean;
  meta?: Record<string, unknown>;

  constructor(option: IAPIError) {
    super(option?.MESSAGE);
    Object.setPrototypeOf(this, APIError.prototype);
    this.code = option.CODE || option.TITLE;
    this.title = option.TITLE;
    this.statusCode = option.STATUS;
    this.success = false;
    this.errors = option.ERRORS || [];
    this.meta = option.META || {};
    this.isOperational = true;
  }

  serializeError(requestId?: string) {
    const details = (this.errors && (Array.isArray(this.errors) ? this.errors.length > 0 : Object.keys(this.errors).length > 0))
      ? this.errors
      : (Object.keys(this.meta || {}).length > 0 ? this.meta : undefined);

    return {
      code: this.code,
      message: this.message || this.title,
      ...(details !== undefined ? { details } : {}),
      requestId,
    };
  }

  toString() {
    return (
      `APIError: ${
        this.statusCode
      } - ${
        this.title
      } - ${
        this.message
      }\n`
    );
  }
}
