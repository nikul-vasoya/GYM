import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/shared/FormField';
import { useCreateStaff } from './useStaff';
import { getErrorMessage, getFieldErrors } from '@/lib/api';
import { mobileField, optionalEmailField } from '@/features/accounts/accountSchemas';

/** Mirrors `server/src/features/staff/staff.schema.js`. */
const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(80, 'Name must be 80 characters or fewer'),
  phone: mobileField,
  email: optionalEmailField,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .refine(
      (value) => /[A-Za-z]/.test(value) && /[0-9]/.test(value),
      'Password must contain at least one letter and one number',
    ),
  role: z.enum(['admin', 'staff'], { errorMap: () => ({ message: 'Select a role' }) }),
});

const EMPTY = { name: '', phone: '', email: '', password: '', role: 'staff' };

export const StaffFormDialog = ({ open, onOpenChange }) => {
  const createStaff = useCreateStaff();
  const [formError, setFormError] = useState(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: EMPTY });

  useEffect(() => {
    if (open) {
      reset(EMPTY);
      setFormError(null);
    }
  }, [open, reset]);

  const onSubmit = async (values) => {
    setFormError(null);

    try {
      await createStaff.mutateAsync(values);
      onOpenChange(false);
    } catch (error) {
      const fieldErrors = getFieldErrors(error);
      const fields = Object.keys(fieldErrors);

      for (const field of fields) {
        setError(field, { type: 'server', message: fieldErrors[field] });
      }

      if (fields.length === 0) setFormError(getErrorMessage(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a staff account</DialogTitle>
          <DialogDescription>
            They sign in at the same page you do, with these credentials.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {formError && (
            <p
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive"
            >
              {formError}
            </p>
          )}

          <FormField label="Name" required error={errors.name?.message}>
            {(field) => <Input {...field} {...register('name')} placeholder="Full name" />}
          </FormField>

          <FormField label="Mobile number" required error={errors.phone?.message} hint="They sign in with this.">
            {(field) => (
              <Input {...field} {...register('phone')} type="tel" inputMode="tel" placeholder="9876543210" />
            )}
          </FormField>

          <FormField label="Email" error={errors.email?.message} hint="Optional.">
            {(field) => (
              <Input
                {...field}
                {...register('email')}
                type="email"
                placeholder="colleague@example.com"
              />
            )}
          </FormField>

          <FormField
            label="Temporary password"
            required
            error={errors.password?.message}
            hint="At least 8 characters, with a letter and a number."
          >
            {(field) => (
              <Input {...field} {...register('password')} type="text" autoComplete="off" />
            )}
          </FormField>

          <FormField
            label="Role"
            required
            error={errors.role?.message}
            hint="Administrators can also manage staff and change package prices."
          >
            {(field) => (
              <Controller
                control={control}
                name="role"
                render={({ field: control }) => (
                  <Select value={control.value} onValueChange={control.onChange}>
                    <SelectTrigger {...field} className="w-full">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </FormField>

          <DialogFooter className="gap-2.5 pt-2 sm:gap-2.5">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createStaff.isPending}>
              {createStaff.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Add account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
