import type { AiGeneratedQuestion } from '@/quiz/ai/aiQuestions.types';
import type { Question } from '@/quiz/quiz.types';

/** Adapts an AI-generated question to the shape QuestionCard expects.
 * exam: 0 signals "not a bank question" to QuestionCard. */
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
  };
}

export function AiBadge() {
  return (
    <span className="rounded-full bg-accent-400/30 px-2.5 py-1 text-xs font-semibold text-accent-600">
      Generada por IA
    </span>
  );
}
