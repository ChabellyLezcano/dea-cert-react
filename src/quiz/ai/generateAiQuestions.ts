import { supabase } from '@/shared/lib/supabaseClient';
import type { AiGeneratedQuestion } from '@/quiz/ai/aiQuestions.types';
import type { DomainId } from '@/quiz/quiz.types';
import type { Locale } from '@/shared/i18n/locale';

export interface GenerateAiQuestionsParams {
  certId: string;
  domain: DomainId;
  count: number;
  questionLocale: Locale;
  explanationLocale: Locale;
  appLocale: Locale;
}

export type GenerateAiQuestionsResult =
  | { ok: true; questions: AiGeneratedQuestion[] }
  | {
      ok: false;
      error: string;
      /** Seconds Groq itself said to wait before retrying, parsed from its
       * 429 message (e.g. "...Please try again in 44.36s..."). Only set
       * when the error was actually a rate limit -- distinguishes "wait
       * and retry this exact batch" from "no study notes for this domain"
       * or any other error that retrying won't fix. */
      retryAfterSeconds?: number;
    };

// Groq's 429 body includes a human-readable hint like "Please try again in
// 44.36s." -- this is more accurate than guessing a fixed backoff, since
// the actual wait depends on how close to the per-minute token budget the
// account already is.
const RETRY_AFTER_PATTERN = /try again in ([\d.]+)s/i;

function parseRetryAfterSeconds(message: string): number | undefined {
  const match = RETRY_AFTER_PATTERN.exec(message);
  if (!match) return undefined;
  const seconds = Number(match[1]);
  return Number.isFinite(seconds) ? seconds : undefined;
}

/** Calls the generate-ai-questions edge function for a single domain/count
 * and normalizes both transport errors (fnError) and function-reported
 * errors (data.error, e.g. "no study notes for this domain") into one
 * result shape. Kept as a plain async function (no hook state) so it can
 * be awaited in a loop by useGenerateAiExam without fighting React state
 * batching across iterations. */
export async function generateAiQuestions(
  params: GenerateAiQuestionsParams,
): Promise<GenerateAiQuestionsResult> {
  try {
    const { data, error: fnError } = await supabase.functions.invoke('generate-ai-questions', {
      body: params,
    });
    if (fnError) throw fnError;
    if (data?.error) throw new Error(data.error);

    const questions = (data?.questions ?? []) as Omit<
      AiGeneratedQuestion,
      'questionLocale' | 'explanationLocale'
    >[];
    return {
      ok: true,
      // Stamped client-side rather than trusted from the response: this is
      // exactly what was requested, and save() needs to know it to pick
      // the right column regardless of what the function returned.
      questions: questions.map((q) => ({
        ...q,
        questionLocale: params.questionLocale,
        explanationLocale: params.explanationLocale,
      })),
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unexpected error.';
    const retryAfterSeconds = parseRetryAfterSeconds(error);
    return retryAfterSeconds === undefined ? { ok: false, error } : { ok: false, error, retryAfterSeconds };
  }
}
