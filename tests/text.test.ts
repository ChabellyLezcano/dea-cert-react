import { describe, expect, it } from 'vitest';
import { normalizeText, splitByTerm } from '../src/shared/utils/text';

describe('normalizeText', () => {
  it('lowercases and strips accents', () => {
    expect(normalizeText('Optimización')).toBe('optimizacion');
    expect(normalizeText('VACUUM')).toBe('vacuum');
  });
});

describe('splitByTerm', () => {
  it('returns a single unmatched segment when term is empty', () => {
    expect(splitByTerm('hello world', '')).toEqual([{ text: 'hello world', matched: false }]);
  });

  it('marks the matching segment case-insensitively', () => {
    const segments = splitByTerm('Auto Loader ingests files', 'loader');
    const matched = segments.filter((s) => s.matched);
    expect(matched).toHaveLength(1);
    expect(matched[0].text.toLowerCase()).toBe('loader');
  });

  it('does not throw on regex special characters', () => {
    expect(() => splitByTerm('a (b) c', '(b)')).not.toThrow();
  });
});
