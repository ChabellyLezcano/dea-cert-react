import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  isLoading?: boolean;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-action text-white hover:bg-action-hover focus-visible:outline-brand-400 disabled:bg-ink-200 disabled:text-ink-400',
  // Added high-contrast text and explicit focus-visible outline states for accessibility compliance
  ghost:
    'bg-transparent text-ink-900 border border-ink-300 hover:border-brand-500 hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500 disabled:text-ink-300 disabled:border-ink-100',
  danger:
    'bg-transparent text-ko-600 border border-ko-100 hover:bg-ko-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ko-500 disabled:text-ink-300 disabled:border-ink-100',
};

export function Button({
  variant = 'primary',
  isLoading,
  className = '',
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
