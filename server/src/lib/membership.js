import {
  addDaysUtc,
  addMonthsUtc,
  differenceInDaysUtc,
  todayUtc,
  toUtcMidnight,
} from './dates.js';

/**
 * Every membership is in exactly one of these states.
 *
 * - ACTIVE        → shown in Members only
 * - EXPIRING_SOON → also shown in Action Required (SRS §4)
 * - EXPIRED       → also shown in Expiry (SRS §3)
 */
export const MEMBERSHIP_STATUS = {
  ACTIVE: 'active',
  EXPIRING_SOON: 'expiring-soon',
  EXPIRED: 'expired',
};

/** Reminder thresholds from SRS §4.2. Anything not listed uses the default. */
export const REMINDER_DAYS_BY_DURATION = { 1: 2 };
export const DEFAULT_REMINDER_DAYS = 5;

/** How many days before expiry a membership of this length starts warning. */
export const reminderDaysFor = (durationMonths) =>
  REMINDER_DAYS_BY_DURATION[durationMonths] ?? DEFAULT_REMINDER_DAYS;

/**
 * The last day the membership is valid (decision D6).
 *
 * A 1-month membership starting 1 Jan ends 31 Jan — one full month of access,
 * not a month and a day.
 */
export const calculateEndDate = (startDate, durationMonths) =>
  addDaysUtc(addMonthsUtc(startDate, durationMonths), -1);

/** Days left; 0 on the final day, negative once expired. */
export const daysUntilExpiry = (endDate, today = todayUtc()) =>
  differenceInDaysUtc(endDate, today);

/**
 * Classifies a membership. This is the single source of truth for status —
 * the client displays what this returns and never recomputes it.
 *
 * @param {{ endDate: Date|string, durationMonths: number }} membership
 * @param {Date|string} [today]
 */
export const getMembershipStatus = ({ endDate, durationMonths }, today = todayUtc()) => {
  const remaining = daysUntilExpiry(endDate, today);

  if (remaining < 0) return MEMBERSHIP_STATUS.EXPIRED;
  if (remaining <= reminderDaysFor(durationMonths)) return MEMBERSHIP_STATUS.EXPIRING_SOON;
  return MEMBERSHIP_STATUS.ACTIVE;
};

/**
 * Where a renewal's new period begins (decision D8).
 *
 * Renewing early continues from the existing end date, so the member is not
 * cheated out of days already paid for. Renewing after a lapse starts today,
 * so the gym is not giving away the lapsed period.
 */
export const nextRenewalStartDate = (currentEndDate, today = todayUtc()) => {
  const remaining = daysUntilExpiry(currentEndDate, today);
  return remaining >= 0 ? addDaysUtc(currentEndDate, 1) : toUtcMidnight(today);
};
