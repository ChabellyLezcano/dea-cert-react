import { useState } from 'react';
import { DOMAIN_MAP } from '../data/domains';
import { Highlight } from '../../shared/components/Highlight';
import { Button } from '../../shared/components/Button';
import type { Question, QuestionProgress } from '../quiz.types';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'];

interface QuestionCardProps {
  question: Question;
  entry: QuestionProgress | undefined;
  searchTerm: string;
  onGrade: (question: Question, picked: number[]) => void;
  onReveal: (question: Question) => void;
  onRetry: (questionId: string) => void;
}

export function QuestionCard({ question, entry, searchTerm, onGrade, onReveal, onRetry }: QuestionCardProps) {
  const [selected, setSelected] = useState<number[]>([]);
  const domain = DOMAIN_MAP[question.d];
  const isMulti = question.m === 1;
  const isAnswered = Boolean(entry);

  function toggleOption(index: number) {
    if (isAnswered) return;
    if (isMulti) {
      setSelected((prev) => (prev.includes(index) ? prev.filter((v) => v !== index) : [...prev, index]));
    } else {
      onGrade(question, [index]);
    }
  }

  function submitMultiSelect() {
    if (!selected.length) return;
    onGrade(question, selected);
  }

  function handleRetry() {
    setSelected([]);
    onRetry(question.id);
  }

  const cardTone = !entry
    ? ''
    : entry.revealed
      ? 'border-ink-200'
      : entry.ok
        ? 'border-ok-500/50'
        : 'border-ko-500/50';

  return (
    <article
      className={`rounded-2xl border bg-surface p-5 shadow-sm transition ${cardTone || 'border-ink-100'}`}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="max-w-full break-words rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
          S{domain.order} · {domain.name}
        </span>
        <span className="rounded-full bg-ink-50 px-2.5 py-1 text-xs font-medium text-ink-500">
          Exam {question.exam} · Q{question.n}
        </span>
        {isMulti && (
          <span className="rounded-full bg-accent-400/30 px-2.5 py-1 text-xs font-semibold text-accent-600">
            multi-answer
          </span>
        )}
      </div>

      <p className="whitespace-pre-line break-words text-[15px] leading-relaxed text-ink-800">
        <Highlight text={question.q} term={searchTerm} />
      </p>

      <div className="mt-4 flex flex-col gap-2">
        {question.o.map((option, index) => (
          <OptionButton
            key={index}
            letter={OPTION_LETTERS[index]}
            text={option}
            searchTerm={searchTerm}
            state={optionState(question, entry, selected, index)}
            disabled={isAnswered}
            onClick={() => toggleOption(index)}
          />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {!entry && isMulti && (
          <>
            <Button onClick={submitMultiSelect} disabled={!selected.length}>
              Check selection
            </Button>
            <span className="text-xs text-ink-400">choose {question.a.length}</span>
            <Button variant="ghost" onClick={() => onReveal(question)}>
              Show answer
            </Button>
          </>
        )}
        {!entry && !isMulti && (
          <Button variant="ghost" onClick={() => onReveal(question)}>
            Show answer
          </Button>
        )}
        {entry && (
          <>
            <Verdict entry={entry} />
            <Button variant="ghost" onClick={handleRetry}>
              Retry
            </Button>
          </>
        )}
      </div>

      {entry && (
        <div className="mt-4 rounded-xl bg-ink-50 p-4 text-sm text-ink-600">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-400">
            Explanation
          </span>
          <p className="break-words">
            <Highlight text={question.x} term={searchTerm} />
          </p>
        </div>
      )}
    </article>
  );
}

function Verdict({ entry }: { entry: QuestionProgress }) {
  if (entry.revealed) {
    return <span className="text-sm font-semibold text-ink-500">Answer revealed</span>;
  }
  return entry.ok ? (
    <span className="text-sm font-semibold text-ok-600">✓ Correct</span>
  ) : (
    <span className="text-sm font-semibold text-ko-600">✗ Incorrect</span>
  );
}

type OptionVisualState = 'default' | 'selected' | 'correct' | 'incorrect';

function optionState(
  question: Question,
  entry: QuestionProgress | undefined,
  selected: number[],
  index: number,
): OptionVisualState {
  if (entry) {
    if (question.a.includes(index)) return 'correct';
    if (entry.picked.includes(index)) return 'incorrect';
    return 'default';
  }
  return selected.includes(index) ? 'selected' : 'default';
}

const OPTION_CLASSES: Record<OptionVisualState, string> = {
  default: 'border-ink-200 hover:border-brand-300 hover:bg-brand-50/40',
  selected: 'border-brand-500 bg-brand-50',
  correct: 'border-ok-500 bg-ok-100',
  incorrect: 'border-ko-500 bg-ko-100',
};

function OptionButton({
  letter,
  text,
  searchTerm,
  state,
  disabled,
  onClick,
}: {
  letter: string;
  text: string;
  searchTerm: string;
  state: OptionVisualState;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex items-start gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm transition disabled:cursor-default ${OPTION_CLASSES[state]}`}
    >
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-[11px] font-bold">
        {letter}
      </span>
      <span className="min-w-0 break-words text-ink-700">
        <Highlight text={text} term={searchTerm} />
      </span>
    </button>
  );
}
