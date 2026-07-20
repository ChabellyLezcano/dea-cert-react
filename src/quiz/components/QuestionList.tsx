import { QuestionCard } from './QuestionCard';
import type { ProgressMap, Question } from '../quiz.types';

interface QuestionListProps {
  questions: Question[];
  progress: ProgressMap;
  searchTerm: string;
  onGrade: (question: Question, picked: number[]) => void;
  onReveal: (question: Question) => void;
  onRetry: (questionId: string) => void;
}

export function QuestionList({
  questions,
  progress,
  searchTerm,
  onGrade,
  onReveal,
  onRetry,
}: QuestionListProps) {
  if (!questions.length) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-200 bg-surface p-10 text-center text-sm text-ink-500">
        No questions match this filter. Try clearing the search or changing the section.
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4 animate-stagger">
      {questions.map((question) => (
        <QuestionCard
          key={question.id}
          question={question}
          entry={progress[question.id]}
          searchTerm={searchTerm}
          onGrade={onGrade}
          onReveal={onReveal}
          onRetry={onRetry}
        />
      ))}
    </div>
  );
}
