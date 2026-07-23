import { lazy, type ComponentType } from 'react';

/**
 * Wraps `React.lazy()` so that a failed dynamic import -- the classic
 * symptom of a browser tab left open across a redeploy, where the currently
 * loaded index.html still points at a JS chunk filename (Vite hashes them
 * per build) that no longer exists on the server -- triggers a single
 * automatic full-page reload instead of leaving the user on a broken page.
 *
 * The sessionStorage flag prevents an infinite reload loop if the import
 * keeps failing for some other reason (e.g. the user is offline): we only
 * force-reload once per failing chunk per tab session, then let the error
 * surface normally.
 */
export function lazyWithReload<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
  chunkId: string,
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    const storageKey = `chunk-reload:${chunkId}`;
    try {
      const module = await factory();
      // A successful load means any previous failure for this chunk is
      // resolved -- clear the flag so a *future* redeploy can retry too.
      sessionStorage.removeItem(storageKey);
      return module;
    } catch (error) {
      const alreadyReloaded = sessionStorage.getItem(storageKey) === '1';
      if (!alreadyReloaded) {
        sessionStorage.setItem(storageKey, '1');
        window.location.reload();
        // Reload is async; return a never-resolving promise so React
        // doesn't render an error state in the brief window before the
        // page actually navigates away.
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }
  });
}
