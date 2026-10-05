import { useEffect, useState } from 'react';
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
import { ThemePreview } from './ThemePreview';
import { useSaveTheme } from './usePlatform';
import { getErrorMessage, getFieldErrors } from '@/lib/api';

const HEX = /^#[0-9a-fA-F]{6}$/;

/** A colour well and its hex value, kept in step. */
const ColourInput = ({ field, value, onChange, label }) => (
  <div className="flex items-center gap-2.5">
    <input
      type="color"
      aria-label={`${label} picker`}
      value={HEX.test(value) ? value : '#000000'}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-border bg-transparent p-1"
    />
    <Input
      {...field}
      value={value}
      onChange={(event) => onChange(event.target.value.trim())}
      placeholder="#2563eb"
      maxLength={7}
      className="font-mono"
    />
  </div>
);

const EMPTY = { name: '', primary: '#2563eb', accent: '' };

/**
 * Create or edit a custom theme: a name, a primary colour and an optional
 * accent. Everything else is derived, and the preview shows exactly what a
 * gym wearing it will look like.
 *
 * @param {object} props
 * @param {object|null} props.theme the theme to edit, or null to create
 * @param {(theme: object) => void} [props.onSaved]
 */
export const ThemeFormDialog = ({ open, onOpenChange, theme = null, onSaved }) => {
  const saveTheme = useSaveTheme();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setValues(theme ? { name: theme.name, primary: theme.primary, accent: theme.accent ?? '' } : EMPTY);
    setErrors({});
    setFormError(null);
  }, [open, theme]);

  const set = (key) => (value) => setValues((current) => ({ ...current, [key]: value }));

  const validate = () => {
    const next = {};
    if (values.name.trim().length < 2) next.name = 'Theme name must be at least 2 characters';
    if (values.name.trim().length > 40) next.name = 'Theme name must be 40 characters or fewer';
    if (!HEX.test(values.primary)) next.primary = 'Use a colour like #2563eb';
    if (values.accent && !HEX.test(values.accent)) next.accent = 'Use a colour like #06b6d4, or leave it empty';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;

    try {
      const saved = await saveTheme.mutateAsync({
        id: theme?.id,
        values: { name: values.name.trim(), primary: values.primary, accent: values.accent || null },
      });
      onSaved?.(saved);
      onOpenChange(false);
    } catch (error) {
      const fieldErrors = getFieldErrors(error);
      if (Object.keys(fieldErrors).length) setErrors(fieldErrors);
      else if (error?.response?.status === 409) setErrors({ name: getErrorMessage(error) });
      else setFormError(getErrorMessage(error));
    }
  };

  const previewTheme = {
    primary: HEX.test(values.primary) ? values.primary : '#2563eb',
    accent: HEX.test(values.accent) ? values.accent : null,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{theme ? `Edit ${theme.name}` : 'New theme'}</DialogTitle>
          <DialogDescription>
            Pick the brand colours. Backgrounds, borders and text colours for light and dark mode
            are worked out for you, and always stay readable.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          {formError && (
            <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
              {formError}
            </p>
          )}

          <FormField label="Theme name" required error={errors.name}>
            {(field) => (
              <Input
                {...field}
                value={values.name}
                onChange={(event) => set('name')(event.target.value)}
                placeholder="Mid City Navy"
              />
            )}
          </FormField>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Primary colour" required error={errors.primary} hint="Buttons, links, highlights.">
              {(field) => (
                <ColourInput field={field} label="Primary colour" value={values.primary} onChange={set('primary')} />
              )}
            </FormField>

            <FormField label="Accent colour" error={errors.accent} hint="Optional. Blends into buttons and charts.">
              {(field) => (
                <ColourInput field={field} label="Accent colour" value={values.accent} onChange={set('accent')} />
              )}
            </FormField>
          </div>

          <ThemePreview theme={previewTheme} />

          <DialogFooter className="gap-2.5 pt-2 sm:gap-2.5">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveTheme.isPending}>
              {saveTheme.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {theme ? 'Save theme' : 'Create theme'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
