/** Resolves after `ms` milliseconds. Exists as its own module (rather than
 * an inline `new Promise(...)`) so tests can mock it to resolve instantly
 * instead of actually waiting out a real rate-limit backoff. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
