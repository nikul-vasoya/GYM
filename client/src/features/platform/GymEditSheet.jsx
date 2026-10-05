import { useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, ImageUp, Loader2, Trash2 } from 'lucide-react';

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/shared/FormField';
import { GymLogo } from '@/components/shared/GymLogo';
import { ThemePicker } from './ThemePicker';
import { ThemePreview } from './ThemePreview';
import { ThemeFormDialog } from './ThemeFormDialog';
import { GymLoginUrl } from './GymLoginUrl';
import { GymAccounts } from './GymAccounts';
import {
  logoProblem,
  useRemoveLogo,
  useThemes,
  useUpdateGym,
  useUploadLogo,
} from './usePlatform';
import { getErrorMessage, getFieldErrors } from '@/lib/api';
import { RESERVED_SLUGS, SLUG_PATTERN } from '@/lib/gymPaths';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Mirrors `updateGymSchema` in `server/src/features/gyms/gyms.schema.js`. */
const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Gym name must be at least 2 characters')
    .max(80, 'Gym name must be 80 characters or fewer'),
  contactEmail: z.union([z.literal(''), z.string().trim().email('Enter a valid email address')]),
  contactPhone: z.union([
    z.literal(''),
    z
      .string()
      .trim()
      .regex(/^\+?[0-9][0-9\s()-]{6,19}$/, 'Enter a valid phone number'),
  ]),
  address: z.string().trim().max(200, 'Address must be 200 characters or fewer'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(SLUG_PATTERN, 'Use lowercase letters, numbers and hyphens (not at either end)')
    .refine((value) => !RESERVED_SLUGS.has(value), 'That address is reserved. Choose another.'),
  // Empty only for a gym from before themes existed; saving leaves it on the default.
  theme: z.string().optional(),
});

const valuesFor = (gym) => ({
  name: gym?.name ?? '',
  contactEmail: gym?.contactEmail ?? '',
  contactPhone: gym?.contactPhone ?? '',
  address: gym?.address ?? '',
  slug: gym?.slug ?? '',
  theme: gym?.theme?.id ?? '',
});

/** Which tab a field lives on, so a server error can switch to it. */
const TAB_OF = {
  name: 'details',
  contactEmail: 'details',
  contactPhone: 'details',
  address: 'details',
  theme: 'branding',
  slug: 'access',
};

