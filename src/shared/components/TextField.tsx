import type { InputHTMLAttributes } from 'react';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function TextField({ label, error, id, ...inputProps }: TextFieldProps) {
  const fieldId = id ?? inputProps.name;
  const errorId = error ? `${fieldId}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-sm font-medium text-ink-700">
        {label}
      </label>
      <input
        id={fieldId}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className="rounded-xl border border-ink-200 bg-surface px-3.5 py-2.5 text-ink-800 shadow-sm transition placeholder:text-ink-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
        {...inputProps}
      />
      {error && (
        <p id={errorId} className="text-sm text-ko-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
