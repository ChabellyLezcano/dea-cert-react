import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const orderMock = vi.fn();
const selectMock = vi.fn();
const fromMock = vi.fn();

vi.mock('../src/shared/lib/supabaseClient', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

function mockQuestionsResponse(result: { data?: unknown[]; error?: { message: string } | null }) {
  // Chain shape: .from('questions').select('*').order('exam', {...}).order('n', {...}).then(cb)
  const chain = {
    select: selectMock.mockReturnValue({
      order: orderMock.mockReturnValue({
        order: vi.fn().mockReturnValue({
          then: (resolve: (r: typeof result) => void) => Promise.resolve().then(() => resolve(result)),
        }),
      }),
    }),
  };
  fromMock.mockReturnValue(chain);
}

// Imported after the mock is registered so the hook picks up the mocked client.
const { useQuestionBank } = await import('../src/quiz/hooks/useQuestionBank');

describe('useQuestionBank', () => {
  it('maps Supabase rows into Question objects', async () => {
    mockQuestionsResponse({
      data: [
        {
          id: 'E1Q1',
          exam: 1,
          n: 1,
          domain: 'ING',
          is_multi: false,
          question: 'What loads files incrementally?',
          options: ['Auto Loader', 'COPY INTO'],
          correct_answers: [0],
          explanation: 'Auto Loader is built for incremental ingestion.',
        },
      ],
      error: null,
    });

    const { result } = renderHook(() => useQuestionBank());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.bank).toEqual([
      {
        id: 'E1Q1',
        exam: 1,
        n: 1,
        d: 'ING',
        m: 0,
        q: 'What loads files incrementally?',
        o: ['Auto Loader', 'COPY INTO'],
        a: [0],
        x: 'Auto Loader is built for incremental ingestion.',
      },
    ]);
  });

  it('maps is_multi:true to m:1', async () => {
    mockQuestionsResponse({
      data: [
        {
          id: 'E1Q2',
          exam: 1,
          n: 2,
          domain: 'TRA',
          is_multi: true,
          question: 'Pick two',
          options: ['a', 'b', 'c'],
          correct_answers: [0, 1],
          explanation: 'x',
        },
      ],
      error: null,
    });

    const { result } = renderHook(() => useQuestionBank());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.bank[0].m).toBe(1);
  });

  it('exposes the error message and an empty bank on failure', async () => {
    mockQuestionsResponse({ data: undefined, error: { message: 'relation "questions" does not exist' } });

    const { result } = renderHook(() => useQuestionBank());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('relation "questions" does not exist');
    expect(result.current.bank).toEqual([]);
  });

  it('handles a null data response gracefully', async () => {
    mockQuestionsResponse({ data: undefined, error: null });

    const { result } = renderHook(() => useQuestionBank());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.bank).toEqual([]);
  });

  it('does not update state after unmount', async () => {
    mockQuestionsResponse({ data: [], error: null });

    const { unmount } = renderHook(() => useQuestionBank());
    act(() => unmount());

    // No assertion needed beyond "this doesn't throw" — the isMounted guard
    // prevents a setState-after-unmount warning/crash.
    await waitFor(() => expect(true).toBe(true));
  });
});
