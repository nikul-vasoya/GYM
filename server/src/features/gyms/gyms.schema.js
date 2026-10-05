import { z } from 'zod';
import { passwordSchema } from '../../lib/password.js';
import { SLUG_PATTERN, isReservedSlug } from '../../lib/reservedSlugs.js';
import { mobileField, optionalEmailField } from '../../lib/accountFields.js';

const objectId = (message) => z.string().regex(/^[0-9a-fA-F]{24}$/, message);

/** An empty string from an untouched optional input means "no value". */
const optionalText = (schema) =>
  z
    .union([z.literal(''), schema])
    .optional()
    .transform((value) => (value === '' ? undefined : value));

const gymName = z
  .string({ required_error: 'Gym name is required' })
  .trim()
  .min(2, 'Gym name must be at least 2 characters')
  .max(80, 'Gym name must be 80 characters or fewer');

const contactEmail = z.string().trim().toLowerCase().email('Enter a valid email address');

const contactPhone = z
  .string()
  .trim()
  .regex(/^\+?[0-9][0-9\s()-]{6,19}$/, 'Enter a valid phone number');

const address = z.string().trim().max(200, 'Address must be 200 characters or fewer');

/** The gym's address in the client: `/<slug>/login`. */
const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(SLUG_PATTERN, 'Use 1–40 lowercase letters, numbers and hyphens (not at either end)')
  .refine((value) => !isReservedSlug(value), 'That address is reserved. Choose another.');

const themeId = objectId('Choose a theme');

export const createGymSchema = z
  .object({
    name: gymName,
    contactEmail: optionalText(contactEmail),
    contactPhone: optionalText(contactPhone),
    address: optionalText(address),
    /** Derived from the name when left out. */
    slug: optionalText(slug),
    /** The default theme when left out. */
    theme: optionalText(themeId),

    /** The gym's first administrator, created with the gym itself. */
    admin: z.object({
      name: z
        .string({ required_error: "The administrator's name is required" })
        .trim()
        .min(2, 'Name must be at least 2 characters')
        .max(80, 'Name must be 80 characters or fewer'),
      /** The owner signs in with this mobile number. */
      phone: mobileField,
      email: optionalEmailField,
      password: passwordSchema,
    }),
  })
  .strip();

/**
 * Every field optional: the edit sheet sends only what it shows. An empty
 * contact field clears it, which is why those map '' to null rather than
 * leaving the stored value alone.
 */
const clearableText = (schema) =>
  z
    .union([z.literal(''), z.null(), schema])
    .optional()
    .transform((value) => (value === undefined ? undefined : value || null));

export const updateGymSchema = z
  .object({
    name: gymName.optional(),
    slug: slug.optional(),
    theme: themeId.optional(),
    contactEmail: clearableText(contactEmail),
    contactPhone: clearableText(contactPhone),
    address: clearableText(address),
  })
  .strip();

export const updateGymStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'Provide the new status' }),
});

export const gymIdParamsSchema = z.object({
  id: objectId('Invalid gym id'),
});
