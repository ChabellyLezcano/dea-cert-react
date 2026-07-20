import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AllProviders } from './testUtils';
import type { Domain } from '../src/quiz/quiz.types';

const invokeMock = vi.fn();

vi.mock('@/shared/lib/supabaseClient', () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => invokeMock(...args),
    },
  },
}));

// Imported after the mock is registered so the hook picks up the mocked client.
const { useGenerateAiExam } = await import('../src/quiz/hooks/useGenerateAiExam');

const DOMAINS: Domain[] = [
  { id: 'P', order: 1, name: 'Platform', weight: 6, certId: 'databricks-dea' },
  { id: 'ING', order: 2, name: 'Ingestion', weight: 21, certId: 'databricks-dea' },
  { id: 'TRA', order: 3, name: 'Transformation', weight: 22, certId: 'databricks-dea' },
  { id: 'JOBS', order: 4, name: 'Jobs', weight: 16, certId: 'databricks-dea' },
  { id: 'CICD', order: 5, name: 'CI/CD', weight: 10, certId: 'databricks-dea' },
  { id: 'TRO', order: 6, name: 'Troubleshooting', weight: 10, certId: 'databricks-dea' },
  { id: 'GOV', order: 7, name: 'Governance', weight: 15, certId: 'databricks-dea' },
];

function fakeQuestions(domain: string, count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `AI-${domain}-${i}`,
    certId: 'databricks-dea',
    domain,
    m: 0,
    q: `Question ${i}`,
    o: ['a', 'b'],
    a: [0],
    x: 'because',
  }));
}

beforeEach(() => {
  invokeMock.mockReset();
});

describe('useGenerateAiExam', () => {
  it('issues one batched call per domain and aggregates all questions to the requested total', async () => {
    invokeMock.mockImplementation((_fn: string, { body }: { body: { domain: string; count: number } }) =>
      Promise.resolve({ data: { questions: fakeQuestions(body.domain, body.count) }, error: null }),
    );

    const { result } = renderHook(() => useGenerateAiExam(), { wrapper: AllProviders });

    let questions: unknown[] = [];
    await act(async () => {
      questions = await result.current.generateExam({
        certId: 'databricks-dea',
        domains: DOMAINS,
        totalCount: 45,
      });
    });

    expect(questions).toHaveLength(45);
    expect(result.current.error).toBeNull();
    expect(result.current.progress).toEqual({ completedBatches: 7, totalBatches: 7 });

    // Every call must request no more than the edge function's own cap.
    for (const call of invokeMock.mock.calls) {
      const body = call[1].body as { count: number };
      expect(body.count).toBeLessThanOrEqual(10);
    }
  });

  it('continues past a failed domain and still returns the questions that succeeded', async () => {
    invokeMock.mockImplementation((_fn: string, { body }: { body: { domain: string; count: number } }) => {
      if (body.domain === 'GOV') {
        return Promise.resolve({ data: { error: 'no study notes for this domain' }, error: null });
      }
      return Promise.resolve({ data: { questions: fakeQuestions(body.domain, body.count) }, error: null });
    });

    const { result } = renderHook(() => useGenerateAiExam(), { wrapper: AllProviders });

    let questions: unknown[] = [];
    await act(async () => {
      questions = await result.current.generateExam({
        certId: 'databricks-dea',
        domains: DOMAINS,
        totalCount: 45,
      });
    });

    expect(questions.length).toBeGreaterThan(0);
    expect(questions.length).toBeLessThan(45);
    await waitFor(() => expect(result.current.error).toContain('Governance'));
  });

  it('reports an error and returns an empty list when every batch fails', async () => {
    invokeMock.mockResolvedValue({ data: { error: 'boom' }, error: null });

    const { result } = renderHook(() => useGenerateAiExam(), { wrapper: AllProviders });

    let questions: unknown[] = [];
    await act(async () => {
      questions = await result.current.generateExam({
        certId: 'databricks-dea',
        domains: DOMAINS,
        totalCount: 45,
      });
    });

    expect(questions).toEqual([]);
    expect(result.current.error).toBeTruthy();
  });
});
