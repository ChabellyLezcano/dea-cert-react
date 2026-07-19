import { useCallback, useState } from 'react';
import { supabase } from '@/shared/lib/supabaseClient';
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

  const generate = useCallback(async (params: GenerateParams): Promise<AiGeneratedQuestion[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-ai-questions', {
        body: params,
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      return (data?.questions ?? []) as AiGeneratedQuestion[];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron generar preguntas.');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { generate, isLoading, error };
}
