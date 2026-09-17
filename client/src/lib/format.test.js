import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, formatDaysRemaining } from './format';

describe('formatCurrency', () => {
  it('formats whole rupees with no decimal noise', () => {
    expect(formatCurrency(4000)).toBe('₹4,000');
    expect(formatCurrency(1500)).toBe('₹1,500');
    expect(formatCurrency(0)).toBe('₹0');
  });

  it('renders a dash for a missing value instead of NaN', () => {
    expect(formatCurrency(null)).toBe('—');
    expect(formatCurrency(undefined)).toBe('—');
  });
});

describe('formatDate', () => {
  it('formats an API date string for display', () => {
    expect(formatDate('2026-03-15')).toBe('15 Mar 2026');
  });

  it('renders a dash for a missing value', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate('')).toBe('—');
  });
});

describe('formatDaysRemaining', () => {
  it('describes an active membership', () => {
    expect(formatDaysRemaining(12)).toBe('12 days left');
    expect(formatDaysRemaining(1)).toBe('1 day left');
  });

  it('describes the final day', () => {
    expect(formatDaysRemaining(0)).toBe('Expires today');
  });

  it('describes an expired membership', () => {
    expect(formatDaysRemaining(-1)).toBe('Expired 1 day ago');
    expect(formatDaysRemaining(-14)).toBe('Expired 14 days ago');
  });
});
