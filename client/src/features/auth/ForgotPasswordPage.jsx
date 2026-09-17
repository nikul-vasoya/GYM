import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/shared/FormField';
import { api, getErrorMessage } from '@/lib/api';

const schema = z.object({ email: z.string().email('Enter a valid email address') });

export const ForgotPasswordPage = () => {
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
    <div className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <Card className="elevated w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>
            Enter your registered email and we will send you a reset link.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {confirmation ? (
            <div
              role="status"
              className="flex items-start gap-3 rounded-lg border border-success/30 bg-success/10 px-3 py-3 text-sm text-success"
            >
              <MailCheck className="mt-0.5 size-4 shrink-0" />
              <p>{confirmation}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
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

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Send reset link
              </Button>
            </form>
          )}

          <Link
            to="/login"
            className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};
