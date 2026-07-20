import type { AiGeneratedQuestion } from '@/quiz/ai/aiQuestions.types';
import type { Question } from '@/quiz/quiz.types';
import { useLocale } from '@/shared/i18n/useLocale';

/** Adapts an AI-generated question to the shape QuestionCard expects.
 * exam: 0 signals "not a bank question" to QuestionCard. AiGeneratedQuestion
 * only carries whichever locale it was actually generated/resolved in, so
 * qByLocale/oByLocale/xByLocale here only have that one entry -- accurate
 * reflection of what's actually available, not a claim of full bilingual
 * coverage. */
export function toDisplayQuestion(aiQ: AiGeneratedQuestion): Question {
  return {
    n: 0,
    exam: 0,
    d: aiQ.domain,
    m: aiQ.m,
    q: aiQ.q,
    o: aiQ.o,
    a: aiQ.a,
    x: aiQ.x,
    certId: aiQ.certId,
    id: aiQ.id,
    qByLocale: { [aiQ.questionLocale]: aiQ.q },
    oByLocale: { [aiQ.questionLocale]: aiQ.o },
    xByLocale: { [aiQ.explanationLocale]: aiQ.x },
  };
}

export function AiBadge() {
  const { t } = useLocale();
  return (
    <span className="rounded-full bg-accent-400/30 px-2.5 py-1 text-xs font-semibold text-accent-600">
      {t('ai.badge')}
    </span>
  );
}
