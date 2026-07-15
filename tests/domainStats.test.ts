import { describe, expect, it } from 'vitest';
import { computeDomainStats } from '../src/quiz/utils/domainStats';
import type { ProgressMap, Question } from '../src/quiz/quiz.types';

const bank: Question[] = [
  { n: 1, d: 'ING', m: 0, q: 'Q1', o: ['a', 'b'], a: [0], x: 'x', exam: 1, id: 'E1Q1' },
  { n: 2, d: 'ING', m: 0, q: 'Q2', o: ['a', 'b'], a: [1], x: 'x', exam: 1, id: 'E1Q2' },
  { n: 3, d: 'TRA', m: 0, q: 'Q3', o: ['a', 'b'], a: [0], x: 'x', exam: 1, id: 'E1Q3' },
];

describe('computeDomainStats', () => {
  it('counts totals for a single domain', () => {
    const stats = computeDomainStats(bank, 'ING', {});
    expect(stats).toEqual({ total: 2, answered: 0, correct: 0 });
  });

  it('counts totals across all domains', () => {
    const stats = computeDomainStats(bank, 'ALL', {});
    expect(stats.total).toBe(3);
  });

  it('counts answered and correct questions from progress', () => {
    const progress: ProgressMap = {
      E1Q1: { questionId: 'E1Q1', ok: true, picked: [0], revealed: false, updatedAt: 'now' },
      E1Q2: { questionId: 'E1Q2', ok: false, picked: [0], revealed: false, updatedAt: 'now' },
    };
    const stats = computeDomainStats(bank, 'ING', progress);
    expect(stats).toEqual({ total: 2, answered: 2, correct: 1 });
  });
});
