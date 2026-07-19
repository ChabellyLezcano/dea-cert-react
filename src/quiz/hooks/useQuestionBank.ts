import { useEffect, useState } from 'react';
import { supabase } from '@/shared/lib/supabaseClient';
import type { DomainId, Question } from '@/quiz/quiz.types';

export interface UseQuestionBankResult {
  bank: Question[];
  isLoading: boolean;
  error: string | null;
}

/** Loads the shared question bank from the `questions` table. Unlike
 * per-user progress, this content is the same for everyone, so it's fetched
 * once per mount and requires no write path from the client.
 * @param certId When provided, only questions for that certification are
 * fetched. Omitted entirely in tests, which don't care about filtering. */
export function useQuestionBank(certId?: string): UseQuestionBankResult {
  const [bank, setBank] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    let query = supabase.from('questions').select('*');
    if (certId) query = query.eq('cert_id', certId);

    query
      .order('exam', { ascending: true })
      .order('n', { ascending: true })
      .then(({ data, error: fetchError }) => {
        if (!isMounted) return;
        if (fetchError) {
          setError(fetchError.message);
          setIsLoading(false);
          return;
        }
        const mapped: Question[] = (data ?? []).map((row) => ({
          id: row.id,
          certId: row.cert_id,
          exam: row.exam,
          n: row.n,
          d: row.domain as DomainId,
          m: row.is_multi ? 1 : 0,
          q: row.question,
          o: row.options as string[],
          a: row.correct_answers,
          x: row.explanation,
        }));
        setBank(mapped);
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [certId]);

  return { bank, isLoading, error };
}
