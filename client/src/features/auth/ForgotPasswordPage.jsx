import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, KeyRound, Loader2, MailCheck, UserCog } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/shared/FormField';
import { AuthLayout } from './AuthLayout';
import { useGymPath } from '@/features/branding/useGymPath';
import { api, getErrorMessage } from '@/lib/api';

const schema = z.object({ email: z.string().email('Enter a valid email address') });

/**
 * At a gym's address, accounts sign in with a mobile number and may have no
 * email, so a password is reset by someone who manages the account.
 */
const AskYourAdmin = ({ backTo }) => (
  <AuthLayout>
    <Card className="elevated-lift w-full max-w-[26rem] px-2 py-8">
      <CardHeader className="space-y-4 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/25">
          <UserCog className="size-6" />
        </span>
        <div className="space-y-1.5">
          <CardTitle className="text-[1.375rem]">Forgot your password?</CardTitle>
          <CardDescription>Your gym can set a new one for you.</CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <ul className="space-y-3 text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">Staff:</span> ask your gym administrator.
            They can reset it from the Staff page.
          </li>
          <li>
            <span className="font-medium text-foreground">Gym administrator:</span> ask another
            administrator at your gym, or contact the platform administrator.
          </li>
        </ul>

        <div className="rule" />

        <Link
          to={backTo}
          className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Back to sign in
        </Link>
      </CardContent>
    </Card>
  </AuthLayout>
);

export const ForgotPasswordPage = () => {
  const { gymSlug } = useParams();
  const to = useGymPath();
  if (gymSlug) return <AskYourAdmin backTo={to('/login')} />;
  return <EmailResetForm />;
};

/** The emailed reset link, for accounts that have an email (the platform administrator). */
const EmailResetForm = () => {
  const to = useGymPath();
  const [confirmation, setConfirmation] = useState(null);
  const [formError, setFormError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: '' } });

  const onSubmit = async (values) => {
    setFormError(null);
    try {
      const { data } = await api.post('/auth/forgot-password', values);
      setConfirmation(data.message);

      // In development the API returns the link directly, so the flow can be
      // completed without an email provider configured.
      if (data.resetUrl) console.info('[dev] reset link:', data.resetUrl);
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  return (
    <AuthLayout>
      <Card className="elevated-lift w-full max-w-[26rem] px-2 py-8">
        <CardHeader className="space-y-4 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/25">
            <KeyRound className="size-6" />
          </span>
          <div className="space-y-1.5">
            <CardTitle className="text-[1.375rem]">Reset your password</CardTitle>
            <CardDescription>
              Enter your registered email and we will send you a reset link.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {confirmation ? (
            <div
              role="status"
              className="flex items-start gap-3 rounded-xl border border-success/25 bg-success/10 px-3.5 py-3 text-sm text-success"
            >
              <MailCheck className="mt-0.5 size-4 shrink-0" />
              <p>{confirmation}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
              {formError && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {formError}
                </p>
              )}

              <FormField label="Email" required error={errors.email?.message}>
                {(field) => (
                  <Input {...field} {...register('email')} type="email" autoComplete="email" />
                )}
              </FormField>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Send reset link
              </Button>
            </form>
          )}

          <div className="rule" />

          <Link
            to={to('/login')}
            className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="size-4" />
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    </AuthLayout>
  );
};
