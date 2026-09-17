const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Normalises any date-ish value to midnight UTC.
 *
 * Every date in this application passes through here before it is stored,
 * compared or returned, so a "day" always means the same 24 hours no matter
 * where the code runs.
 *
 * @param {Date|string|number} value
 * @returns {Date}
 */
export const toUtcMidnight = (value) => {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`Invalid date: ${String(value)}`);
  }

  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
};

/** Midnight UTC on the current day. */
export const todayUtc = () => toUtcMidnight(new Date());

/** `YYYY-MM-DD` — the form used in URLs, form inputs and test assertions. */
export const toIsoDate = (value) => toUtcMidnight(value).toISOString().slice(0, 10);

/** UTC has no daylight saving, so plain millisecond arithmetic is exact. */
export const addDaysUtc = (value, days) =>
  new Date(toUtcMidnight(value).getTime() + days * MS_PER_DAY);

/**
 * Adds calendar months, clamping to the last valid day of the target month.
 *
 * 31 Jan + 1 month is 28 Feb, not 3 Mar — the naive result would silently
 * extend a membership past the month the member paid for.
 */
export const addMonthsUtc = (value, months) => {
  const date = toUtcMidnight(value);
  const targetMonthIndex = date.getUTCMonth() + months;

  const result = new Date(
    Date.UTC(date.getUTCFullYear(), targetMonthIndex, date.getUTCDate()),
  );

  const expectedMonth = ((targetMonthIndex % 12) + 12) % 12;
  if (result.getUTCMonth() !== expectedMonth) {
    // Overflowed into the following month — step back to the last valid day.
    result.setUTCDate(0);
  }

  return result;
};

/** Whole days from `to` to `from`; positive when `from` is later. */
export const differenceInDaysUtc = (from, to) =>
  Math.round((toUtcMidnight(from).getTime() - toUtcMidnight(to).getTime()) / MS_PER_DAY);

/**
 * Half-open `[start, end)` range for a `YYYY-MM` month.
 *
 * Half-open rather than inclusive so a Mongo query is `$gte: start, $lt: end`
 * and no expense recorded late on the last day of the month can slip out.
 */
export const monthRangeUtc = (month) => {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(String(month));

  if (!match) {
    throw new TypeError(`Month must be in YYYY-MM format, received: ${String(month)}`);
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;

  return {
    start: new Date(Date.UTC(year, monthIndex, 1)),
    end: new Date(Date.UTC(year, monthIndex + 1, 1)),
  };
};
