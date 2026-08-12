export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeoutMs?: number;
}

export class CircuitBreaker {
  private failures = 0;
  private openedAt: number | null = null;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 30_000;
  }

  private state(): 'closed' | 'open' | 'half-open' {
    if (this.openedAt === null) {
      return 'closed';
    }
    if (Date.now() - this.openedAt >= this.resetTimeoutMs) {
      return 'half-open';
    }
    return 'open';
  }

  async exec<T>(fn: () => Promise<T>): Promise<T> {
    const current = this.state();
    if (current === 'open') {
      throw new Error('Circuit breaker is open');
    }

    try {
      const result = await fn();
      this.failures = 0;
      this.openedAt = null;
      return result;
    }
    catch (error) {
      this.failures += 1;
      if (this.failures >= this.failureThreshold) {
        this.openedAt = Date.now();
      }
      throw error;
    }
  }
}
