import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../shared/lib/supabaseClient';
import { sameMembers } from '../../shared/utils/arrays';
import type { ProgressMap, Question, QuestionProgress } from '../quiz.types';

/** Pure builders for a graded/revealed progress entry — exported so other
 * code (e.g. the mock exam's local draft state) can compute the exact same
 * "is this correct" logic without duplicating it or going through Supabase. */
export function buildGradedEntry(question: Question, picked: number[]): QuestionProgress {
  return {
    questionId: question.id,
    ok: sameMembers(picked, question.a),
    picked,
    revealed: false,
    updatedAt: new Date().toISOString(),
  };
}

export function buildRevealedEntry(question: Question): QuestionProgress {
  return {
    questionId: question.id,
    ok: false,
    picked: [],
    revealed: true,
    updatedAt: new Date().toISOString(),
  };
}

export interface UseProgressResult {
  progress: ProgressMap;
  isLoading: boolean;
  syncError: string | null;
  gradeQuestion: (question: Question, picked: number[]) => void;
  revealQuestion: (question: Question) => void;
  retryQuestion: (questionId: string) => void;
  resetAll: () => void;
}

/** Loads and persists question progress for the signed-in user in Supabase.
 * Writes are applied to local state immediately (optimistic) and synced in
 * the background so the UI never blocks on network latency. */
export function useProgress(userId: string | null): UseProgressResult {
  const [progress, setProgress] = useState<ProgressMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (!userId) {
      Promise.resolve().then(() => {
        if (!isMounted) return;
        setProgress({});
        setIsLoading(false);
      });
      return () => {
        isMounted = false;
      };
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: reset loading state when userId changes, before the async fetch resolves
    setIsLoading(true);

    supabase
      .from('question_progress')
      .select('*')
      .eq('user_id', userId)
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          setSyncError(error.message);
          setIsLoading(false);
          return;
        }
        const map: ProgressMap = {};
        (data ?? []).forEach((row) => {
          map[row.question_id] = {
            questionId: row.question_id,
            ok: row.ok,
            picked: row.picked,
            revealed: row.revealed,
            updatedAt: row.updated_at,
          };
        });
        setProgress(map);
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const persist = useCallback(
    (entry: QuestionProgress) => {
      if (!userId) return;
      supabase
        .from('question_progress')
        .upsert(
          {
            user_id: userId,
            question_id: entry.questionId,
            ok: entry.ok,
            picked: entry.picked,
            revealed: entry.revealed,
            updated_at: entry.updatedAt,
          },
          { onConflict: 'user_id,question_id' },
        )
        .then(({ error }) => {
          if (error) setSyncError(error.message);
        });
    },
    [userId],
  );

  const gradeQuestion = useCallback(
    (question: Question, picked: number[]) => {
      const entry = buildGradedEntry(question, picked);
      setProgress((prev) => ({ ...prev, [question.id]: entry }));
      persist(entry);
    },
    [persist],
  );

  const revealQuestion = useCallback(
    (question: Question) => {
      const entry = buildRevealedEntry(question);
      setProgress((prev) => ({ ...prev, [question.id]: entry }));
      persist(entry);
    },
    [persist],
  );

  const retryQuestion = useCallback(
    (questionId: string) => {
      setProgress((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
      if (!userId) return;
      supabase
        .from('question_progress')
        .delete()
        .eq('user_id', userId)
        .eq('question_id', questionId)
        .then(({ error }) => {
          if (error) setSyncError(error.message);
        });
    },
    [userId],
  );

  const resetAll = useCallback(() => {
    setProgress({});
    if (!userId) return;
    supabase
      .from('question_progress')
      .delete()
      .eq('user_id', userId)
      .then(({ error }) => {
        if (error) setSyncError(error.message);
      });
  }, [userId]);

  return { progress, isLoading, syncError, gradeQuestion, revealQuestion, retryQuestion, resetAll };
}
