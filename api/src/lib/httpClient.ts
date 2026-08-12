import { config } from '@/configs/env';
import logger from '@/configs/logger/winston';

export interface HttpClientOptions {
  baseURL?: string;
  timeoutMs?: number;
}

export interface HttpClientRequestOptions extends RequestInit {
  timeoutMs?: number;
}

function buildUrl(pathOrUrl: string, baseURL?: string): string {
  if (!baseURL) {
    return pathOrUrl;
  }
  return new URL(pathOrUrl, baseURL).toString();
}

export async function httpRequest<T = unknown>(
  pathOrUrl: string,
  options: HttpClientRequestOptions & HttpClientOptions = {},
): Promise<T> {
  const { baseURL, timeoutMs = config.httpClientTimeoutMs, ...fetchOptions } = options;
  const url = buildUrl(pathOrUrl, baseURL);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  logger.debug('http_request', {
    method: fetchOptions.method?.toUpperCase() ?? 'GET',
    url,
    timeoutMs,
  });

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: fetchOptions.signal ?? controller.signal,
    });
    if (!response.ok) {
      let errorDetail = `HTTP request failed with status ${response.status}`;
      try {
        const errorBody = await response.json() as { detail?: string; message?: string };
        if (errorBody.detail) {
          errorDetail = `${errorDetail}: ${errorBody.detail}`;
        }
        else if (errorBody.message) {
          errorDetail = `${errorDetail}: ${errorBody.message}`;
        }
      }
      catch {
        // response body is not JSON
      }
      throw new Error(errorDetail);
    }
    return (await response.json()) as T;
  }
  catch (error) {
    const cause = error instanceof Error && 'cause' in error
      ? String((error as Error & { cause?: unknown }).cause)
      : undefined;
    logger.error('http_request_failed', {
      url,
      message: error instanceof Error ? error.message : String(error),
      cause,
    });
    throw error;
  }
  finally {
    clearTimeout(timeout);
  }
}

export async function httpGet<T = unknown>(
  url: string,
  options?: HttpClientRequestOptions & HttpClientOptions,
): Promise<T> {
  return httpRequest<T>(url, { ...options, method: 'GET' });
}
