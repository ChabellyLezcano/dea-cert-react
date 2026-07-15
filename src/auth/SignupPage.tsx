import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AuthLayout } from './AuthLayout';
import { useAuth } from './useAuth';
import { signupSchema } from './auth.schemas';
import { TextField } from '../shared/components/TextField';
import { Button } from '../shared/components/Button';

export function SignupPage() {
  const { signUp, user } = useAuth();
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
      <AuthLayout title="Check your inbox" subtitle="We sent you a confirmation link.">
        <p className="text-sm text-ink-600">
          Click the link we sent to <strong>{email}</strong> to activate your account, then come back and sign
          in.
        </p>
        <Link to="/login" className="mt-6 inline-block font-semibold text-brand-600 hover:underline">
          Back to sign in
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Create your account" subtitle="Track your progress across all 9 practice exams.">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldErrors.email}
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors.password}
        />
        <TextField
          label="Confirm password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          error={fieldErrors.confirmPassword}
        />
        <p className="text-xs text-ink-400">
          8-16 characters, with at least one uppercase letter, one lowercase letter, one number and one
          special character.
        </p>
        {formError && (
          <p role="alert" className="rounded-lg bg-ko-100 px-3 py-2 text-sm text-ko-600">
            {formError}
          </p>
        )}
        <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
          Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-500">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brand-600 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
