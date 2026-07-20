import { createContext, useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  DEFAULT_PREFERENCES,
  loadLocalePreferences,
  saveLocalePreferences,
  type Locale,
  type LocalePreferences,
} from './locale';
import { TRANSLATIONS, type TranslationKey } from './translations';

interface LocaleContextValue extends LocalePreferences {
  setAppLocale: (locale: Locale) => void;
  setQuestionLocale: (locale: Locale) => void;
  setExplanationLocale: (locale: Locale) => void;
  /** Translates `key` in the current app language, interpolating any
   * `{param}` tokens found in the string with values from `params`. */
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

// eslint-disable-next-line react-refresh/only-export-components -- LocaleContext must live alongside its Provider for useLocale (in useLocale.ts) to import it; splitting further would just move, not fix, the fast-refresh warning.
export const LocaleContext = createContext<LocaleContextValue | null>(null);

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, token: string) =>
    token in params ? String(params[token]) : match,
  );
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<LocalePreferences>(() =>
    typeof window === 'undefined' ? DEFAULT_PREFERENCES : loadLocalePreferences(),
  );

  const updatePrefs = useCallback((next: LocalePreferences) => {
    setPrefs(next);
    saveLocalePreferences(next);
  }, []);

  const setAppLocale = useCallback(
    (appLocale: Locale) => updatePrefs({ ...prefs, appLocale }),
    [prefs, updatePrefs],
  );
  const setQuestionLocale = useCallback(
    (questionLocale: Locale) => updatePrefs({ ...prefs, questionLocale }),
    [prefs, updatePrefs],
  );
  const setExplanationLocale = useCallback(
    (explanationLocale: Locale) => updatePrefs({ ...prefs, explanationLocale }),
    [prefs, updatePrefs],
  );

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) =>
      interpolate(TRANSLATIONS[prefs.appLocale][key], params),
    [prefs.appLocale],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({ ...prefs, setAppLocale, setQuestionLocale, setExplanationLocale, t }),
    [prefs, setAppLocale, setQuestionLocale, setExplanationLocale, t],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