/** Upload, replace or remove a gym's logo. Saves immediately — it is a file, not a field. */
const LogoField = ({ gym }) => {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [problem, setProblem] = useState(null);
  const uploadLogo = useUploadLogo();
  const removeLogo = useRemoveLogo();
  const isBusy = uploadLogo.isPending || removeLogo.isPending;

  const upload = (file) => {
    const reason = logoProblem(file);
    setProblem(reason);
    if (!reason) uploadLogo.mutate({ id: gym.id, file });
  };

  return (
    <div className="space-y-2">
      <p className="text-[0.6875rem] font-medium tracking-[0.14em] text-muted-foreground uppercase">Logo</p>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          upload(event.dataTransfer.files?.[0]);
        }}
        className={cn(
          'flex items-center gap-4 rounded-xl border border-dashed p-4 transition-colors',
          isDragging ? 'border-primary bg-primary/8' : 'border-border',
        )}
      >
        <GymLogo name={gym.name} logoUrl={gym.logoUrl} className="size-16 rounded-2xl text-lg" />

        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm text-muted-foreground">
            PNG, JPG, WebP or SVG, up to 1 MB. Square images look best. Drop a file here or:
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={isBusy} onClick={() => inputRef.current?.click()}>
              {uploadLogo.isPending ? <Loader2 className="size-4 animate-spin" /> : <ImageUp className="size-4" />}
              {gym.logoUrl ? 'Replace logo' : 'Upload logo'}
            </Button>
            {gym.logoUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isBusy}
                onClick={() => removeLogo.mutate({ id: gym.id })}
                className="hover:text-destructive"
              >
                <Trash2 className="size-4" />
                Remove
              </Button>
            )}
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          aria-label="Logo file"
          className="sr-only"
          onChange={(event) => {
            upload(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </div>

      {problem && <p className="text-sm font-medium text-destructive">{problem}</p>}
    </div>
  );
};

/**
 * Everything the platform administrator can change about a gym, in one
 * panel: its details, its look, and its address.
 *
 * @param {object} props
 * @param {object|null} props.gym the gym to edit (from the gyms list)
 * @param {'details'|'branding'|'access'} [props.initialTab]
 */
export const GymEditSheet = ({ gym, open, onOpenChange, initialTab = 'details' }) => {
  const updateGym = useUpdateGym();
  const { data: themes, isLoading: themesLoading } = useThemes();
  const [tab, setTab] = useState(initialTab);
  const [formError, setFormError] = useState(null);
  const [isThemeFormOpen, setIsThemeFormOpen] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm({ resolver: zodResolver(schema), defaultValues: valuesFor(gym) });

  useEffect(() => {
    if (open) {
      reset(valuesFor(gym));
      setTab(initialTab);
      setFormError(null);
    }
    // Reset only when the sheet opens or a different gym is chosen, not when
    // the list refetches after a logo upload and hands over a new object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, gym?.id, initialTab, reset]);

  if (!gym) return null;

  const slug = watch('slug');
  const themeId = watch('theme');
  const selectedTheme = themes?.find((theme) => theme.id === themeId) ?? gym.theme;
  const slugChanged = slug && slug !== gym.slug;

  const onSubmit = async (values) => {
    setFormError(null);
    try {
      const { theme, ...rest } = values;
      await updateGym.mutateAsync({ id: gym.id, values: theme ? { ...rest, theme } : rest });
      onOpenChange(false);
    } catch (error) {
      const fieldErrors = getFieldErrors(error);
      const fields = Object.keys(fieldErrors);

      for (const field of fields) {
        setError(field, { type: 'server', message: fieldErrors[field] });
      }
      if (fields.length) setTab(TAB_OF[fields[0]] ?? 'details');
      else setFormError(getErrorMessage(error));
    }
  };

  // Client-side errors also jump to the tab holding the first bad field.
  const onInvalid = (invalid) => {
    const first = Object.keys(invalid)[0];
    if (first) setTab(TAB_OF[first] ?? 'details');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        <SheetHeader className="border-b border-border/70 px-6 py-5">
          <div className="flex items-center gap-3.5 pr-8">
            <GymLogo name={gym.name} logoUrl={gym.logoUrl} className="size-12 rounded-xl" />
            <div className="min-w-0">
              <SheetTitle className="truncate text-lg">Edit {gym.name}</SheetTitle>
              <SheetDescription>
                Added {formatDate(gym.createdAt)} · {gym.memberCount ?? 0} members ·{' '}
                {gym.staffCount ?? 0} accounts
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="flex flex-1 flex-col" noValidate>
          <Tabs value={tab} onValueChange={setTab} className="flex-1 gap-5 px-6 py-5">
            <TabsList className="w-full">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="branding">Branding</TabsTrigger>
              <TabsTrigger value="access">Sign-in link</TabsTrigger>
              <TabsTrigger value="accounts">Accounts</TabsTrigger>
            </TabsList>

            {formError && (
              <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
                {formError}
              </p>
            )}

            <TabsContent value="details" forceMount className="space-y-5 data-[state=inactive]:hidden">
              <FormField label="Gym name" required error={errors.name?.message}>
                {(field) => <Input {...field} {...register('name')} />}
              </FormField>

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Contact email" error={errors.contactEmail?.message}>
                  {(field) => <Input {...field} {...register('contactEmail')} type="email" />}
                </FormField>
                <FormField label="Contact phone" error={errors.contactPhone?.message}>
                  {(field) => <Input {...field} {...register('contactPhone')} type="tel" />}
                </FormField>
              </div>

              <FormField label="Address" error={errors.address?.message}>
                {(field) => <Input {...field} {...register('address')} placeholder="Street, city" />}
              </FormField>
            </TabsContent>

            <TabsContent value="branding" forceMount className="space-y-6 data-[state=inactive]:hidden">
              <LogoField gym={gym} />

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
                      onCreate={() => setIsThemeFormOpen(true)}
                    />
                  )}
                />
                {errors.theme && <p className="text-sm font-medium text-destructive">{errors.theme.message}</p>}
              </div>

              {selectedTheme && (
                <div className="space-y-2">
                  <p className="text-[0.6875rem] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                    Preview
                  </p>
                  <ThemePreview theme={selectedTheme} gymName={watch('name') || gym.name} logoUrl={gym.logoUrl} />
                </div>
              )}
            </TabsContent>

            <TabsContent value="access" forceMount className="space-y-5 data-[state=inactive]:hidden">
              <FormField
                label="Sign-in address"
                required
                error={errors.slug?.message}
                hint="Lowercase letters, numbers and hyphens."
              >
                {(field) => (
                  <div className="flex items-center rounded-lg border border-input focus-within:ring-[3px] focus-within:ring-ring/40">
                    <span className="pl-3 font-mono text-sm text-muted-foreground select-none">/</span>
                    <Input
                      {...field}
                      {...register('slug')}
                      autoComplete="off"
                      spellCheck={false}
                      className="border-0 px-1 font-mono shadow-none focus-visible:ring-0"
                    />
                    <span className="pr-3 font-mono text-sm text-muted-foreground select-none">/login</span>
                  </div>
                )}
              </FormField>

              {slugChanged && (
                <p className="flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning/10 px-3.5 py-3 text-sm text-warning">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>
                    The old link <span className="font-mono">/{gym.slug}/login</span> stops working as soon as
                    you save. Send the gym its new link.
                  </span>
                </p>
              )}

              <div className="space-y-2">
                <p className="text-[0.6875rem] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                  Current sign-in link
                </p>
                <GymLoginUrl slug={gym.slug} name={gym.name} showFull />
              </div>
            </TabsContent>
            {/* Not part of the form: each account saves on its own. */}
            <TabsContent value="accounts" className="space-y-4">
              <GymAccounts gym={gym} />
            </TabsContent>
          </Tabs>

          <div className="sticky bottom-0 flex justify-end gap-2.5 border-t border-border/70 bg-card px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {isDirty ? 'Cancel' : 'Close'}
            </Button>
            <Button type="submit" disabled={updateGym.isPending || !isDirty}>
              {updateGym.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save changes
            </Button>
          </div>
        </form>

        <ThemeFormDialog
          open={isThemeFormOpen}
          onOpenChange={setIsThemeFormOpen}
          onSaved={(theme) => setValue('theme', theme.id, { shouldDirty: true })}
        />
      </SheetContent>
    </Sheet>
  );
};
