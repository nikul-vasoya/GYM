import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Dumbbell, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/shared/FormField';
import { useAuth } from './useAuth';
import { getErrorMessage } from '@/lib/api';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const LoginPage = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const onSubmit = async (values) => {
    setFormError(null);
    try {
      await login(values);
      // Return them to wherever ProtectedRoute intercepted them.
      navigate(location.state?.from?.pathname ?? '/dashboard', { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-10">
      {/* Soft radial wash — depth without a heavy background image. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(60rem_40rem_at_50%_-10%,var(--color-primary)/12%,transparent)]"
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative w-full max-w-md"
      >
        <Card className="elevated">
          <CardHeader className="space-y-3 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Dumbbell className="size-6" />
            </span>
            <div className="space-y-1">
              <CardTitle className="text-2xl">Welcome back</CardTitle>
              <CardDescription>Sign in to manage your gym</CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {formError && (
                <p
                  role="alert"
                  className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
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
                    placeholder="admin@gym.com"
                  />
                )}
              </FormField>

              <FormField label="Password" required error={errors.password?.message}>
                {(field) => (
                  <Input
                    {...field}
                    {...register('password')}
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                  />
                )}
              </FormField>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>

              <p className="text-center text-sm">
                <Link
                  to="/forgot-password"
                  className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Forgot password?
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
