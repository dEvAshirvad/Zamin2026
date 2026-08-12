export interface RetryOptions {
  maxAttempts?: number;
  baseMs?: number;
  maxMs?: number;
  jitter?: boolean;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function backoffMs(attempt: number, baseMs: number, maxMs: number, jitter: boolean): number {
  const exp = Math.min(maxMs, baseMs * 2 ** (attempt - 1));
  if (!jitter) {
    return exp;
  }
  return Math.floor(exp * (0.5 + Math.random() * 0.5));
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    baseMs = 200,
    maxMs = 5000,
    jitter = true,
    shouldRetry = () => true,
  } = options;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fn();
    }
    catch (error) {
      lastError = error;
      if (attempt >= maxAttempts || !shouldRetry(error, attempt)) {
        break;
      }
      await sleep(backoffMs(attempt, baseMs, maxMs, jitter));
    }
  }
  throw lastError;
}
