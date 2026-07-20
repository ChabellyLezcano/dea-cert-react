export type Locale = 'en' | 'es';

export const LOCALES: Locale[] = ['en', 'es'];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
};

export interface LocalePreferences {
  /** Language of the app chrome itself (nav, buttons, labels). */
  appLocale: Locale;
  /** Language questions and answer options are shown in. */
  questionLocale: Locale;
  /** Language explanations are shown in. */
  explanationLocale: Locale;
}

const STORAGE_KEY = 'cert-prep:locale-preferences';

// Mirrors today's de-facto content split (bank questions were written in
// English, explanations in Spanish) so existing users see no change on
// first load after this feature ships -- the toggle is opt-in from here.
export const DEFAULT_PREFERENCES: LocalePreferences = {
  appLocale: 'en',
  questionLocale: 'en',
  explanationLocale: 'es',
};

function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'es';
}

export function loadLocalePreferences(): LocalePreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<LocalePreferences>;
    return {
      appLocale: isLocale(parsed.appLocale) ? parsed.appLocale : DEFAULT_PREFERENCES.appLocale,
      questionLocale: isLocale(parsed.questionLocale)
        ? parsed.questionLocale
        : DEFAULT_PREFERENCES.questionLocale,
      explanationLocale: isLocale(parsed.explanationLocale)
        ? parsed.explanationLocale
        : DEFAULT_PREFERENCES.explanationLocale,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function saveLocalePreferences(prefs: LocalePreferences): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage can be unavailable (private browsing, quota) -- the
    // preference just won't persist across reloads, which is fine.
  }
}
