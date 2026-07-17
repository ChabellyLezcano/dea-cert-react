/** Returns a random permutation of [0, 1, ..., length - 1] using the
 * Fisher-Yates shuffle. Used to randomize the *display* order of options
 * without touching the underlying data (correct-answer indices, etc.),
 * which still refer to positions in the original, unshuffled array. */
export function shuffleIndices(length: number): number[] {
  const indices = Array.from({ length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

/** Returns a new array with the same elements as `items`, in random order.
 * Built on top of shuffleIndices so both share the same shuffle algorithm. */
export function shuffleArray<T>(items: readonly T[]): T[] {
  return shuffleIndices(items.length).map((i) => items[i]);
}
