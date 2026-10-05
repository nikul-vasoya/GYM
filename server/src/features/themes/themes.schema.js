import { z } from 'zod';

const hex = (label) =>
  z
    .string({ required_error: `${label} is required` })
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, `${label} must be a colour like #2563eb`)
    .transform((value) => value.toLowerCase());

const name = z
  .string({ required_error: 'Theme name is required' })
  .trim()
  .min(2, 'Theme name must be at least 2 characters')
  .max(40, 'Theme name must be 40 characters or fewer');

/**
 * An empty accent means "derive one from the primary" and is stored as null.
 * Left out entirely, it stays undefined, so an edit does not clear it.
 */
const accent = z
  .union([z.literal(''), z.null(), hex('Accent colour')])
  .optional()
  .transform((value) => (value === undefined ? undefined : value || null));

export const createThemeSchema = z
  .object({ name, primary: hex('Primary colour'), accent })
  .strip();

export const updateThemeSchema = z
  .object({ name: name.optional(), primary: hex('Primary colour').optional(), accent })
  .strip();

export const themeIdParamsSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid theme id'),
});
