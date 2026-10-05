import { useEffect, useState } from 'react';
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
import { useSaveExpense } from './useExpenses';
import { getErrorMessage, getFieldErrors } from '@/lib/api';

/** Mirrors `server/src/features/expenses/expenses.schema.js`. */
const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Select a date'),
  description: z
    .string()
    .trim()
    .min(2, 'Description must be at least 2 characters')
    .max(200, 'Description must be 200 characters or fewer'),
  amount: z.coerce
    .number({ invalid_type_error: 'Amount must be a number' })
    .int('Amount must be a whole number')
    .min(1, 'Amount must be greater than zero'),
});

const todayIso = () => new Date().toISOString().slice(0, 10);

const toDefaults = (expense) => ({
  date: expense?.date ?? todayIso(),
  description: expense?.description ?? '',
  amount: expense?.amount ?? '',
});

export const ExpenseFormDialog = ({ open, onOpenChange, expense }) => {
  const isEdit = Boolean(expense?.id);
  const saveExpense = useSaveExpense();
  const [formError, setFormError] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: toDefaults(expense) });

  useEffect(() => {
    if (open) {
      reset(toDefaults(expense));
      setFormError(null);
    }
  }, [open, expense, reset]);

  const onSubmit = async (values) => {
    setFormError(null);

    try {
      await saveExpense.mutateAsync({ id: expense?.id, ...values });
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
          <DialogTitle>{isEdit ? 'Edit expense' : 'Add expense'}</DialogTitle>
          <DialogDescription>Record a gym running cost.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {formError && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {formError}
            </p>
          )}

          <FormField label="Date" required error={errors.date?.message}>
            {(field) => <Input {...field} {...register('date')} type="date" />}
          </FormField>

          <FormField label="Description" required error={errors.description?.message}>
            {(field) => (
              <Input {...field} {...register('description')} placeholder="Electricity bill" />
            )}
          </FormField>

          <FormField label="Amount" required error={errors.amount?.message}>
            {(field) => (
              <Input
                {...field}
                {...register('amount')}
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                placeholder="0"
              />
            )}
          </FormField>

          <DialogFooter className="gap-2.5 pt-2 sm:gap-2.5">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveExpense.isPending}>
              {saveExpense.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
