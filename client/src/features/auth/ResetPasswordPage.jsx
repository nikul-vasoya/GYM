import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/shared/FormField';
import { api, getErrorMessage } from '@/lib/api';

/** Mirrors the server policy in `server/src/lib/password.js` (decision D2). */
const schema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .refine(
        (value) => /[A-Za-z]/.test(value) && /[0-9]/.test(value),
        'Password must contain at least one letter and one number',
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [formError, setFormError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (values) => {
    setFormError(null);
    try {
      await api.post('/auth/reset-password', { token, ...values });
      toast.success('Password updated. Please sign in.');
      navigate('/login', { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <Card className="elevated w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle>Choose a new password</CardTitle>
          <CardDescription>Use 8 or more characters, with a letter and a number.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {!token ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-destructive"
            >
              This reset link is invalid. Request a new one from the Forgot password page.
            </p>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {formError && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {formError}
                </p>
              )}

              <FormField label="New password" required error={errors.password?.message}>
                {(field) => (
                  <Input
                    {...field}
                    {...register('password')}
                    type="password"
                    autoComplete="new-password"
                  />
                )}
              </FormField>

              <FormField
                label="Confirm new password"
                required
                error={errors.confirmPassword?.message}
              >
                {(field) => (
                  <Input
                    {...field}
                    {...register('confirmPassword')}
                    type="password"
                    autoComplete="new-password"
                  />
                )}
              </FormField>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Update password
              </Button>
            </form>
          )}

          <Link
            to="/login"
            className="block text-center text-sm text-muted-foreground hover:text-foreground"
          >
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};
