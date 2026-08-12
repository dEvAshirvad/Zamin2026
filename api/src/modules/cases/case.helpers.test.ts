import { describe, expect, it } from 'vitest';

import {
  computeFeeAmount,
  computeGuaranteeDueAt,
  formatCaseNo,
  isCaseVisibleToRi,
  normalizeKhasras,
} from './case.helpers';

describe('case.helpers', () => {
  it('computes fee at 50 per khasra', () => {
    expect(computeFeeAmount(0)).toBe(0);
    expect(computeFeeAmount(1)).toBe(50);
    expect(computeFeeAmount(3)).toBe(150);
  });

  it('formats case numbers', () => {
    expect(formatCaseNo('seoni', 2026, 1)).toBe('SEONI-2026-0001');
    expect(formatCaseNo('seoni-malwa', 2026, 42)).toBe('SEONI-MALWA-2026-0042');
  });

  it('adds 30 days for guarantee due date', () => {
    const filed = new Date('2026-01-01T00:00:00.000Z');
    expect(computeGuaranteeDueAt(filed).toISOString()).toBe(
      '2026-01-31T00:00:00.000Z',
    );
  });

  it('normalizes khasra lists', () => {
    expect(normalizeKhasras('12, 13\n14')).toEqual(['12', '13', '14']);
    expect(normalizeKhasras(['12', '12', ' 13 '])).toEqual(['12', '13']);
  });

  it('shows RI only assigned cases while RI work is active', () => {
    expect(isCaseVisibleToRi({
      assignedRiId: 'ri-1',
      riUserId: 'ri-1',
      stage: 'MEMO_ISSUED',
    })).toBe(true);
    expect(isCaseVisibleToRi({
      assignedRiId: 'ri-1',
      riUserId: 'ri-1',
      stage: 'OBJECTIONS_WINDOW',
    })).toBe(true);
    expect(isCaseVisibleToRi({
      assignedRiId: 'ri-2',
      riUserId: 'ri-1',
      stage: 'MEMO_ISSUED',
    })).toBe(false);
    expect(isCaseVisibleToRi({
      assignedRiId: 'ri-1',
      riUserId: 'ri-1',
      stage: 'SUBMITTED',
    })).toBe(false);
    expect(isCaseVisibleToRi({
      assignedRiId: 'ri-1',
      riUserId: 'ri-1',
      stage: 'DEMARCATION_DONE',
    })).toBe(false);
  });
});
