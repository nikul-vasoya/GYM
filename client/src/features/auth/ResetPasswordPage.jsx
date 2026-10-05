import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/shared/FormField';
import { PasswordInput } from '@/components/shared/PasswordInput';
import { AuthLayout } from './AuthLayout';
import { useGymPath } from '@/features/branding/useGymPath';
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
  const to = useGymPath();
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
      navigate(to('/login'), { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  return (
    <AuthLayout>
      <Card className="elevated-lift w-full max-w-[26rem] px-2 py-8">
        <CardHeader className="space-y-4 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/25">
            <ShieldCheck className="size-6" />
          </span>
          <div className="space-y-1.5">
            <CardTitle className="text-[1.375rem]">Choose a new password</CardTitle>
            <CardDescription>
              Use 8 or more characters, with a letter and a number.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {!token ? (
            <p
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive"
            >
              This reset link is invalid. Request a new one from the Forgot password page.
            </p>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
              {formError && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {formError}
                </p>
              )}

              <FormField label="New password" required error={errors.password?.message}>
                {(field) => (
                  <PasswordInput
                    {...field}
                    {...register('password')}
                    describes="new password"
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
                  <PasswordInput
                    {...field}
                    {...register('confirmPassword')}
                    describes="confirmed password"
                    autoComplete="new-password"
                  />
                )}
              </FormField>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Update password
              </Button>
            </form>
          )}

          <div className="rule" />

          <Link
            to={to('/login')}
            className="block text-center text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    </AuthLayout>
  );
};
