import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/shared/lib/supabaseClient';
import { useLocale } from '@/shared/i18n/useLocale';
import { resolveLocaleField } from '@/shared/i18n/resolveLocaleField';
import type { AiGeneratedQuestion } from '@/quiz/ai/aiQuestions.types';
import type { TablesInsert } from '@/types/database.types';

interface FavoriteRow {
  id: string;
  cert_id: string;
  domain: string;
  is_multi: boolean;
  question_en: string;
  question_es: string | null;
  options_en: unknown;
  options_es: unknown;
  correct_answers: number[];
  explanation_en: string;
  explanation_es: string | null;
  source_topic_ids: string[];
}

export function useFavoriteAiQuestions(certId: string | undefined, userId: string | null) {
  const [rows, setRows] = useState<FavoriteRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { questionLocale, explanationLocale } = useLocale();

  const refetch = useCallback(async () => {
    if (!userId || !certId) {
      setRows([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await supabase
      .from('favorite_ai_questions')
      .select('*')
      .eq('cert_id', certId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRows(data as FavoriteRow[]);
    }
    setIsLoading(false);
  }, [certId, userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch de datos externos (Supabase) al cambiar certId/userId, no es un antipatrón de cascading render
    refetch();
  }, [refetch]);

  // Re-resolved to the current question/explanation language preference
  // whenever it changes, from data already in memory (no refetch).
  const favorites = useMemo<AiGeneratedQuestion[]>(
    () =>
      rows.map((row) => {
        const qByLocale = { en: row.question_en, es: row.question_es ?? undefined };
        const oByLocale = {
          en: row.options_en as string[],
          es: (row.options_es as string[] | null) ?? undefined,
        };
        const xByLocale = { en: row.explanation_en, es: row.explanation_es ?? undefined };

        return {
          id: row.id,
          certId: row.cert_id,
          domain: row.domain,
          m: row.is_multi ? 1 : 0,
          q: resolveLocaleField(qByLocale, questionLocale),
          o: resolveLocaleField(oByLocale, questionLocale),
          a: row.correct_answers,
          x: resolveLocaleField(xByLocale, explanationLocale),
          questionLocale,
          explanationLocale,
          sourceTopicIds: row.source_topic_ids ?? [],
        };
      }),
    [rows, questionLocale, explanationLocale],
  );

  const save = useCallback(
    async (question: AiGeneratedQuestion) => {
      if (!userId) return;
      // Written into the column matching the locale it was actually
      // generated in; the other locale's column is left null until the
      // translation script (or a future regeneration) fills it in.
      const questionColumn = question.questionLocale === 'es' ? 'question_es' : 'question_en';
      const optionsColumn = question.questionLocale === 'es' ? 'options_es' : 'options_en';
      const explanationColumn = question.explanationLocale === 'es' ? 'explanation_es' : 'explanation_en';

      // The two locale columns for each field are NOT NULL only on the
      // *_en side (see migration 0007) -- if this question happened to be
      // generated in Spanish, we still need to satisfy question_en/
      // options_en/explanation_en's not-null constraint with the same
      // text, and let the real translation happen later. Only relevant
      // when the locale-specific column differs from the *_en one.
      const insertPayload: Record<string, unknown> = {
        user_id: userId,
        cert_id: question.certId,
        domain: question.domain,
        is_multi: question.m === 1,
        correct_answers: question.a,
        source_topic_ids: question.sourceTopicIds,
        [questionColumn]: question.q,
        [optionsColumn]: question.o,
        [explanationColumn]: question.x,
      };
      if (questionColumn !== 'question_en') insertPayload.question_en = question.q;
      if (optionsColumn !== 'options_en') insertPayload.options_en = question.o;
      if (explanationColumn !== 'explanation_en') insertPayload.explanation_en = question.x;

      const { error } = await supabase
        .from('favorite_ai_questions')
        .insert(insertPayload as TablesInsert<'favorite_ai_questions'>);
      if (!error) await refetch();
    },
    [userId, refetch],
  );

  const remove = useCallback(async (favoriteId: string) => {
    await supabase.from('favorite_ai_questions').delete().eq('id', favoriteId);
    setRows((prev) => prev.filter((f) => f.id !== favoriteId));
  }, []);

  return { favorites, isLoading, save, remove, refetch };
}
