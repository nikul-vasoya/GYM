import { z } from 'zod';
import { passwordSchema } from '../../lib/password.js';
import { mobileField, optionalEmailField } from '../../lib/accountFields.js';

const objectId = (message) => z.string().regex(/^[0-9a-fA-F]{24}$/, message);

const name = z
  .string({ required_error: 'Name is required' })
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(80, 'Name must be 80 characters or fewer');

/**
 * A gym admin may create either kind of colleague. `superadmin` is not in
 * the enum at all, so no request can mint a platform operator.
 */
const role = z.enum(['admin', 'staff'], { errorMap: () => ({ message: 'Select a role' }) });

export const createStaffSchema = z
  .object({ name, phone: mobileField, email: optionalEmailField, password: passwordSchema, role })
  .strip();

/** Every field optional; an empty email removes it. The mobile cannot be removed. */
export const updateAccountSchema = z
  .object({ name: name.optional(), phone: mobileField.optional(), email: optionalEmailField })
  .strip()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Provide at least one field to update',
  });

/** Set by an administrator when someone has forgotten theirs. */
export const resetPasswordByAdminSchema = z.object({ password: passwordSchema });

export const staffIdParamsSchema = z.object({
  id: objectId('Invalid account id'),
});
