// src/guide/hooks/useStudyTopics.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/shared/lib/supabaseClient';
import type { DomainId } from '@/quiz/quiz.types';
import type { StudyTopic } from '@/types/guide.types';

export interface UseStudyTopicsResult {
  topics: StudyTopic[];
  isLoading: boolean;
  error: string | null;
}

/** Loads the study guide (topic-by-topic notes) from the `study_topics`
 * table. Shared, read-only content — same fetch-once-per-mount pattern as
 * useQuestionBank / useGlossaryTerms.
 * @param certId When provided, only topics for that certification are
 * fetched. */
export function useStudyTopics(certId?: string): UseStudyTopicsResult {
  const [topics, setTopics] = useState<StudyTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    let query = supabase.from('study_topics').select('*');
    if (certId) query = query.eq('cert_id', certId);

    query
      .order('domain', { ascending: true })
      .order('topic_order', { ascending: true })
      .then(({ data, error: fetchError }) => {
        if (!isMounted) return;
        if (fetchError) {
          setError(fetchError.message);
          setIsLoading(false);
          return;
        }
        const mapped: StudyTopic[] = (data ?? []).map((row) => ({
          id: row.id,
          certId: row.cert_id,
          domain: row.domain as DomainId,
          order: row.topic_order,
          title: row.title,
          summary: row.summary,
          contentMd: row.content_md,
        }));
        setTopics(mapped);
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [certId]);

  return { topics, isLoading, error };
}
