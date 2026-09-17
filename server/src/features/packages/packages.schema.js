import { z } from 'zod';

export const listPackagesQuerySchema = z.object({
  /** Settings shows retired packages; the member form must not. */
  includeInactive: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

export const updatePackageSchema = z
  .object({
    price: z.coerce.number().int('Price must be a whole number').min(0, 'Price cannot be negative').optional(),
    isActive: z.boolean().optional(),
    durationMonths: z.coerce.number().int().min(1, 'Duration must be at least 1 month').optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });
