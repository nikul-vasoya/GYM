/**
 * One spelling per mobile number, so "98100 00001", "9810-000001" and
 * "9810000001" are the same account at sign-in and the same member on the
 * uniqueness index. Keeps a leading + for international numbers.
 */
export const normalizePhone = (value) => String(value ?? '').replace(/[\s()-]/g, '');

/** Digits, spaces, dashes, parentheses and an optional leading +; 7–20 characters. */
export const PHONE_PATTERN = /^\+?[0-9][0-9\s()-]{6,19}$/;
