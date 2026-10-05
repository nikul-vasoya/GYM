import {
  MEMBERSHIP_STATUS,
  REMINDER_DAYS_BY_DURATION,
  DEFAULT_REMINDER_DAYS,
} from '../../lib/membership.js';
import { addDaysUtc, todayUtc, toUtcMidnight } from '../../lib/dates.js';

/** Makes user input safe to drop into a RegExp — otherwise '.*' matches everyone. */
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The reminder thresholds expressed as Mongo-matchable groups.
 *
 * Derived from REMINDER_DAYS_BY_DURATION rather than hard-coded, so adding a
 * new threshold in `membership.js` automatically changes these queries too.
 */
const reminderGroups = () => {
  const specialDurations = Object.keys(REMINDER_DAYS_BY_DURATION).map(Number);

  return [
    ...specialDurations.map((duration) => ({
      match: { durationMonths: duration },
      windowDays: REMINDER_DAYS_BY_DURATION[duration],
    })),
    {
      match: { durationMonths: { $nin: specialDurations } },
      windowDays: DEFAULT_REMINDER_DAYS,
    },
  ];
};

export const buildSearchFilter = (search) => {
  const term = search?.trim();
  if (!term) return {};

  const pattern = new RegExp(escapeRegex(term), 'i');
  return { $or: [{ name: pattern }, { phone: pattern }, { email: pattern }] };
};

/**
 * Translates a membership status into a Mongo filter.
 *
 * The three statuses partition the member set exactly — every member matches
 * one and only one of them.
 */
export const buildStatusFilter = (status, today = todayUtc()) => {
  const start = toUtcMidnight(today);

  switch (status) {
    // SRS §3: end date has passed.
    case MEMBERSHIP_STATUS.EXPIRED:
      return { endDate: { $lt: start } };

    // SRS §4: still valid, but within the package's reminder window.
    case MEMBERSHIP_STATUS.EXPIRING_SOON:
      return {
        $or: reminderGroups().map(({ match, windowDays }) => ({
          ...match,
          endDate: { $gte: start, $lte: addDaysUtc(start, windowDays) },
        })),
      };

    // Valid and beyond the reminder window.
    case MEMBERSHIP_STATUS.ACTIVE:
      return {
        $or: reminderGroups().map(({ match, windowDays }) => ({
          ...match,
          endDate: { $gt: addDaysUtc(start, windowDays) },
        })),
      };

    default:
      return {};
  }
};

/**
 * Combines the member list filters.
 *
 * Search and status each produce a top-level `$or`. Merging them into one
 * object would let the second overwrite the first, silently widening the
 * result — so they are combined under `$and` instead.
 *
 * `gym` is always the first clause and always comes from the session, never
 * from the request: it is what keeps one gym's roster invisible to another.
 */
export const buildMemberFilter = ({ gym, search, status, packageId, today } = {}) => {
  const clauses = [
    gym ? { gym } : {},
    buildSearchFilter(search),
    buildStatusFilter(status, today),
    packageId ? { package: packageId } : {},
  ].filter((clause) => Object.keys(clause).length > 0);

  if (clauses.length === 0) return {};
  if (clauses.length === 1) return clauses[0];
  return { $and: clauses };
};
