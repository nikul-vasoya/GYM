import { z } from 'zod';

const objectId = (message) => z.string().regex(/^[0-9a-fA-F]{24}$/, message);

const isoDate = z
  .string({ required_error: 'Date is required' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

export const createExpenseSchema = z.object({
  date: isoDate,
  description: z
    .string({ required_error: 'Description is required' })
    .trim()
    .min(2, 'Description must be at least 2 characters')
    .max(200, 'Description must be 200 characters or fewer'),
  amount: z.coerce
    .number({ invalid_type_error: 'Amount must be a number' })
    .int('Amount must be a whole number')
    .min(1, 'Amount must be greater than zero'),
});

export const updateExpenseSchema = createExpenseSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });

export const listExpensesQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format')
    .optional(),
});

export const expenseIdParamsSchema = z.object({
  id: objectId('Invalid expense id'),
});
