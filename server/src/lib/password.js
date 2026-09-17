import bcrypt from 'bcryptjs';
import { z } from 'zod';

const SALT_ROUNDS = 10;

/**
 * The single definition of the password policy (decision D2).
 *
 * Reused by the reset-password endpoint, the seed script and — mirrored in
 * `client/src/features/auth` — the reset form, so the rules can never drift.
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .refine(
    (value) => /[A-Za-z]/.test(value) && /[0-9]/.test(value),
    'Password must contain at least one letter and one number',
  );

export const hashPassword = (plainText) => bcrypt.hash(plainText, SALT_ROUNDS);

/**
 * Compares a plaintext password against a stored hash.
 *
 * Returns false (never throws) for a missing hash, so a login attempt for a
 * half-created account behaves like any other failed login.
 */
export const verifyPassword = async (plainText, hash) => {
  if (!hash) return false;
  return bcrypt.compare(plainText, hash);
};

/**
 * A real bcrypt hash of a throwaway value, compared against when no user is
 * found so that a failed login costs the same whether the account exists or
 * not. Without this, response time alone reveals which emails are registered.
 */
const DUMMY_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

export const verifyPasswordConstantTime = async (plainText, hash) =>
  bcrypt.compare(plainText, hash ?? DUMMY_HASH);
