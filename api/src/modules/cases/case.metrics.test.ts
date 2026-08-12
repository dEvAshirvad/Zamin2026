import { describe, expect, it } from 'vitest';

import { overdueCaseMatch } from './case.sla';

describe('overdueCaseMatch', () => {
  it('matches past guarantee and not eCourt', () => {
    const now = new Date('2026-02-01T00:00:00.000Z');
    expect(overdueCaseMatch(now)).toEqual({
      guaranteeDueAt: { $lt: now },
      stage: { $ne: 'ECOURT_UPLOADED' },
    });
  });
});
