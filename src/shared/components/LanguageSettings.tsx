import { useLocale } from '@/shared/i18n/useLocale';
import { LOCALES, LOCALE_LABELS, type Locale } from '@/shared/i18n/locale';

/** Three independent language selectors -- app chrome, question text, and
 * explanation text can each be set separately (e.g. English app + English
 * questions + Spanish explanations, matching the bank's original split). */
export function LanguageSettings() {
  const {
    appLocale,
    questionLocale,
    explanationLocale,
    setAppLocale,
    setQuestionLocale,
    setExplanationLocale,
    t,
  } = useLocale();

  return (
    <div className="flex flex-col gap-2.5 px-3 py-2.5">
      <LocaleRow label={t('header.appLanguage')} value={appLocale} onChange={setAppLocale} />
      <LocaleRow label={t('header.questionLanguage')} value={questionLocale} onChange={setQuestionLocale} />
      <LocaleRow
        label={t('header.explanationLanguage')}
        value={explanationLocale}
        onChange={setExplanationLocale}
      />
    </div>
  );
}

function LocaleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Locale;
  onChange: (locale: Locale) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-ink-500">{label}</span>
      <div
        className="flex items-center gap-0.5 rounded-lg bg-ink-50 p-0.5"
        role="radiogroup"
        aria-label={label}
      >
        {LOCALES.map((locale) => (
          <button
            key={locale}
            type="button"
            role="radio"
            aria-checked={value === locale}
            title={LOCALE_LABELS[locale]}
            onClick={() => onChange(locale)}
            className={`rounded-md px-2 py-1 text-xs font-semibold uppercase transition ${
              value === locale ? 'bg-surface text-brand-600 shadow-sm' : 'text-ink-400 hover:text-ink-700'
            }`}
          >
            {locale}
          </button>
        ))}
      </div>
    </div>
  );
}
