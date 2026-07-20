import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { LocaleProvider } from '@/shared/i18n/LocaleContext';

function AllProviders({ children }: { children: ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}

/** Same as @testing-library/react's `render`, but wrapped in every context
 * provider a component under test might need (currently just
 * LocaleProvider -- useLocale() throws without it). Use this instead of
 * the bare `render` for any component that (directly or via a child) calls
 * useLocale(). */
export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export { AllProviders };
