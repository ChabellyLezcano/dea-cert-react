import { useCallback, useState } from 'react';
import { supabase } from '@/shared/lib/supabaseClient';
import { useLocale } from '@/shared/i18n/useLocale';
import type { AiGeneratedQuestion } from '@/quiz/ai/aiQuestions.types';
import type { DomainId } from '@/quiz/quiz.types';

interface GenerateParams {
  certId: string;
  domain: DomainId;
  count: number;
}

export function useGenerateAiQuestions() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { questionLocale, explanationLocale, appLocale, t } = useLocale();

  const generate = useCallback(
    async (params: GenerateParams): Promise<AiGeneratedQuestion[]> => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke('generate-ai-questions', {
          body: { ...params, questionLocale, explanationLocale, appLocale },
        });
        if (fnError) throw fnError;
        if (data?.error) throw new Error(data.error);
        const questions = (data?.questions ?? []) as Omit<
          AiGeneratedQuestion,
          'questionLocale' | 'explanationLocale'
        >[];
        // Stamped client-side rather than trusted from the response: this
        // is exactly what was requested, and save() needs to know it to
        // pick the right column regardless of what the function returned.
        return questions.map((q) => ({ ...q, questionLocale, explanationLocale }));
      } catch (err) {
        setError(err instanceof Error ? err.message : t('ai.generate.error'));
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [questionLocale, explanationLocale, appLocale, t],
  );

  return { generate, isLoading, error };
}
