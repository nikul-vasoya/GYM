import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/shared/FormField';
import { api, getErrorMessage, getFieldErrors } from '@/lib/api';
import { mobileField, optionalEmailField, passwordField } from './accountSchemas';

/*
 * Two dialogs for looking after someone's sign-in: change their name,
 * mobile or email, and set a new password when they have forgotten theirs.
 *
 * Used by a gym admin on the Staff page (`/staff/:id`) and by the platform
 * administrator for a gym's accounts (`/gyms/:gymId/accounts/:id`) — the
 * caller passes `basePath` and the query keys to refresh.
 */

const useAccountMutation = ({ invalidate, success }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ method, url, body }) => {
      const { data } = await api[method](url, body);
      return data;
    },
    onSuccess: () => {
      for (const key of invalidate) queryClient.invalidateQueries({ queryKey: key });
      toast.success(success);
    },
    onError: (error) => {
      if (!error?.response?.data?.error?.details) toast.error(getErrorMessage(error));
    },
  });
};

const applyServerErrors = (error, setError, setFormError) => {
  const fieldErrors = getFieldErrors(error);
  const fields = Object.keys(fieldErrors);
  for (const field of fields) setError(field, { type: 'server', message: fieldErrors[field] });
  if (fields.length === 0) setFormError(getErrorMessage(error));
};

const editSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80, 'Name must be 80 characters or fewer'),
  phone: mobileField,
  email: optionalEmailField,
});

export const EditAccountDialog = ({ account, basePath, invalidate, open, onOpenChange }) => {
  const save = useAccountMutation({ invalidate, success: 'Account saved' });
  const [formError, setFormError] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(editSchema) });

  useEffect(() => {
    if (open && account) {
      reset({ name: account.name ?? '', phone: account.phone ?? '', email: account.email ?? '' });
      setFormError(null);
    }
  }, [open, account, reset]);

  const onSubmit = async (values) => {
    setFormError(null);
    try {
      await save.mutateAsync({ method: 'patch', url: `${basePath}/${account.id}`, body: values });
      onOpenChange(false);
    } catch (error) {
      applyServerErrors(error, setError, setFormError);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {account?.name}</DialogTitle>
          <DialogDescription>They sign in with their mobile number, or their email if they have one.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {formError && <p role="alert" className="text-sm font-medium text-destructive">{formError}</p>}

          <FormField label="Name" required error={errors.name?.message}>
            {(field) => <Input {...field} {...register('name')} />}
          </FormField>
          <FormField label="Mobile number" required error={errors.phone?.message}>
            {(field) => <Input {...field} {...register('phone')} type="tel" inputMode="tel" placeholder="9876543210" />}
          </FormField>
          <FormField label="Email" error={errors.email?.message} hint="Optional.">
            {(field) => <Input {...field} {...register('email')} type="email" />}
          </FormField>

          <DialogFooter className="gap-2.5 pt-2 sm:gap-2.5">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const resetSchema = z.object({ password: passwordField });

export const ResetPasswordDialog = ({ account, basePath, invalidate = [], open, onOpenChange }) => {
  const save = useAccountMutation({ invalidate, success: 'Password updated. Share it with them privately.' });
  const [formError, setFormError] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(resetSchema), defaultValues: { password: '' } });

  useEffect(() => {
    if (open) {
      reset({ password: '' });
      setFormError(null);
    }
  }, [open, reset]);

  const onSubmit = async (values) => {
    setFormError(null);
    try {
      await save.mutateAsync({ method: 'put', url: `${basePath}/${account.id}/password`, body: values });
      onOpenChange(false);
    } catch (error) {
      applyServerErrors(error, setError, setFormError);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset password for {account?.name}</DialogTitle>
          <DialogDescription>
            Their old password stops working at once. Give them the new one in person or by message.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {formError && <p role="alert" className="text-sm font-medium text-destructive">{formError}</p>}

          <FormField
            label="New password"
            required
            error={errors.password?.message}
            hint="At least 8 characters, with a letter and a number."
          >
            {(field) => <Input {...field} {...register('password')} type="text" autoComplete="off" />}
          </FormField>

          <DialogFooter className="gap-2.5 pt-2 sm:gap-2.5">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Set password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
