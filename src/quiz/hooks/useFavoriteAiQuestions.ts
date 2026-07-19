import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/shared/lib/supabaseClient';
import type { AiGeneratedQuestion } from '@/quiz/ai/aiQuestions.types';

interface FavoriteRow {
  id: string;
  cert_id: string;
  domain: string;
  is_multi: boolean;
  question: string;
  options: string[];
  correct_answers: number[];
  explanation: string;
  source_topic_ids: string[];
}

function mapRow(row: FavoriteRow): AiGeneratedQuestion {
  return {
    id: row.id,
    certId: row.cert_id,
    domain: row.domain,
    m: row.is_multi ? 1 : 0,
    q: row.question,
    o: row.options,
    a: row.correct_answers,
    x: row.explanation,
    sourceTopicIds: row.source_topic_ids ?? [],
  };
}

export function useFavoriteAiQuestions(certId: string | undefined, userId: string | null) {
  const [favorites, setFavorites] = useState<AiGeneratedQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!userId || !certId) {
      setFavorites([]);
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
      setFavorites((data as FavoriteRow[]).map(mapRow));
    }
    setIsLoading(false);
  }, [certId, userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch de datos externos (Supabase) al cambiar certId/userId, no es un antipatrón de cascading render
    refetch();
  }, [refetch]);

  const save = useCallback(
    async (question: AiGeneratedQuestion) => {
      if (!userId) return;
      const { error } = await supabase.from('favorite_ai_questions').insert({
        user_id: userId,
        cert_id: question.certId,
        domain: question.domain,
        is_multi: question.m === 1,
        question: question.q,
        options: question.o,
        correct_answers: question.a,
        explanation: question.x,
        source_topic_ids: question.sourceTopicIds,
      });
      if (!error) await refetch();
    },
    [userId, refetch],
  );

  const remove = useCallback(async (favoriteId: string) => {
    await supabase.from('favorite_ai_questions').delete().eq('id', favoriteId);
    setFavorites((prev) => prev.filter((f) => f.id !== favoriteId));
  }, []);

  return { favorites, isLoading, save, remove, refetch };
}
