import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { AuthLayout } from './AuthLayout';
import { useAuth } from './useAuth';
import { loginSchema } from './auth.schemas';
import { TextField } from '../shared/components/TextField';
import { Button } from '../shared/components/Button';
import { useLocale } from '../shared/i18n/useLocale';

export function LoginPage() {
  const { signIn, user } = useAuth();
  const { t } = useLocale();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) {
    const redirectTo = (location.state as { from?: string } | null)?.from ?? '/';
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        errors[String(issue.path[0])] = issue.message;
      });
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);
    const { error } = await signIn(result.data.email, result.data.password);
    setIsSubmitting(false);
    if (error) setFormError(error);
  }

  return (
    <AuthLayout title={t('auth.login.title')} subtitle={t('auth.login.subtitle')}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <TextField
          label={t('auth.emailLabel')}
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldErrors.email}
        />
        <TextField
          label={t('auth.passwordLabel')}
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors.password}
        />
        {formError && (
          <p role="alert" className="rounded-lg bg-ko-100 px-3 py-2 text-sm text-ko-600">
            {formError}
          </p>
        )}
        <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
          {t('auth.login.submit')}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-500">
        {t('auth.login.noAccount')}{' '}
        <Link to="/signup" className="font-semibold text-brand-600 hover:underline">
          {t('auth.login.createOne')}
        </Link>
      </p>
    </AuthLayout>
  );
}
