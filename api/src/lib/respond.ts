import type { Request, Response } from 'express';

import type { Link } from '@/lib/hateoas';
import type { PaginationResult } from '@/lib/paginator';

import { generatePaginationLinks } from '@/lib/hateoas';

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export interface RespondOptions {
  links?: Link[];
  meta?: Record<string, unknown>;
  serialize?: boolean;
}

export default function Respond(
  res: Response,
  data: unknown = {},
  status: number = 200,
  options: RespondOptions = {},
) {
  const { links = [], meta = {}, serialize = true } = options;
  const requestId = res.req ? (res.req as Request).id : undefined;

  const response: Record<string, unknown> = {
    success: true,
    data: serialize ? serializeData(data) : data,
  };

  if (
    data
    && typeof data === 'object'
    && 'pagination' in data
    && 'data' in data
  ) {
    const paginatedData = data as PaginationResult<unknown>;
    response.data = serialize ? serializeData(paginatedData.data) : paginatedData.data;
    response.meta = {
      ...meta,
      pagination: paginatedData.pagination,
    };

    if (res.req && links.length === 0) {
      const req = res.req as Request;
      response._links = generatePaginationLinks(
        req,
        paginatedData.pagination.page,
        paginatedData.pagination.totalPages,
        req.path,
      );
    }
  }
  else if (Object.keys(meta).length > 0) {
    response.meta = meta;
  }

  if (links.length > 0) {
    response._links = links;
  }

  if (requestId) {
    response.requestId = requestId;
  }

  return res.status(status).json(response);
}

function serializeData(data: unknown): unknown {
  if (Array.isArray(data)) {
    return data.map(item => serializeItem(item));
  }
  return serializeItem(data);
}

function serializeItem(item: unknown): unknown {
  if (!item || typeof item !== 'object') {
    return item;
  }

  const serialized = { ...item } as Record<string, unknown>;
  delete serialized.__v;
  const rawId = serialized._id;
  if (serialized.id === undefined && rawId) {
    serialized.id = String(rawId);
  }
  delete serialized._id;

  return serialized;
}

export function RespondWithLinks(
  res: Response,
  data: unknown,
  status: number,
  links: Link[],
  options: Omit<RespondOptions, 'links'> = {},
) {
  return Respond(res, data, status, { ...options, links });
}

export function RespondWithPagination<T>(
  res: Response,
  paginatedData: PaginationResult<T>,
  status: number = 200,
  options: Omit<RespondOptions, 'links'> = {},
) {
  return Respond(res, paginatedData, status, options);
}

export function RespondError(
  res: Response,
  error: ApiErrorBody & { requestId?: string },
  status: number = 500,
) {
  const requestId = error.requestId ?? (res.req ? (res.req as Request).id : undefined);
  return res.status(status).json({
    success: false,
    error: {
      code: error.code,
      message: error.message,
      ...(error.details !== undefined ? { details: error.details } : {}),
    },
    ...(requestId ? { requestId } : {}),
  });
}
