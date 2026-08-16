import { describe, expect, it } from 'vitest';

import {
  allowedTargets,
  canTransition,
  pickLeastLoadedRi,
} from './case.transitions';

describe('case.transitions', () => {
  it('allows tehsildar memo and order only', () => {
    expect(canTransition({ from: 'SUBMITTED', to: 'MEMO_ISSUED', role: 'tehsildar' })).toBe(true);
    expect(canTransition({ from: 'SUBMITTED', to: 'MEMO_ISSUED', role: 'ri' })).toBe(false);
    expect(canTransition({
      from: 'REPORT_SUBMITTED',
      to: 'ORDER_ISSUED',
      role: 'tehsildar',
    })).toBe(true);
    expect(canTransition({
      from: 'REPORT_SUBMITTED',
      to: 'ORDER_ISSUED',
      role: 'ri',
    })).toBe(false);
  });

  it('allows RI and Patwari notice / demarcation / report', () => {
    expect(canTransition({
      from: 'MEMO_ISSUED',
      to: 'HEARING_SCHEDULED',
      role: 'ri',
    })).toBe(true);
    expect(canTransition({
      from: 'MEMO_ISSUED',
      to: 'HEARING_SCHEDULED',
      role: 'patwari',
    })).toBe(true);
    expect(canTransition({
      from: 'MEMO_ISSUED',
      to: 'NOTICE_ISSUED',
      role: 'ri',
    })).toBe(false);
    expect(canTransition({
      from: 'NOTICE_ISSUED',
      to: 'HEARING_SCHEDULED',
      role: 'ri',
    })).toBe(true);
    expect(canTransition({
      from: 'HEARING_SCHEDULED',
      to: 'DEMARCATION_WINDOW_OPEN',
      role: 'ri',
    })).toBe(true);
    expect(canTransition({
      from: 'HEARING_SCHEDULED',
      to: 'OBJECTION_CLOSED',
      role: 'patwari',
    })).toBe(true);
    expect(canTransition({
      from: 'DEMARCATION_DONE',
      to: 'REPORT_SUBMITTED',
      role: 'ri',
    })).toBe(true);
  });

  it('rejects illegal jumps and eCourt', () => {
    expect(canTransition({
      from: 'SUBMITTED',
      to: 'ORDER_ISSUED',
      role: 'tehsildar',
    })).toBe(false);
    expect(canTransition({
      from: 'MEMO_ISSUED',
      to: 'DEMARCATION_DONE',
      role: 'ri',
    })).toBe(false);
  });

  it('lists role-filtered targets', () => {
    expect(allowedTargets('HEARING_SCHEDULED', 'ri')).toEqual([
      'OBJECTION_CLOSED',
      'DEMARCATION_WINDOW_OPEN',
    ]);
    expect(allowedTargets('HEARING_SCHEDULED', 'tehsildar')).toEqual([]);
    expect(allowedTargets('ORDER_ISSUED', 'tehsildar')).toEqual([]);
  });

  it('picks least-loaded RI with stable tie-break', () => {
    expect(pickLeastLoadedRi([])).toBeNull();
    expect(pickLeastLoadedRi([
      { id: 'b', openCount: 2 },
      { id: 'a', openCount: 1 },
      { id: 'c', openCount: 1 },
    ])).toBe('a');
  });
});
