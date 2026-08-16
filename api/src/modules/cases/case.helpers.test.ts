import { describe, expect, it } from 'vitest';

import {
  computeAlertStatus,
  computeFeeAmount,
  computeGuaranteeDueAt,
  computeReportDueAt,
  formatCaseNo,
  isCaseVisibleToPatwari,
  isCaseVisibleToRi,
  normalizeKhasraRows,
  normalizeNeighbors,
  sumRakba,
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

  it('computes report due +12h', () => {
    const done = new Date('2026-01-01T10:00:00.000Z');
    expect(computeReportDueAt(done).toISOString()).toBe(
      '2026-01-01T22:00:00.000Z',
    );
  });

  it('normalizes khasra rows and neighbors', () => {
    expect(normalizeKhasraRows([
      { khasraNumber: '12', rakba: 1.5 },
      { khasraNumber: '12', rakba: 2 },
      { khasraNumber: '13', rakba: 0.25 },
    ])).toEqual([
      { khasraNumber: '12', rakba: 1.5 },
      { khasraNumber: '13', rakba: 0.25 },
    ]);
    expect(sumRakba([
      { khasraNumber: '12', rakba: 1.5 },
      { khasraNumber: '13', rakba: 0.25 },
    ])).toBe(1.75);
    expect(normalizeNeighbors([
      { ownerName: 'A', address: 'X' },
      { ownerName: '', address: 'Y' },
    ])).toEqual([{ ownerName: 'A', address: 'X' }]);
  });

  it('shows RI/Patwari visibility for active and handoff stages', () => {
    expect(isCaseVisibleToRi({
      assignedRiId: 'ri-1',
      riUserId: 'ri-1',
      stage: 'MEMO_ISSUED',
    })).toBe(true);
    expect(isCaseVisibleToRi({
      assignedRiId: 'ri-1',
      riUserId: 'ri-1',
      stage: 'DEMARCATION_DONE',
    })).toBe(true);
    expect(isCaseVisibleToRi({
      assignedRiId: 'ri-1',
      riUserId: 'ri-1',
      stage: 'SUBMITTED',
    })).toBe(false);
    expect(isCaseVisibleToPatwari({
      assignedPatwariId: 'p-1',
      patwariUserId: 'p-1',
      stage: 'NOTICE_ISSUED',
    })).toBe(true);
  });

  it('computes OVERDUE alert after reportDueAt on DEMARCATION_DONE', () => {
    expect(computeAlertStatus({
      stage: 'DEMARCATION_DONE',
      reportDueAt: new Date('2026-01-01T12:00:00.000Z'),
      now: new Date('2026-01-01T13:00:00.000Z'),
    })).toBe('OVERDUE');
    expect(computeAlertStatus({
      stage: 'DEMARCATION_DONE',
      reportDueAt: new Date('2026-01-01T14:00:00.000Z'),
      now: new Date('2026-01-01T13:00:00.000Z'),
    })).toBe('none');
    expect(computeAlertStatus({
      stage: 'REPORT_SUBMITTED',
      reportDueAt: new Date('2026-01-01T12:00:00.000Z'),
      now: new Date('2026-01-01T13:00:00.000Z'),
    })).toBe('none');
  });
});
