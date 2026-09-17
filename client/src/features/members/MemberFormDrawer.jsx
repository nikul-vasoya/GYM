import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarClock, Loader2 } from 'lucide-react';

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormField } from '@/components/shared/FormField';
import { usePackages, useSaveMember } from './useMembers';
import { GENDER_OPTIONS } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/format';
import { getErrorMessage, getFieldErrors } from '@/lib/api';

/** Mirrors `server/src/features/members/members.schema.js`. */
const schema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9][0-9\s()-]{6,19}$/, 'Enter a valid phone number')
    .or(z.literal('')),
  email: z.string().trim().email('Enter a valid email address').or(z.literal('')),
  gender: z.enum(['male', 'female', 'other'], { errorMap: () => ({ message: 'Select a gender' }) }),
  packageId: z.string().min(1, 'Select a package'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Select a start date'),
});

const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * The end date preview shown under the package field.
 *
 * Mirrors `calculateEndDate` on the server (decision D6). It is a PREVIEW
 * only — the value actually stored is always the one the API computes.
 */
const previewEndDate = (startDate, durationMonths) => {
  if (!startDate || !durationMonths) return null;

  const [year, month, day] = startDate.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 + durationMonths, day));
  if (target.getUTCDate() !== day) target.setUTCDate(0); // clamp short months
  target.setUTCDate(target.getUTCDate() - 1);

  return target.toISOString().slice(0, 10);
};

const toDefaults = (member) => ({
  name: member?.name ?? '',
  phone: member?.phone ?? '',
  email: member?.email ?? '',
  gender: member?.gender ?? '',
  packageId: member?.package ?? '',
  startDate: member?.startDate ?? todayIso(),
});

export const MemberFormDrawer = ({ open, onOpenChange, member }) => {
  const isEdit = Boolean(member?.id);
  const { data: packages = [] } = usePackages();
  const saveMember = useSaveMember();
  const [formError, setFormError] = useState(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: toDefaults(member) });

  // Reset whenever the drawer opens for a different member.
  useEffect(() => {
    if (open) {
      reset(toDefaults(member));
      setFormError(null);
    }
  }, [open, member, reset]);

  const selectedPackageId = watch('packageId');
  const startDate = watch('startDate');
  const selectedPackage = packages.find((pkg) => pkg.id === selectedPackageId);
  const endDatePreview = previewEndDate(startDate, selectedPackage?.durationMonths);

  const onSubmit = async (values) => {
    setFormError(null);

    try {
      await saveMember.mutateAsync({
        id: member?.id,
        name: values.name,
        phone: values.phone,
        email: values.email,
        gender: values.gender,
        packageId: values.packageId,
        startDate: values.startDate,
      });
      onOpenChange(false);
    } catch (error) {
      // Attach server field errors to the inputs they belong to.
      const fieldErrors = getFieldErrors(error);
      const fields = Object.keys(fieldErrors);

      for (const field of fields) {
        setError(field, { type: 'server', message: fieldErrors[field] });
      }

      if (fields.length === 0) setFormError(getErrorMessage(error));
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit member' : 'Add new member'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Update the details. Changing the package or start date recalculates the end date.'
              : 'The price and end date are set automatically from the package.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-4 pb-6" noValidate>
          {formError && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {formError}
            </p>
          )}

          <FormField label="Name" required error={errors.name?.message}>
            {(field) => <Input {...field} {...register('name')} placeholder="Full name" />}
          </FormField>

          <FormField label="Phone number" error={errors.phone?.message}>
            {(field) => (
              <Input {...field} {...register('phone')} type="tel" placeholder="9876543210" />
            )}
          </FormField>

          <FormField label="Email" error={errors.email?.message}>
            {(field) => (
              <Input
                {...field}
                {...register('email')}
                type="email"
                placeholder="member@example.com"
              />
            )}
          </FormField>

          <FormField label="Gender" required error={errors.gender?.message}>
            {(field) => (
              <Controller
                control={control}
                name="gender"
                render={({ field: control }) => (
                  <Select value={control.value} onValueChange={control.onChange}>
                    <SelectTrigger {...field}>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </FormField>

          <FormField label="Package" required error={errors.packageId?.message}>
            {(field) => (
              <Controller
                control={control}
                name="packageId"
                render={({ field: control }) => (
                  <Select value={control.value} onValueChange={control.onChange}>
                    <SelectTrigger {...field}>
                      <SelectValue placeholder="Select package" />
                    </SelectTrigger>
                    <SelectContent>
                      {packages.map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.id}>
                          {pkg.name} — {formatCurrency(pkg.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </FormField>

          <FormField
            label="Price"
            hint="Set automatically from the selected package."
            error={undefined}
          >
            {(field) => (
              <Input
                {...field}
                readOnly
                tabIndex={-1}
                className="bg-muted font-medium tabular-nums"
                value={selectedPackage ? formatCurrency(selectedPackage.price) : ''}
                placeholder="—"
              />
            )}
          </FormField>

          <FormField
            label="Start date"
            required
            error={errors.startDate?.message}
            hint={
              endDatePreview
                ? undefined
                : 'Defaults to today. Backdate it for a member who joined earlier.'
            }
          >
            {(field) => <Input {...field} {...register('startDate')} type="date" />}
          </FormField>

          {endDatePreview && (
            <p className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2.5 text-sm">
              <CalendarClock className="size-4 shrink-0 text-muted-foreground" />
              Membership will end on&nbsp;
              <span className="font-medium">{formatDate(endDatePreview)}</span>
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMember.isPending}>
              {saveMember.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};
