import { z } from 'zod';
import { MEMBERSHIP_STATUS } from '../../lib/membership.js';

const objectId = (message) => z.string().regex(/^[0-9a-fA-F]{24}$/, message);

/** Digits, spaces, dashes, parentheses and an optional leading +. */
const phoneField = z
  .string()
  .trim()
  .regex(/^\+?[0-9][0-9\s()-]{6,19}$/, 'Enter a valid phone number');

/** An empty string from an untouched optional input means "no value". */
const optionalText = (schema) =>
  z
    .union([z.literal(''), schema])
    .optional()
    .transform((value) => (value === '' ? undefined : value));

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

const emailField = z.string().trim().toLowerCase().email('Enter a valid email address');

export const createMemberSchema = z
  .object({
    name: z
      .string({ required_error: 'Name is required' })
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(80, 'Name must be 80 characters or fewer'),
    phone: optionalText(phoneField),
    email: optionalText(emailField),
    gender: z.enum(['male', 'female', 'other'], {
      errorMap: () => ({ message: 'Select a gender' }),
    }),
    packageId: objectId('Select a package'),
    startDate: isoDate.optional(),
    notes: optionalText(z.string().trim().max(500, 'Notes must be 500 characters or fewer')),
  })
  // Price is never accepted from the client — it comes from the package (SRS §2.3.2).
  .strip();

export const updateMemberSchema = createMemberSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });

export const renewMemberSchema = z.object({
  /** Omit to renew onto the same package. */
  packageId: objectId('Select a package').optional(),
});

export const listMembersQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.nativeEnum(MEMBERSHIP_STATUS).optional(),
  packageId: objectId('Invalid package filter').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['newest', 'oldest', 'name', 'endDate']).default('newest'),
});

export const memberIdParamsSchema = z.object({
  id: objectId('Invalid member id'),
});
