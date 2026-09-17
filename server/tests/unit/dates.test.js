import { describe, it, expect } from 'vitest';
import {
  toUtcMidnight,
  addDaysUtc,
  addMonthsUtc,
  differenceInDaysUtc,
  monthRangeUtc,
  toIsoDate,
} from '../../src/lib/dates.js';

describe('toUtcMidnight', () => {
  it('strips the time from an ISO date string', () => {
    expect(toIsoDate(toUtcMidnight('2026-03-15'))).toBe('2026-03-15');
  });

  it('strips the time from a timestamp', () => {
    expect(toIsoDate(toUtcMidnight('2026-03-15T18:45:12.000Z'))).toBe('2026-03-15');
  });

  it('throws on an unparseable value rather than returning Invalid Date', () => {
    expect(() => toUtcMidnight('not-a-date')).toThrow(/invalid date/i);
  });
});

describe('addDaysUtc', () => {
  it('adds days', () => {
    expect(toIsoDate(addDaysUtc('2026-03-15', 10))).toBe('2026-03-25');
  });

  it('subtracts with a negative count', () => {
    expect(toIsoDate(addDaysUtc('2026-03-01', -1))).toBe('2026-02-28');
  });

  it('crosses a year boundary', () => {
    expect(toIsoDate(addDaysUtc('2026-12-30', 5))).toBe('2027-01-04');
  });
});

describe('addMonthsUtc', () => {
  it('adds whole months', () => {
    expect(toIsoDate(addMonthsUtc('2026-01-15', 3))).toBe('2026-04-15');
  });

  it('crosses a year boundary', () => {
    expect(toIsoDate(addMonthsUtc('2026-06-10', 12))).toBe('2027-06-10');
  });

  it('clamps to the last day when the target month is shorter', () => {
    // 31 Jan + 1 month has no 31 Feb — clamp rather than roll into March.
    expect(toIsoDate(addMonthsUtc('2026-01-31', 1))).toBe('2026-02-28');
  });

  it('clamps correctly in a leap year', () => {
    expect(toIsoDate(addMonthsUtc('2028-01-31', 1))).toBe('2028-02-29');
  });
});

describe('differenceInDaysUtc', () => {
  it('counts whole days between two dates', () => {
    expect(differenceInDaysUtc('2026-03-20', '2026-03-15')).toBe(5);
  });

  it('returns a negative count when the first date is earlier', () => {
    expect(differenceInDaysUtc('2026-03-10', '2026-03-15')).toBe(-5);
  });

  it('returns zero for the same day regardless of time of day', () => {
    expect(differenceInDaysUtc('2026-03-15T23:59:00Z', '2026-03-15T00:01:00Z')).toBe(0);
  });
});

describe('monthRangeUtc', () => {
  it('returns a half-open range covering the month', () => {
    const { start, end } = monthRangeUtc('2026-02');

    expect(toIsoDate(start)).toBe('2026-02-01');
    expect(toIsoDate(end)).toBe('2026-03-01');
  });

  it('handles December rolling into the next year', () => {
    const { start, end } = monthRangeUtc('2026-12');

    expect(toIsoDate(start)).toBe('2026-12-01');
    expect(toIsoDate(end)).toBe('2027-01-01');
  });

  it('rejects a malformed month', () => {
    expect(() => monthRangeUtc('2026-13')).toThrow(/YYYY-MM/);
    expect(() => monthRangeUtc('Feb 2026')).toThrow(/YYYY-MM/);
  });
});
