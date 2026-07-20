import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AuthLayout } from './AuthLayout';
import { useAuth } from './useAuth';
import { signupSchema } from './auth.schemas';
import { TextField } from '../shared/components/TextField';
import { Button } from '../shared/components/Button';
import { useLocale } from '../shared/i18n/useLocale';

export function SignupPage() {
  const { signUp, user } = useAuth();
  const { t } = useLocale();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const result = signupSchema.safeParse({ email, password, confirmPassword });
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
    const { error } = await signUp(result.data.email, result.data.password);
    setIsSubmitting(false);
    if (error) {
      setFormError(error);
      return;
    }
    setConfirmationSent(true);
  }

  if (confirmationSent) {
    return (
      <AuthLayout title={t('auth.signup.checkInboxTitle')} subtitle={t('auth.signup.checkInboxSubtitle')}>
        <p className="text-sm text-ink-600">
          {t('auth.signup.confirmationBodyPrefix')}
          <strong>{email}</strong>
          {t('auth.signup.confirmationBodySuffix')}
        </p>
        <Link to="/login" className="mt-6 inline-block font-semibold text-brand-600 hover:underline">
          {t('auth.signup.backToSignIn')}
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t('auth.signup.title')} subtitle={t('auth.signup.subtitle')}>
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
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors.password}
        />
        <TextField
          label={t('auth.signup.confirmPasswordLabel')}
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          error={fieldErrors.confirmPassword}
        />
        <p className="text-xs text-ink-400">{t('auth.signup.passwordHint')}</p>
        {formError && (
          <p role="alert" className="rounded-lg bg-ko-100 px-3 py-2 text-sm text-ko-600">
            {formError}
          </p>
        )}
        <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
          {t('auth.signup.submit')}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-500">
        {t('auth.signup.alreadyHaveAccount')}{' '}
        <Link to="/login" className="font-semibold text-brand-600 hover:underline">
          {t('auth.signup.signInLink')}
        </Link>
      </p>
    </AuthLayout>
  );
}
