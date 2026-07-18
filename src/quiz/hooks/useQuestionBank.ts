import { useEffect, useState } from 'react';
import { supabase } from '../../shared/lib/supabaseClient';
import type { DomainId, Question } from '../quiz.types';

export interface UseQuestionBankResult {
  bank: Question[];
  isLoading: boolean;
  error: string | null;
}

/** Loads the shared question bank from the `questions` table. Unlike
 * per-user progress, this content is the same for everyone, so it's fetched
 * once per mount and requires no write path from the client. */
export function useQuestionBank(): UseQuestionBankResult {
  const [bank, setBank] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    supabase
      .from('questions')
      .select('*')
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
          o: row.options,
          a: row.correct_answers,
          x: row.explanation,
        }));
        setBank(mapped);
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { bank, isLoading, error };
}
