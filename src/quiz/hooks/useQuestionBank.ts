import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/shared/lib/supabaseClient';
import { useLocale } from '@/shared/i18n/useLocale';
import { resolveLocaleField } from '@/shared/i18n/resolveLocaleField';
import type { DomainId, Question } from '@/quiz/quiz.types';

export interface UseQuestionBankResult {
  bank: Question[];
  isLoading: boolean;
  error: string | null;
}

type RawRow = {
  id: string;
  cert_id: string;
  exam: number;
  n: number;
  domain: string;
  is_multi: boolean;
  question_en: string;
  question_es: string | null;
  options_en: unknown;
  options_es: unknown;
  correct_answers: number[];
  explanation_en: string | null;
  explanation_es: string;
};

/** Loads the shared question bank from the `questions` table. Unlike
 * per-user progress, this content is the same for everyone, so it's fetched
 * once per mount and requires no write path from the client.
 *
 * Fetches every language column in one request and re-resolves `q`/`o`/`x`
 * to the caller's current question/explanation language preference via
 * `useMemo` -- flipping the language toggle re-derives the bank instantly
 * from data already in memory, no refetch needed.
 * @param certId When provided, only questions for that certification are
 * fetched. Omitted entirely in tests, which don't care about filtering. */
export function useQuestionBank(certId?: string): UseQuestionBankResult {
  const [rows, setRows] = useState<RawRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { questionLocale, explanationLocale } = useLocale();

  useEffect(() => {
    let isMounted = true;

    let query = supabase.from('questions').select('*');
    if (certId) {
      query = query.eq('cert_id', certId);
    }

    query
      .range(0, 1200)
      .order('exam', { ascending: true })
      .order('n', { ascending: true })
      .then(({ data, error: fetchError }) => {
        if (!isMounted) return;
        if (fetchError) {
          setError(fetchError.message);
          setIsLoading(false);
          return;
        }
        setRows((data ?? []) as RawRow[]);
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [certId]);

  const bank = useMemo<Question[]>(
    () =>
      rows.map((row) => {
        const qByLocale = { en: row.question_en, es: row.question_es ?? undefined };
        const oByLocale = {
          en: row.options_en as string[],
          es: (row.options_es as string[] | null) ?? undefined,
        };
        const xByLocale = { en: row.explanation_en ?? undefined, es: row.explanation_es };

        return {
          id: row.id,
          certId: row.cert_id,
          exam: row.exam,
          n: row.n,
          d: row.domain as DomainId,
          m: row.is_multi ? 1 : 0,
          q: resolveLocaleField(qByLocale, questionLocale),
          o: resolveLocaleField(oByLocale, questionLocale),
          a: row.correct_answers,
          x: resolveLocaleField(xByLocale, explanationLocale),
          qByLocale,
          oByLocale,
          xByLocale,
        };
      }),
    [rows, questionLocale, explanationLocale],
  );

  return { bank, isLoading, error };
}
