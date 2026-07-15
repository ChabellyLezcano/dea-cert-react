import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { ThemeProvider } from '../src/shared/theme/ThemeProvider';
import { useTheme } from '../src/shared/theme/useTheme';
import { THEME_STORAGE_KEY } from '../src/shared/theme/themeContextInstance';

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

function mockMatchMedia(matches: boolean) {
  const listeners: ((event: MediaQueryListEvent) => void)[] = [];
  window.matchMedia = vi.fn().mockReturnValue({
    matches,
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_: string, cb: (event: MediaQueryListEvent) => void) => listeners.push(cb),
    removeEventListener: vi.fn(),
  });
  return {
    fireChange: (nextMatches: boolean) => {
      listeners.forEach((cb) => cb({ matches: nextMatches } as MediaQueryListEvent));
    },
  };
}

describe('ThemeProvider / useTheme', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    document.documentElement.classList.remove('dark');
  });

  it('defaults to system theme and resolves it from prefers-color-scheme', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe('system');
    expect(result.current.resolvedTheme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('reads a previously stored preference', () => {
    mockMatchMedia(false);
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe('dark');
    expect(result.current.resolvedTheme).toBe('dark');
  });

  it('setTheme persists the choice and updates the resolved theme', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => result.current.setTheme('dark'));

    expect(result.current.theme).toBe('dark');
    expect(result.current.resolvedTheme).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('switching back to light removes the dark class', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => result.current.setTheme('dark'));
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    act(() => result.current.setTheme('light'));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(result.current.resolvedTheme).toBe('light');
  });

  it('tracks system preference changes while theme is "system"', () => {
    const media = mockMatchMedia(false);
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.resolvedTheme).toBe('light');

    act(() => media.fireChange(true));
    expect(result.current.resolvedTheme).toBe('dark');
  });

  it('throws when useTheme is used outside a ThemeProvider', () => {
    const { result } = renderHook(() => {
      try {
        return useTheme();
      } catch (error) {
        return error;
      }
    });
    expect(result.current).toBeInstanceOf(Error);
  });
});
