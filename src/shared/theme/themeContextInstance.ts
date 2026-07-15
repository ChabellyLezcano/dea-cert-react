import { createContext } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextValue {
  /** The user's stored preference: 'light', 'dark', or 'system'. */
  theme: Theme;
  /** The actual theme applied to the page (system resolved to light/dark). */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

export const THEME_STORAGE_KEY = 'dea26-theme';

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
