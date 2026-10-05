import { z } from 'zod';

export const listPackagesQuerySchema = z.object({
  /** Settings shows retired packages; the member form must not. */
  includeInactive: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

const name = z
  .string({ required_error: 'Plan name is required' })
  .trim()
  .min(2, 'Plan name must be at least 2 characters')
  .max(60, 'Plan name must be 60 characters or fewer');

const price = z.coerce
  .number({ invalid_type_error: 'Price must be a number' })
  .int('Price must be a whole number')
  .min(0, 'Price cannot be negative');

const durationMonths = z.coerce
  .number({ invalid_type_error: 'Duration must be a number' })
  .int('Duration must be a whole number of months')
  .min(1, 'Duration must be at least 1 month')
  .max(60, 'Duration must be 60 months or fewer');

/** An empty description clears it. */
const description = z
  .union([z.literal(''), z.null(), z.string().trim().max(200, 'Description must be 200 characters or fewer')])
  .optional()
  .transform((value) => (value === undefined ? undefined : value || null));

export const createPackageSchema = z
  .object({ name, durationMonths, price, description, isActive: z.boolean().optional() })
  .strip();

export const updatePackageSchema = z
  .object({
    name: name.optional(),
    price: price.optional(),
    durationMonths: durationMonths.optional(),
    description,
    isActive: z.boolean().optional(),
  })
  .strip()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Provide at least one field to update',
  });

export const packageIdParamsSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid package id'),
});
