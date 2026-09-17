import { describe, it, expect } from 'vitest';
import {
  MEMBERSHIP_STATUS,
  reminderDaysFor,
  calculateEndDate,
  daysUntilExpiry,
  getMembershipStatus,
  nextRenewalStartDate,
} from '../../src/lib/membership.js';
import { toIsoDate } from '../../src/lib/dates.js';

const TODAY = '2026-03-15';

describe('reminderDaysFor', () => {
  // SRS §4.2
  it('warns 2 days before expiry for a 1-month package', () => {
    expect(reminderDaysFor(1)).toBe(2);
  });

  it('warns 5 days before expiry for 3, 6 and 12-month packages', () => {
    expect(reminderDaysFor(3)).toBe(5);
    expect(reminderDaysFor(6)).toBe(5);
    expect(reminderDaysFor(12)).toBe(5);
  });

  it('falls back to 5 days for a duration the gym adds later', () => {
    expect(reminderDaysFor(24)).toBe(5);
  });
});

describe('calculateEndDate', () => {
  // Decision D6: end date is the LAST day of access.
  it('ends a 1-month package on the last day of that month', () => {
    expect(toIsoDate(calculateEndDate('2026-01-01', 1))).toBe('2026-01-31');
  });

  it('ends a 3-month package one day before the 3-month anniversary', () => {
    expect(toIsoDate(calculateEndDate('2026-01-01', 3))).toBe('2026-03-31');
  });

  it('handles a 6-month package', () => {
    expect(toIsoDate(calculateEndDate('2026-01-15', 6))).toBe('2026-07-14');
  });

  it('handles a 12-month package across a year boundary', () => {
    expect(toIsoDate(calculateEndDate('2026-06-10', 12))).toBe('2027-06-09');
  });

  it('clamps a month-end start date rather than overflowing', () => {
    // 31 Jan + 1 month clamps to 28 Feb, minus a day is 27 Feb.
    // Documented behaviour — see the note in the plan under decision D6.
    expect(toIsoDate(calculateEndDate('2026-01-31', 1))).toBe('2026-02-27');
  });
});

describe('daysUntilExpiry', () => {
  it('counts the days left', () => {
    expect(daysUntilExpiry('2026-03-20', TODAY)).toBe(5);
  });

  it('returns 0 on the final day of the membership', () => {
    expect(daysUntilExpiry(TODAY, TODAY)).toBe(0);
  });

  it('returns a negative number once expired', () => {
    expect(daysUntilExpiry('2026-03-10', TODAY)).toBe(-5);
  });
});

describe('getMembershipStatus', () => {
  const statusOf = (endDate, durationMonths) =>
    getMembershipStatus({ endDate, durationMonths }, TODAY);

  it('is active when expiry is far away', () => {
    expect(statusOf('2026-06-30', 3)).toBe(MEMBERSHIP_STATUS.ACTIVE);
  });

  it('is expired the day after the end date', () => {
    expect(statusOf('2026-03-14', 3)).toBe(MEMBERSHIP_STATUS.EXPIRED);
  });

  it('is still expiring-soon, not expired, on the final day', () => {
    expect(statusOf(TODAY, 3)).toBe(MEMBERSHIP_STATUS.EXPIRING_SOON);
  });

  // SRS §4.4 worked example.
  it('flags a 3-month package expiring in exactly 5 days', () => {
    expect(statusOf('2026-03-20', 3)).toBe(MEMBERSHIP_STATUS.EXPIRING_SOON);
  });

  it('does not flag a 3-month package expiring in 6 days', () => {
    expect(statusOf('2026-03-21', 3)).toBe(MEMBERSHIP_STATUS.ACTIVE);
  });

  it('flags a 1-month package expiring in exactly 2 days', () => {
    expect(statusOf('2026-03-17', 1)).toBe(MEMBERSHIP_STATUS.EXPIRING_SOON);
  });

  it('does not flag a 1-month package expiring in 3 days', () => {
    expect(statusOf('2026-03-18', 1)).toBe(MEMBERSHIP_STATUS.ACTIVE);
  });

  it('uses the 5-day window for a 12-month package', () => {
    expect(statusOf('2026-03-20', 12)).toBe(MEMBERSHIP_STATUS.EXPIRING_SOON);
    expect(statusOf('2026-03-21', 12)).toBe(MEMBERSHIP_STATUS.ACTIVE);
  });
});

describe('nextRenewalStartDate', () => {
  // Decision D8.
  it('starts the day after the old end date when renewing early', () => {
    expect(toIsoDate(nextRenewalStartDate('2026-03-20', TODAY))).toBe('2026-03-21');
  });

  it('starts the day after when renewing on the final day', () => {
    expect(toIsoDate(nextRenewalStartDate(TODAY, TODAY))).toBe('2026-03-16');
  });

  it('starts today when renewing after a lapse, not backdated', () => {
    expect(toIsoDate(nextRenewalStartDate('2026-01-31', TODAY))).toBe(TODAY);
  });
});
