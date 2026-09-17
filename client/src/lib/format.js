import { format, parseISO } from 'date-fns';

const EMPTY = '—';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** Whole rupees. Change the locale and currency here to relocalise the app. */
export const formatCurrency = (amount) =>
  amount === null || amount === undefined || Number.isNaN(Number(amount))
    ? EMPTY
    : currencyFormatter.format(amount);

/** API dates arrive as `YYYY-MM-DD`; display them unambiguously. */
export const formatDate = (value) => {
  if (!value) return EMPTY;
  return format(typeof value === 'string' ? parseISO(value) : value, 'd MMM yyyy');
};

/** Human phrasing for the number the API already computed. */
export const formatDaysRemaining = (days) => {
  if (days === null || days === undefined) return EMPTY;
  if (days === 0) return 'Expires today';
  if (days < 0) {
    const elapsed = Math.abs(days);
    return `Expired ${elapsed} ${elapsed === 1 ? 'day' : 'days'} ago`;
  }
  return `${days} ${days === 1 ? 'day' : 'days'} left`;
};

export const initialsOf = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
