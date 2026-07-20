import { useCallback, useState } from 'react';
import { generateAiQuestions } from '@/quiz/ai/generateAiQuestions';
import { planAiExamBatches, AI_EXAM_BATCH_MAX } from '@/quiz/utils/aiExamPlan';
import { useLocale } from '@/shared/i18n/useLocale';
import { sleep } from '@/shared/utils/sleep';
import type { AiGeneratedQuestion } from '@/quiz/ai/aiQuestions.types';
import type { Domain } from '@/quiz/quiz.types';
import type { GenerateAiQuestionsResult } from '@/quiz/ai/generateAiQuestions';

export interface AiExamProgress {
  completedBatches: number;
  totalBatches: number;
  /** Set while paused waiting out a Groq rate-limit backoff before
   * retrying the current batch -- lets the UI show "waiting Ns" instead
   * of looking stuck, since a single wait can be 30-60s on the free
   * tier. */
  retryingInSeconds?: number;
}

interface GenerateExamParams {
  certId: string;
  /** Must already be filtered to this certification -- see the "AI domain
   * bug pattern" note in project notes: the aggregated DOMAINS array
   * spans every loaded certification, and passing it unfiltered here
   * would burn batches generating questions for domains that don't even
   * belong to this exam. */
  domains: Domain[];
  totalCount: number;
}

// Groq's free tier caps tokens-per-minute, not requests-per-minute -- a
// single domain's question batch can burn most of that budget by itself
// (each question runs a few hundred tokens of prompt + completion), so
// hitting 429 mid-exam is an expected, recoverable condition, not a real
// failure. Bounded so a persistently-saturated account still gives up
// eventually instead of retrying forever.
const MAX_RETRIES_PER_BATCH = 2;
// Groq reports the exact wait in its error (e.g. "try again in 44.36s");
// this only bounds it in case that number is ever larger than reasonable
// to sit through in a browser tab.
const MAX_RETRY_WAIT_SECONDS = 75;

export function useGenerateAiExam() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<AiExamProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { questionLocale, explanationLocale, appLocale, t } = useLocale();

  const generateExam = useCallback(
    async ({ certId, domains, totalCount }: GenerateExamParams): Promise<AiGeneratedQuestion[]> => {
      setIsLoading(true);
      setError(null);

      const batches = planAiExamBatches(domains, totalCount, AI_EXAM_BATCH_MAX);
      setProgress({ completedBatches: 0, totalBatches: batches.length });

      const questions: AiGeneratedQuestion[] = [];
      // Domain names, not codes, so a partial-failure message reads like
      // "Governance and Security" instead of an opaque "GOV". Keeps the
      // actual error text per domain too -- "some domains failed" alone
      // isn't actionable; "no study notes for this domain yet" is.
      const failures: { domainName: string; error: string }[] = [];
      const domainNameById = new Map(domains.map((d) => [d.id, d.name]));

      // Sequential on purpose: each call already takes a few seconds on
      // Groq's free tier, and firing 5-9 of them in parallel risks
      // tripping its per-minute rate limit for one request each -- better
      // to show steady progress than to have several batches fail at once.
      for (let i = 0; i < batches.length; i += 1) {
        const batch = batches[i];
        let result: GenerateAiQuestionsResult = await generateAiQuestions({
          certId,
          domain: batch.domain,
          count: batch.count,
          questionLocale,
          explanationLocale,
          appLocale,
        });

        let retries = 0;
        while (!result.ok && result.retryAfterSeconds !== undefined && retries < MAX_RETRIES_PER_BATCH) {
          const waitSeconds = Math.min(Math.ceil(result.retryAfterSeconds) + 1, MAX_RETRY_WAIT_SECONDS);
          setProgress({ completedBatches: i, totalBatches: batches.length, retryingInSeconds: waitSeconds });
          await sleep(waitSeconds * 1000);
          retries += 1;
          result = await generateAiQuestions({
            certId,
            domain: batch.domain,
            count: batch.count,
            questionLocale,
            explanationLocale,
            appLocale,
          });
        }

        if (result.ok) {
          questions.push(...result.questions);
        } else {
          const domainName = domainNameById.get(batch.domain) ?? batch.domain;
          failures.push({ domainName, error: result.error });
          // Full detail always goes to the console, even when the UI
          // message below has to summarize -- this is what you'd check in
          // devtools to see exactly why a given domain failed.
          console.error(`AI exam: batch for domain "${domainName}" failed:`, result.error);
        }
        setProgress({ completedBatches: i + 1, totalBatches: batches.length });
      }

      if (questions.length === 0 && failures.length > 0) {
        setError(t('ai.generate.examAllFailed', { reason: failures[0].error }));
      } else if (failures.length > 0) {
        const uniqueDomains = [...new Set(failures.map((f) => f.domainName))];
        const uniqueReasons = new Set(failures.map((f) => f.error));
        // Every failure shares the same root cause (the common case: no
        // study_topics rows yet for those domains, or the retries above
        // still not being enough) -- show that reason directly instead of
        // just naming the domains and leaving the person to guess why.
        setError(
          uniqueReasons.size === 1
            ? t('ai.generate.examPartialFailureReason', {
                domains: uniqueDomains.join(', '),
                reason: failures[0].error,
              })
            : t('ai.generate.examPartialFailure', { domains: uniqueDomains.join(', ') }),
        );
      }

      setIsLoading(false);
      return questions;
    },
    [questionLocale, explanationLocale, appLocale, t],
  );

  return { generateExam, isLoading, progress, error };
}
