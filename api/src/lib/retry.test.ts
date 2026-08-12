import { describe, expect, it } from 'vitest';

import { retryWithBackoff } from './retry';

describe('retryWithBackoff', () => {
  it('retries until success', async () => {
    let attempts = 0;
    const result = await retryWithBackoff(async () => {
      attempts += 1;
      if (attempts < 3) {
        throw new Error('transient');
      }
      return 'ok';
    }, { maxAttempts: 3, baseMs: 1, maxMs: 2, jitter: false });

    expect(result).toBe('ok');
    expect(attempts).toBe(3);
  });
});
