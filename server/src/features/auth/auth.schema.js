import { z } from 'zod';
import { passwordSchema } from '../../lib/password.js';

const emailField = z
  .string({ required_error: 'Email is required' })
  .trim()
  .toLowerCase()
  .email('Enter a valid email address');

export const loginSchema = z
  .object({
  /** A mobile number or an email. `email` is still accepted from older clients. */
  identifier: z.string().trim().max(120).optional(),
  email: z.string().trim().max(120).optional(),
  // Deliberately NOT passwordSchema: an old account may predate the policy,
  // and telling a login attempt about policy rules leaks information.
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
  /**
   * Which door the credentials came through. The two sign-in screens are
   * separate on purpose: a gym's staff should never be able to sign in on
   * the platform screen, and the platform operator should not land in a gym.
   */
  scope: z.enum(['gym', 'platform']).default('gym'),
  /**
   * The gym whose sign-in page the credentials came from (`/<slug>/login`).
   * Optional: the unbranded `/login` page sends none.
   */
  gymSlug: z.string().trim().toLowerCase().max(40).optional(),
  })
  .transform(({ email, identifier, ...rest }) => ({ ...rest, identifier: identifier || email || '' }))
  .refine((data) => data.identifier.length > 0, {
    message: 'Enter your mobile number or email',
    path: ['identifier'],
  });

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export const resetPasswordSchema = z
  .object({
    token: z.string({ required_error: 'Reset token is required' }).min(1, 'Reset token is required'),
    password: passwordSchema,
    confirmPassword: z.string({ required_error: 'Please confirm your password' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
