import { z } from 'zod';

import { User } from '../models/User.js';
import { ApiError } from './ApiError.js';
import { PHONE_PATTERN, normalizePhone } from './phone.js';

/** A required mobile number, stored normalised. */
export const mobileField = z
  .string({ required_error: 'Mobile number is required' })
  .trim()
  .min(1, 'Mobile number is required')
  .regex(PHONE_PATTERN, 'Enter a valid mobile number')
  .transform(normalizePhone);

/** An optional email; '' and null both mean "none". Undefined means "not sent". */
export const optionalEmailField = z
  .union([z.literal(''), z.null(), z.string().trim().toLowerCase().email('Enter a valid email address')])
  .optional()
  .transform((value) => (value === undefined ? undefined : value || null));

/**
 * Refuses a mobile number or email another account already signs in with.
 * Both are unique platform-wide because either one names the account at
 * sign-in. Reports the clashing field so the form can highlight it.
 */
export const assertAccountFree = async ({ phone, email }, exceptId) => {
  const except = exceptId ? { _id: { $ne: exceptId } } : {};

  if (phone && (await User.exists({ phone, ...except }))) {
    throw ApiError.conflict('An account with that mobile number already exists', {
      phone: 'An account with that mobile number already exists',
    });
  }
  if (email && (await User.exists({ email, ...except }))) {
    throw ApiError.conflict('An account with that email already exists', {
      email: 'An account with that email already exists',
    });
  }
};
