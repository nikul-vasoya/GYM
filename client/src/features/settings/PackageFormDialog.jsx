import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/shared/FormField';
import { useSavePackage } from './usePackageAdmin';
import { getFieldErrors } from '@/lib/api';

/** Mirrors `server/src/features/packages/packages.schema.js`. */
const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Plan name must be at least 2 characters')
    .max(60, 'Plan name must be 60 characters or fewer'),
  durationMonths: z.coerce
    .number({ invalid_type_error: 'Enter the number of months' })
    .int('Use a whole number of months')
    .min(1, 'Duration must be at least 1 month')
    .max(60, 'Duration must be 60 months or fewer'),
  price: z.coerce
    .number({ invalid_type_error: 'Enter a price' })
    .int('Price must be a whole number')
    .min(0, 'Price cannot be negative'),
  description: z.string().trim().max(200, 'Description must be 200 characters or fewer'),
  isActive: z.boolean(),
});

const valuesFor = (pkg) => ({
  name: pkg?.name ?? '',
  durationMonths: pkg?.durationMonths ?? 1,
  price: pkg?.price ?? '',
  description: pkg?.description ?? '',
  isActive: pkg?.isActive ?? true,
});

/**
 * Add a plan, or edit every field of an existing one.
 *
 * @param {object} props
 * @param {object|null} props.pkg the plan to edit, or null to create
 */
export const PackageFormDialog = ({ open, onOpenChange, pkg = null }) => {
  const savePackage = useSavePackage();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: valuesFor(pkg) });

  useEffect(() => {
    if (open) reset(valuesFor(pkg));
  }, [open, pkg, reset]);

  const onSubmit = async (values) => {
    try {
      await savePackage.mutateAsync({ id: pkg?.id, values });
      onOpenChange(false);
    } catch (error) {
      for (const [field, message] of Object.entries(getFieldErrors(error))) {
        setError(field, { type: 'server', message });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{pkg ? `Edit ${pkg.name}` : 'New plan'}</DialogTitle>
          <DialogDescription>
            {pkg
              ? 'Changes apply to memberships sold from now on. Existing members keep what they bought.'
              : 'Staff can sell it as soon as it is saved, unless you switch it off.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <FormField label="Plan name" required error={errors.name?.message}>
            {(field) => <Input {...field} {...register('name')} placeholder="Summer Special" />}
          </FormField>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Duration (months)" required error={errors.durationMonths?.message}>
              {(field) => (
                <Input {...field} {...register('durationMonths')} type="number" min="1" max="60" step="1" inputMode="numeric" />
              )}
            </FormField>

            <FormField label="Price" required error={errors.price?.message}>
              {(field) => (
                <Input {...field} {...register('price')} type="number" min="0" step="1" inputMode="numeric" placeholder="2500" />
              )}
            </FormField>
          </div>

          <FormField label="Description" error={errors.description?.message} hint="Optional, e.g. “Includes 4 PT sessions”.">
            {(field) => <Input {...field} {...register('description')} />}
          </FormField>

          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" {...register('isActive')} className="size-4 accent-[var(--primary)]" />
            Available to sell to new members
          </label>

          <DialogFooter className="gap-2.5 pt-2 sm:gap-2.5">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={savePackage.isPending}>
              {savePackage.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {pkg ? 'Save plan' : 'Add plan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
