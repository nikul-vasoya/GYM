import { z } from 'zod';

/** Mirrors `server/src/lib/phone.js`. */
export const PHONE_PATTERN = /^\+?[0-9][0-9\s()-]{6,19}$/;

export const mobileField = z
  .string()
  .trim()
  .min(1, 'Mobile number is required')
  .regex(PHONE_PATTERN, 'Enter a valid mobile number');

/** Optional: an empty box means "no email". */
export const optionalEmailField = z.union([
  z.literal(''),
  z.string().trim().email('Enter a valid email address'),
]);

/** Mirrors the server policy in `server/src/lib/password.js`. */
export const passwordField = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .refine(
    (value) => /[A-Za-z]/.test(value) && /[0-9]/.test(value),
    'Password must contain at least one letter and one number',
  );
