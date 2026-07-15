import { describe, expect, it } from 'vitest';
import { QUESTION_BANK, QUESTION_BY_ID, EXAM_NUMBERS } from '../src/quiz/data/bank';

describe('QUESTION_BANK', () => {
  it('is built synchronously and is non-empty', () => {
    expect(QUESTION_BANK.length).toBeGreaterThan(0);
  });

  it('has unique ids for every question', () => {
    const ids = new Set(QUESTION_BANK.map((q) => q.id));
    expect(ids.size).toBe(QUESTION_BANK.length);
  });

  it('exposes every question through QUESTION_BY_ID', () => {
    for (const question of QUESTION_BANK) {
      expect(QUESTION_BY_ID.get(question.id)).toBe(question);
    }
  });

  it('lists all 9 exam numbers', () => {
    expect(EXAM_NUMBERS).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('every question has at least one correct answer within its options range', () => {
    for (const question of QUESTION_BANK) {
      expect(question.a.length).toBeGreaterThan(0);
      for (const idx of question.a) {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(question.o.length);
      }
    }
  });
});
