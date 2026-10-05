import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Loader2, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/shared/FormField';
import { PasswordInput } from '@/components/shared/PasswordInput';
import { AuthLayout } from '@/features/auth/AuthLayout';
import { useAuth } from '@/features/auth/useAuth';
import { homeFor } from '@/features/auth/ProtectedRoute';
import { getErrorMessage } from '@/lib/api';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * The platform operator's door.
 *
 * Deliberately a separate screen from the gym sign-in, and the server enforces
 * the split: a gym account posted here is refused even with a correct password.
 */
export const AdminLoginPage = () => {
  const { login, isAuthenticated, user, gym } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  if (isAuthenticated) {
    return <Navigate to={homeFor(user, gym)} replace />;
  }

  const onSubmit = async (values) => {
    setFormError(null);
    try {
      await login({ ...values, scope: 'platform' });
      navigate('/admin/gyms', { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  return (
    <AuthLayout variant="platform">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[26rem]"
      >
        <Card className="elevated-lift px-2 py-8">
          <CardHeader className="space-y-4 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/25">
              <ShieldCheck className="size-6" />
            </span>
            <div className="space-y-1.5">
              <CardTitle className="text-[1.625rem]">Platform sign in</CardTitle>
              <CardDescription>Manage the gyms on this platform</CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
              {formError && (
                <p
                  role="alert"
                  className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
                >
                  {formError}
                </p>
              )}

              <FormField label="Email" required error={errors.email?.message}>
                {(field) => (
                  <Input
                    {...field}
                    {...register('email')}
                    type="email"
                    autoComplete="email"
                    placeholder="superadmin@platform.com"
                  />
                )}
              </FormField>

              <FormField label="Password" required error={errors.password?.message}>
                {(field) => (
                  <PasswordInput
                    {...field}
                    {...register('password')}
                    autoComplete="current-password"
                    placeholder="••••••••"
                  />
                )}
              </FormField>

              <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-[0.6875rem] tracking-[0.12em] text-muted-foreground uppercase">
          Platform operators only
        </p>
      </motion.div>
    </AuthLayout>
  );
};
