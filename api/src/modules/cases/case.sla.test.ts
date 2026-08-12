import { describe, expect, it } from 'vitest';

import {
  buildSlaFields,
  computeSlaStatus,
  computeStageDueAt,
  computeStageSlaStatus,
  daysToGuarantee,
} from './case.sla';

describe('case.sla', () => {
  it('computes stage due budgets', () => {
    const t0 = new Date('2026-01-01T00:00:00.000Z');
    expect(computeStageDueAt({
      stage: 'SUBMITTED',
      stageChangedAt: t0,
      filedAt: t0,
    })?.toISOString()).toBe('2026-01-06T00:00:00.000Z');
    expect(computeStageDueAt({
      stage: 'MEMO_ISSUED',
      stageChangedAt: t0,
    })?.toISOString()).toBe('2026-01-16T00:00:00.000Z');
    expect(computeStageDueAt({
      stage: 'DEMARCATION_DONE',
      stageChangedAt: t0,
    })?.toISOString()).toBe('2026-01-03T00:00:00.000Z');
    expect(computeStageDueAt({
      stage: 'ORDER_ISSUED',
      stageChangedAt: t0,
    })).toBeNull();
  });

  it('uses hearingAt for hearing scheduled due', () => {
    const hearing = new Date('2026-02-10T10:00:00.000Z');
    expect(computeStageDueAt({
      stage: 'HEARING_SCHEDULED',
      stageChangedAt: new Date('2026-02-01T00:00:00.000Z'),
      hearingAt: hearing,
    })?.toISOString()).toBe(hearing.toISOString());
  });

  it('computes guarantee day delta and sla status', () => {
    const due = new Date('2026-01-31T00:00:00.000Z');
    expect(daysToGuarantee(due, new Date('2026-01-21T12:00:00.000Z'))).toBe(10);
    expect(daysToGuarantee(due, new Date('2026-02-05T12:00:00.000Z'))).toBe(-5);
    expect(computeSlaStatus({
      stage: 'SUBMITTED',
      guaranteeDueAt: due,
      now: new Date('2026-02-05T00:00:00.000Z'),
    })).toBe('overdue');
    expect(computeSlaStatus({
      stage: 'ECOURT_UPLOADED',
      guaranteeDueAt: due,
      now: new Date('2026-02-05T00:00:00.000Z'),
    })).toBe('closed');
  });

  it('computes stage sla status', () => {
    expect(computeStageSlaStatus({ stageDueAt: null })).toBe('none');
    expect(computeStageSlaStatus({
      stageDueAt: new Date('2026-01-10T00:00:00.000Z'),
      now: new Date('2026-01-05T00:00:00.000Z'),
    })).toBe('on_track');
    expect(computeStageSlaStatus({
      stageDueAt: new Date('2026-01-01T00:00:00.000Z'),
      now: new Date('2026-01-05T00:00:00.000Z'),
    })).toBe('overdue');
  });

  it('builds sla payload', () => {
    const fields = buildSlaFields({
      stage: 'MEMO_ISSUED',
      guaranteeDueAt: new Date('2026-01-31T00:00:00.000Z'),
      stageDueAt: new Date('2026-01-20T00:00:00.000Z'),
      now: new Date('2026-01-15T00:00:00.000Z'),
    });
    expect(fields.slaStatus).toBe('on_track');
    expect(fields.daysToGuarantee).toBe(16);
    expect(fields.stageSlaStatus).toBe('on_track');
  });
});
