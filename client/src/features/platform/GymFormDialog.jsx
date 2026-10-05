import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, ImageUp, Info, Loader2 } from 'lucide-react';

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
import { ThemePicker } from './ThemePicker';
import { GymLoginUrl } from './GymLoginUrl';
import { useCreateGym, useThemes } from './usePlatform';
import { getErrorMessage, getFieldErrors } from '@/lib/api';
import { RESERVED_SLUGS, SLUG_PATTERN, slugify } from '@/lib/gymPaths';
import { mobileField, optionalEmailField } from '@/features/accounts/accountSchemas';

/** Mirrors `server/src/features/gyms/gyms.schema.js`. */
const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Gym name must be at least 2 characters')
    .max(80, 'Gym name must be 80 characters or fewer'),
  contactEmail: z
    .union([z.literal(''), z.string().trim().email('Enter a valid email address')])
    .optional(),
  contactPhone: z
    .union([
      z.literal(''),
      z
        .string()
        .trim()
        .regex(/^\+?[0-9][0-9\s()-]{6,19}$/, 'Enter a valid phone number'),
    ])
    .optional(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(SLUG_PATTERN, 'Use lowercase letters, numbers and hyphens (not at either end)')
    .refine((value) => !RESERVED_SLUGS.has(value), 'That address is reserved. Choose another.'),
  theme: z.string().optional(),
  adminName: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(80, 'Name must be 80 characters or fewer'),
  adminPhone: mobileField,
  adminEmail: optionalEmailField,
  adminPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .refine(
      (value) => /[A-Za-z]/.test(value) && /[0-9]/.test(value),
      'Password must contain at least one letter and one number',
    ),
});

const EMPTY = {
  name: '',
  contactEmail: '',
  contactPhone: '',
  slug: '',
  theme: '',
  adminName: '',
  adminPhone: '',
  adminEmail: '',
  adminPassword: '',
};

/** Server field paths → the flat field names this form uses. */
const FIELD_MAP = {
  'admin.name': 'adminName',
  'admin.phone': 'adminPhone',
  'admin.email': 'adminEmail',
  'admin.password': 'adminPassword',
};

/**
 * @param {object} props
 * @param {(gym: object) => void} [props.onAddLogo] opens the new gym's
 *   branding, from the success screen
 */
