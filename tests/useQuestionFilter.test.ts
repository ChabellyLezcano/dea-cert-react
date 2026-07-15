import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useQuestionFilter, PAGE_SIZE } from '../src/quiz/hooks/useQuestionFilter';
import type { ProgressMap, Question } from '../src/quiz/quiz.types';

function buildBank(count: number): Question[] {
  return Array.from({ length: count }, (_, i) => ({
    n: i + 1,
    d: 'ING',
    m: 0,
    q: `Question ${i + 1}`,
    o: ['a', 'b'],
    a: [0],
    x: 'explanation',
    exam: 1,
    id: `E1Q${i + 1}`,
  }));
}

describe('useQuestionFilter', () => {
  it('paginates results in pages of PAGE_SIZE', () => {
    const bank = buildBank(PAGE_SIZE * 2 + 5);
    const { result } = renderHook(() => useQuestionFilter(bank, {}));

    expect(result.current.pageItems).toHaveLength(PAGE_SIZE);
    expect(result.current.totalPages).toBe(3);

    act(() => result.current.setPage(3));
    expect(result.current.pageItems).toHaveLength(5);
  });

  it('does not let the page go out of bounds', () => {
    const bank = buildBank(5);
    const { result } = renderHook(() => useQuestionFilter(bank, {}));

    act(() => result.current.setPage(99));
    expect(result.current.page).toBe(1);

    act(() => result.current.setPage(-3));
    expect(result.current.page).toBe(1);
  });

  it('filters out a question by status normally', () => {
    const bank = buildBank(3);
    const progress: ProgressMap = {
      E1Q1: { questionId: 'E1Q1', ok: true, picked: [0], revealed: false, updatedAt: 'now' },
    };
    const { result } = renderHook(() => useQuestionFilter(bank, progress));

    act(() => result.current.setStatus('pending'));
    expect(result.current.pageItems.map((q) => q.id)).not.toContain('E1Q1');
    expect(result.current.totalFiltered).toBe(2);
  });

  it('keeps a just-answered question visible under the pending filter until the filter changes', () => {
    const bank = buildBank(3);
    // Start with no progress; filter to "pending" first.
    const { result, rerender } = renderHook(
      ({ progress }: { progress: ProgressMap }) => useQuestionFilter(bank, progress),
      { initialProps: { progress: {} as ProgressMap } },
    );

    act(() => result.current.setStatus('pending'));
    expect(result.current.totalFiltered).toBe(3);

    // Simulate answering E1Q1 while still filtering by "pending": the
    // component registers the answer *before* progress updates land.
    act(() => result.current.registerAnswer('E1Q1'));

    const answeredProgress: ProgressMap = {
      E1Q1: { questionId: 'E1Q1', ok: true, picked: [0], revealed: false, updatedAt: 'now' },
    };
    rerender({ progress: answeredProgress });

    // The answered question must still be present so the user can see the
    // verdict, even though it no longer matches "pending".
    expect(result.current.pageItems.map((q) => q.id)).toContain('E1Q1');
    expect(result.current.totalFiltered).toBe(3);

    // Changing the filter clears the sticky set: now it should disappear.
    act(() => result.current.setStatus('pending'));
    expect(result.current.pageItems.map((q) => q.id)).not.toContain('E1Q1');
  });

  it('resets to page 1 whenever a filter changes', () => {
    const bank = buildBank(PAGE_SIZE * 2);
    const { result } = renderHook(() => useQuestionFilter(bank, {}));

    act(() => result.current.setPage(2));
    expect(result.current.page).toBe(2);

    act(() => result.current.setSearch('question'));
    expect(result.current.page).toBe(1);
  });

  it('filters by exam number', () => {
    const bank: Question[] = [
      ...buildBank(2),
      { n: 1, d: 'ING', m: 0, q: 'Q', o: ['a', 'b'], a: [0], x: 'x', exam: 2, id: 'E2Q1' },
    ];
    const { result } = renderHook(() => useQuestionFilter(bank, {}));

    act(() => result.current.setExam(2));
    expect(result.current.pageItems.map((q) => q.id)).toEqual(['E2Q1']);
  });

  it('filters by a search term across question, options and explanation', () => {
    const bank = buildBank(3);
    const { result } = renderHook(() => useQuestionFilter(bank, {}));

    act(() => result.current.setSearch('Question 2'));
    expect(result.current.pageItems.map((q) => q.id)).toEqual(['E1Q2']);
  });

  it('filters to only wrong or only correct answers', () => {
    const bank = buildBank(3);
    const progress: ProgressMap = {
      E1Q1: { questionId: 'E1Q1', ok: true, picked: [0], revealed: false, updatedAt: 'now' },
      E1Q2: { questionId: 'E1Q2', ok: false, picked: [1], revealed: false, updatedAt: 'now' },
    };
    const { result } = renderHook(() => useQuestionFilter(bank, progress));

    act(() => result.current.setStatus('right'));
    expect(result.current.pageItems.map((q) => q.id)).toEqual(['E1Q1']);

    act(() => result.current.setStatus('wrong'));
    expect(result.current.pageItems.map((q) => q.id)).toEqual(['E1Q2']);
  });
});
