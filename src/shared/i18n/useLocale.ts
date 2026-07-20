import { useContext } from 'react';
import { LocaleContext } from './LocaleContext';

/** Access the current locale preferences, their setters, and the `t()`
 * translation function. Must be used within a `<LocaleProvider>` (mounted
 * once near the app root in App.tsx). */
export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return ctx;
}
