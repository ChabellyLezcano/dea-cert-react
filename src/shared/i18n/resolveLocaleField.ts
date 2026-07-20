import type { Locale } from './locale';

/** Picks `preferred` from a partial per-locale map, falling back to
 * whichever locale IS present if the preferred one hasn't been
 * translated yet (e.g. a freshly AI-generated question saved in only one
 * language, or the batch translation script hasn't run yet). Never
 * returns undefined as long as at least one locale has content. */
export function resolveLocaleField<T>(byLocale: Partial<Record<Locale, T>>, preferred: Locale): T {
  const value = byLocale[preferred];
  if (value !== undefined) return value;
  const fallback = Object.values(byLocale).find((v) => v !== undefined);
  if (fallback === undefined) {
    throw new Error('resolveLocaleField: no locale variant available');
  }
  return fallback;
}
