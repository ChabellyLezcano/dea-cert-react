import type { ReactElement } from 'react';
import { useTheme } from '../../shared/theme/useTheme';
import { useLocale } from '../i18n/useLocale';
import type { Theme } from '../../shared/theme/themeContextInstance';

const ICONS: Record<Theme, ReactElement> = {
  light: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  ),
  dark: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  ),
  system: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  ),
};

const THEME_VALUES: Theme[] = ['light', 'dark', 'system'];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useLocale();

  const labels: Record<Theme, string> = {
    light: t('theme.light'),
    dark: t('theme.dark'),
    system: t('theme.system'),
  };

  return (
    <div
      role="radiogroup"
      aria-label={t('theme.colorTheme')}
      className="flex items-center gap-0.5 rounded-xl bg-ink-50 p-1"
    >
      {THEME_VALUES.map((value) => {
        const isActive = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={labels[value]}
            title={labels[value]}
            onClick={() => setTheme(value)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
              isActive ? 'bg-surface text-brand-600 shadow-sm' : 'text-ink-400 hover:text-ink-700'
            }`}
          >
            {ICONS[value]}
          </button>
        );
      })}
    </div>
  );
}
