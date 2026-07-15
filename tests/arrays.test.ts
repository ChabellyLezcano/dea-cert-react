import { describe, expect, it } from 'vitest';
import { sameMembers } from '../src/shared/utils/arrays';

describe('sameMembers', () => {
  it('returns true for identical arrays', () => {
    expect(sameMembers([1, 2, 3], [1, 2, 3])).toBe(true);
  });

  it('is order-independent', () => {
    expect(sameMembers([3, 1, 2], [1, 2, 3])).toBe(true);
  });

  it('returns false for different lengths', () => {
    expect(sameMembers([1, 2], [1, 2, 3])).toBe(false);
  });

  it('returns false for different members', () => {
    expect(sameMembers([1, 2, 4], [1, 2, 3])).toBe(false);
  });

  it('returns true for two empty arrays', () => {
    expect(sameMembers([], [])).toBe(true);
  });
});
