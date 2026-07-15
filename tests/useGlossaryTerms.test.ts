import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const orderMock = vi.fn();
const selectMock = vi.fn();
const fromMock = vi.fn();

vi.mock('../src/shared/lib/supabaseClient', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

function mockGlossaryResponse(result: { data?: unknown[]; error?: { message: string } | null }) {
  // Chain shape: .from('glossary_terms').select('*').order('term', {...}).then(cb)
  const chain = {
    select: selectMock.mockReturnValue({
      order: orderMock.mockReturnValue({
        then: (resolve: (r: typeof result) => void) => Promise.resolve().then(() => resolve(result)),
      }),
    }),
  };
  fromMock.mockReturnValue(chain);
}

const { useGlossaryTerms } = await import('../src/study/hooks/useGlossaryTerms');

describe('useGlossaryTerms', () => {
  it('maps Supabase rows into GlossaryTerm objects', async () => {
    mockGlossaryResponse({
      data: [
        {
          id: 1,
          term: 'Auto Loader',
          domain: 'ING',
          definition: 'Incrementally and efficiently loads new files.',
          code_snippet: null,
          retired: false,
        },
      ],
      error: null,
    });

    const { result } = renderHook(() => useGlossaryTerms());
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.terms).toEqual([
      {
        t: 'Auto Loader',
        c: 'ING',
        d: 'Incrementally and efficiently loads new files.',
        k: undefined,
        r: 0,
      },
    ]);
  });

  it('maps a null code_snippet to undefined and retired:true to r:1', async () => {
    mockGlossaryResponse({
      data: [
        {
          id: 2,
          term: 'Delta Sharing',
          domain: 'P',
          definition: 'Retired concept.',
          code_snippet: null,
          retired: true,
        },
      ],
      error: null,
    });

    const { result } = renderHook(() => useGlossaryTerms());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.terms[0].r).toBe(1);
    expect(result.current.terms[0].k).toBeUndefined();
  });

  it('preserves a code_snippet when present', async () => {
    mockGlossaryResponse({
      data: [
        {
          id: 3,
          term: 'MERGE INTO',
          domain: 'TRA',
          definition: 'Upserts rows into a Delta table.',
          code_snippet: 'MERGE INTO target USING source ON ...',
          retired: false,
        },
      ],
      error: null,
    });

    const { result } = renderHook(() => useGlossaryTerms());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.terms[0].k).toBe('MERGE INTO target USING source ON ...');
  });

  it('exposes the error message and an empty list on failure', async () => {
    mockGlossaryResponse({ data: undefined, error: { message: 'permission denied' } });

    const { result } = renderHook(() => useGlossaryTerms());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('permission denied');
    expect(result.current.terms).toEqual([]);
  });
});
