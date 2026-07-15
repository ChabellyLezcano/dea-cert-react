import type { ReactNode } from 'react';
import { ThemeToggle } from '../shared/components/ThemeToggle';

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md animate-stagger">
        <div className="mb-8 text-center">
          <span className="inline-flex items-baseline gap-1 text-2xl font-extrabold tracking-tight text-ink-900">
            DEA<span className="text-brand-600">·26</span>
          </span>
          <p className="mt-1 text-sm text-ink-500">Databricks Certified Data Engineer Associate</p>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-surface p-8 shadow-lg shadow-ink-900/5">
          <h1 className="text-xl font-bold text-ink-900">{title}</h1>
          <p className="mt-1 text-sm text-ink-500">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
