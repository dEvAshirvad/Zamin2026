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
    expect(canTransition({ from: 'DEMARCATION_DONE', to: 'ORDER_ISSUED', role: 'tehsildar' })).toBe(true);
    expect(canTransition({ from: 'DEMARCATION_DONE', to: 'ORDER_ISSUED', role: 'ri' })).toBe(false);
  });

  it('allows RI notice / objections / demarcation', () => {
    expect(canTransition({
      from: 'MEMO_ISSUED',
      to: 'HEARING_SCHEDULED',
      role: 'ri',
    })).toBe(true);
    expect(canTransition({
      from: 'HEARING_SCHEDULED',
      to: 'DEMARCATION_DONE',
      role: 'ri',
    })).toBe(true);
    expect(canTransition({
      from: 'HEARING_SCHEDULED',
      to: 'OBJECTIONS_WINDOW',
      role: 'ri',
    })).toBe(true);
  });

  it('rejects illegal jumps', () => {
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
      'OBJECTIONS_WINDOW',
      'DEMARCATION_DONE',
    ]);
    expect(allowedTargets('HEARING_SCHEDULED', 'tehsildar')).toEqual([]);
  });

  it('allows tehsildar or admin eCourt upload', () => {
    expect(canTransition({
      from: 'ORDER_ISSUED',
      to: 'ECOURT_UPLOADED',
      role: 'tehsildar',
    })).toBe(true);
    expect(canTransition({
      from: 'ORDER_ISSUED',
      to: 'ECOURT_UPLOADED',
      role: 'admin',
    })).toBe(true);
    expect(canTransition({
      from: 'ORDER_ISSUED',
      to: 'ECOURT_UPLOADED',
      role: 'ri',
    })).toBe(false);
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
