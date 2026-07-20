import { useCallback, useState } from 'react';
import { generateAiQuestions } from '@/quiz/ai/generateAiQuestions';
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
      const result = await generateAiQuestions({ ...params, questionLocale, explanationLocale, appLocale });
      setIsLoading(false);
      if (!result.ok) {
        setError(result.error || t('ai.generate.error'));
        return [];
      }
      return result.questions;
    },
    [questionLocale, explanationLocale, appLocale, t],
  );

  return { generate, isLoading, error };
}