export const GymFormDialog = ({ open, onOpenChange, onAddLogo }) => {
  const createGym = useCreateGym();
  const { data: themes, isLoading: themesLoading } = useThemes();
  const [formError, setFormError] = useState(null);
  const [created, setCreated] = useState(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    getFieldState,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: EMPTY });

  useEffect(() => {
    if (open) {
      reset(EMPTY);
      setFormError(null);
      setCreated(null);
    }
  }, [open, reset]);

  // Pre-select the default theme once the library has loaded.
  useEffect(() => {
    if (open && themes?.length) {
      setValue('theme', (themes.find((theme) => theme.key === 'aura-gold') ?? themes[0]).id);
    }
  }, [open, themes, setValue]);

  // The address follows the name until someone edits it by hand.
  const nameField = register('name', {
    onChange: (event) => {
      if (!getFieldState('slug').isDirty) setValue('slug', slugify(event.target.value));
    },
  });

  const onSubmit = async (values) => {
    setFormError(null);

    try {
      const { data: gym } = await createGym.mutateAsync({
        name: values.name,
        contactEmail: values.contactEmail,
        contactPhone: values.contactPhone,
        slug: values.slug,
        ...(values.theme ? { theme: values.theme } : {}),
        admin: {
          name: values.adminName,
          phone: values.adminPhone,
          email: values.adminEmail,
          password: values.adminPassword,
        },
      });
      setCreated({ gym, adminPhone: values.adminPhone });
    } catch (error) {
      const fieldErrors = getFieldErrors(error);
      const fields = Object.keys(fieldErrors);

      for (const field of fields) {
        setError(FIELD_MAP[field] ?? field, { type: 'server', message: fieldErrors[field] });
      }

      if (fields.length === 0) setFormError(getErrorMessage(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        {created ? (
          <>
            <DialogHeader>
              <span className="grid size-12 place-items-center rounded-2xl bg-success/12 text-success ring-1 ring-success/25">
                <CheckCircle2 className="size-6" />
              </span>
              <DialogTitle>{created.gym.name} is ready</DialogTitle>
              <DialogDescription>
                Send the owner this sign-in link together with their mobile number ({created.adminPhone}) and
                the temporary password you set.
              </DialogDescription>
            </DialogHeader>

            <GymLoginUrl slug={created.gym.slug} name={created.gym.name} showFull />

            <DialogFooter className="gap-2.5 pt-2 sm:gap-2.5">
              {onAddLogo && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false);
                    onAddLogo(created.gym);
                  }}
                >
                  <ImageUp className="mr-2 size-4" />
                  Add a logo
                </Button>
              )}
              <Button type="button" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add a gym</DialogTitle>
              <DialogDescription>
                The gym starts with the four default packages and one administrator, who can add
                their own staff.
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

              <FormField label="Gym name" required error={errors.name?.message}>
                {(field) => <Input {...field} {...nameField} placeholder="Iron House" />}
              </FormField>

              <FormField
                label="Sign-in address"
                required
                error={errors.slug?.message}
                hint="Staff sign in at this address. You can change it later."
              >
                {(field) => (
                  <div className="flex items-center rounded-lg border border-input focus-within:ring-[3px] focus-within:ring-ring/40">
                    <span className="pl-3 font-mono text-sm text-muted-foreground select-none">/</span>
                    <Input
                      {...field}
                      {...register('slug')}
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="iron-house"
                      className="border-0 px-1 font-mono shadow-none focus-visible:ring-0"
                    />
                    <span className="pr-3 font-mono text-sm text-muted-foreground select-none">/login</span>
                  </div>
                )}
              </FormField>

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Contact email" error={errors.contactEmail?.message}>
                  {(field) => (
                    <Input
                      {...field}
                      {...register('contactEmail')}
                      type="email"
                      placeholder="hello@ironhouse.com"
                    />
                  )}
                </FormField>

                <FormField label="Contact phone" error={errors.contactPhone?.message}>
                  {(field) => (
                    <Input {...field} {...register('contactPhone')} type="tel" placeholder="9876543210" />
                  )}
                </FormField>
              </div>

              <div className="space-y-2">
                <p className="text-[0.6875rem] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                  Theme
                </p>
                <Controller
                  control={control}
                  name="theme"
                  render={({ field }) => (
                    <ThemePicker
                      themes={themes}
                      isLoading={themesLoading}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>

              <div className="rule" />

              <p className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/8 px-3.5 py-3 text-sm text-muted-foreground">
                <Info className="mt-0.5 size-4 shrink-0 text-primary" />
                These are the credentials the gym owner signs in with, at the gym's own sign-in
                address. Share them privately.
              </p>

              <FormField label="Administrator name" required error={errors.adminName?.message}>
                {(field) => <Input {...field} {...register('adminName')} placeholder="Ravi Kumar" />}
              </FormField>

              <FormField
                label="Administrator mobile"
                required
                error={errors.adminPhone?.message}
                hint="The owner signs in with this."
              >
                {(field) => (
                  <Input {...field} {...register('adminPhone')} type="tel" inputMode="tel" placeholder="9876543210" />
                )}
              </FormField>

              <FormField label="Administrator email" error={errors.adminEmail?.message}>
                {(field) => (
                  <Input
                    {...field}
                    {...register('adminEmail')}
                    type="email"
                    placeholder="ravi@ironhouse.com"
                  />
                )}
              </FormField>

              <FormField
                label="Temporary password"
                required
                error={errors.adminPassword?.message}
                hint="At least 8 characters, with a letter and a number."
              >
                {(field) => (
                  <Input {...field} {...register('adminPassword')} type="text" autoComplete="off" />
                )}
              </FormField>

              <DialogFooter className="gap-2.5 pt-2 sm:gap-2.5">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createGym.isPending}>
                  {createGym.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Create gym
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
