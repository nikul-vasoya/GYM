import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Dumbbell, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/shared/FormField';
import { PasswordInput } from '@/components/shared/PasswordInput';
import { AuthLayout } from './AuthLayout';
import { useAuth } from './useAuth';
import { homeFor } from './ProtectedRoute';
import { getErrorMessage } from '@/lib/api';
import { gymHomePath } from '@/lib/gymPaths';
import { GymLogo } from '@/components/shared/GymLogo';
import { useGymBranding } from '@/features/branding/GymBrandingContext';
import { useGymPath } from '@/features/branding/useGymPath';

const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Enter your mobile number or email'),
  password: z.string().min(1, 'Password is required'),
});

export const LoginPage = () => {
  const { login, isAuthenticated, user, gym } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { gymSlug } = useParams();
  const branding = useGymBranding();
  const to = useGymPath();
  const [formError, setFormError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  // A gym account is already where it belongs. The platform administrator is
  // not sent away: opening a gym's sign-in page to check its branding is
  // part of their job.
  if (isAuthenticated && user.role !== 'superadmin') {
    return <Navigate to={homeFor(user, gym)} replace />;
  }

  const onSubmit = async (values) => {
    setFormError(null);
    try {
      // At `/<slug>/login` the server only accepts accounts from that gym.
      const { gym: signedInGym } = await login({ ...values, gymSlug: branding?.slug ?? gymSlug });
      // Return them to wherever ProtectedRoute intercepted them.
      const home = signedInGym?.slug ? gymHomePath(signedInGym.slug) : '/';
      navigate(location.state?.from?.pathname ?? home, { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  return (
    <AuthLayout>
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[26rem]"
      >
        <Card className="elevated-lift px-2 py-8">
          <CardHeader className="space-y-4 text-center">
            {branding ? (
              <GymLogo
                name={branding.name}
                logoUrl={branding.logoUrl}
                className="mx-auto size-16 rounded-2xl text-lg"
              />
            ) : (
              <span className="gold-surface gold-glow mx-auto grid size-14 place-items-center rounded-2xl">
                <Dumbbell className="size-6" />
              </span>
            )}
            <div className="space-y-1.5">
              <CardTitle className="text-[1.625rem]">Welcome back</CardTitle>
              <CardDescription>
                {branding ? `Sign in to ${branding.name}` : 'Sign in to manage your gym'}
              </CardDescription>
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

              <FormField label="Mobile number or email" required error={errors.identifier?.message}>
                {(field) => (
                  <Input
                    {...field}
                    {...register('identifier')}
                    type="text"
                    inputMode="email"
                    autoComplete="username"
                    placeholder="9876543210"
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

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isSubmitting}
              >
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
                  to={to('/forgot-password')}
                  className="text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-[0.6875rem] tracking-[0.12em] text-muted-foreground uppercase">
          Authorised staff access only
        </p>
      </motion.div>
    </AuthLayout>
  );
};
