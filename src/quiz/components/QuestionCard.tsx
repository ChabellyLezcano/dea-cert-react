import { Fragment, useMemo, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import hljs from 'highlight.js/lib/core';
import sql from 'highlight.js/lib/languages/sql';
import python from 'highlight.js/lib/languages/python';
import yaml from 'highlight.js/lib/languages/yaml';
import bash from 'highlight.js/lib/languages/bash';
import 'highlight.js/styles/vs2015.css';
import { DOMAIN_MAP } from '../data/domains';
import { Highlight } from '../../shared/components/Highlight';
import { Button } from '../../shared/components/Button';
import { shuffleIndices } from '../../shared/utils/shuffle';
import { useLocale } from '../../shared/i18n/useLocale';
import type { Question, QuestionProgress } from '../quiz.types';

// Registered once at module load. Covers every language actually used by
// the exam bank and by AI-generated questions (PySpark reads as python,
// Databricks CLI/bash reads as bash, DAB config reads as yaml).
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('python', python);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('bash', bash);
const CODE_LANGUAGE_SUBSET = ['sql', 'python', 'yaml', 'bash'];

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'];

interface QuestionCardProps {
  question: Question;
  entry: QuestionProgress | undefined;
  searchTerm: string;
  onGrade: (question: Question, picked: number[]) => void;
  onReveal: (question: Question) => void;
  onRetry: (questionId: string) => void;
  /** Extra badge shown in the tag row, e.g. "Generada por IA". */
  badge?: React.ReactNode;
  /** Extra controls shown alongside Show answer/Retry, e.g. save/remove favorite. */
  extraActions?: React.ReactNode;
}

export function QuestionCard({
  question,
  entry,
  searchTerm,
  onGrade,
  onReveal,
  onRetry,
  badge,
  extraActions,
}: QuestionCardProps) {
  const [selected, setSelected] = useState<number[]>([]);
  const { t } = useLocale();
  const domain = DOMAIN_MAP[question.d];
  const isMulti = question.m === 1;
  const isAnswered = Boolean(entry);

  // Randomizes only the DISPLAY order of options. Every value derived from
  // this — toggleOption, optionState, entry.picked, question.a — still
  // refers to the option's ORIGINAL index, so grading logic is completely
  // unaffected; only the visual position (and A/B/C/D label) changes.
  // Memoized by question.id so the order stays put across re-renders
  // (e.g. right after grading) instead of reshuffling on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- question.id isn't read inside shuffleIndices, but it's the real trigger for reshuffling: without it, two consecutive questions with the same option count would incorrectly keep the same shuffle order.
  const displayOrder = useMemo(() => shuffleIndices(question.o.length), [question.id, question.o.length]);

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
        {question.exam > 0 && (
          <span className="rounded-full bg-ink-50 px-2.5 py-1 text-xs font-medium text-ink-500">
            {t('question.examQ', { exam: question.exam, n: question.n })}
          </span>
        )}
        {badge}
        {isMulti && (
          <span className="rounded-full bg-accent-400/30 px-2.5 py-1 text-xs font-semibold text-accent-600">
            {t('question.multiAnswer')}
          </span>
        )}
      </div>

      <div className="whitespace-pre-line break-words text-[15px] leading-relaxed text-ink-800">
        <TextWithCode text={question.q} searchTerm={searchTerm} />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {displayOrder.map((originalIndex, position) => (
          <OptionButton
            key={originalIndex}
            letter={OPTION_LETTERS[position]}
            text={question.o[originalIndex]}
            searchTerm={searchTerm}
            state={optionState(question, entry, selected, originalIndex)}
            disabled={isAnswered}
            onClick={() => toggleOption(originalIndex)}
          />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {!entry && isMulti && (
          <>
            <Button onClick={submitMultiSelect} disabled={!selected.length}>
              {t('question.checkSelection')}
            </Button>
            <span className="text-xs text-ink-400">{t('question.chooseN', { n: question.a.length })}</span>
            <Button variant="ghost" onClick={() => onReveal(question)}>
              {t('question.showAnswer')}
            </Button>
          </>
        )}
        {!entry && !isMulti && (
          <Button variant="ghost" onClick={() => onReveal(question)}>
            {t('question.showAnswer')}
          </Button>
        )}
        {entry && (
          <>
            <Verdict entry={entry} />
            <Button variant="ghost" onClick={handleRetry}>
              {t('question.retry')}
            </Button>
          </>
        )}
        {extraActions}
      </div>

      {entry && (
        <div className="mt-4 rounded-xl bg-ink-50 p-4 text-sm text-ink-600">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-400">
            {t('question.explanationLabel')}
          </span>
          <div className="break-words">
            <TextWithCode text={question.x} searchTerm={searchTerm} />
          </div>
        </div>
      )}
    </article>
  );
}

function Verdict({ entry }: { entry: QuestionProgress }) {
  const { t } = useLocale();
  if (entry.revealed) {
    return <span className="text-sm font-semibold text-ink-500">{t('question.answerRevealed')}</span>;
  }
  return entry.ok ? (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ok-600">
      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
      {t('question.correct')}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ko-600">
      <XCircle className="h-4 w-4" aria-hidden="true" />
      {t('question.incorrect')}
    </span>
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
      <span className="min-w-0 whitespace-pre-line break-words text-ink-700">
        <TextWithCode text={text} searchTerm={searchTerm} />
      </span>
    </button>
  );
}

/** Splits text on fenced code blocks (```...```), rendering fenced parts
 * as a monospace code box and everything else as normal prose (still
 * passed through Highlight for search-term matching). Text with no
 * fences renders exactly as before -- this is why none of your existing
 * bank questions change: they've never used the ``` convention, only the
 * study guide topics have. New AI-generated questions are prompted to use
 * ``` around real code/config snippets, so this only activates there. */
function splitCodeBlocks(text: string): { type: 'text' | 'code'; content: string }[] {
  const fenceRegex = /```[a-zA-Z]*\n?([\s\S]*?)```/g;
  const segments: { type: 'text' | 'code'; content: string }[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = fenceRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'code', content: match[1].replace(/\n$/, '') });
    lastIndex = fenceRegex.lastIndex;
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.slice(lastIndex) });
  }
  return segments;
}

/** Splits a plain-text (non-fenced) segment on single-backtick inline code
 * spans (`like this`) -- the convention actually used across the exam
 * bank for short snippets (`spark.sql()`, `%sql`, table/file paths, config
 * keys) that appear inline in a sentence rather than as a standalone
 * block. Deliberately excludes newlines from the match so it can't
 * accidentally swallow an unrelated stray backtick several lines later. */
function splitInlineCode(text: string): { type: 'text' | 'inline-code'; content: string }[] {
  const inlineRegex = /`([^`\n]+)`/g;
  const segments: { type: 'text' | 'inline-code'; content: string }[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = inlineRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'inline-code', content: match[1] });
    lastIndex = inlineRegex.lastIndex;
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.slice(lastIndex) });
  }
  return segments;
}

/** Renders a non-fenced text segment, styling any single-backtick inline
 * code spans as a small monospace pill and passing everything else
 * through Highlight for search-term matching. */
function TextWithInlineCode({ text, searchTerm }: { text: string; searchTerm: string }) {
  const segments = useMemo(() => splitInlineCode(text), [text]);

  if (segments.length === 1 && segments[0].type === 'text') {
    return <Highlight text={text} term={searchTerm} />;
  }

  return (
    <>
      {segments.map((segment, index) =>
        segment.type === 'inline-code' ? (
          <code
            key={index}
            className="rounded-md bg-ink-100 px-1.5 py-0.5 font-mono text-[0.85em] text-ink-700"
          >
            {segment.content}
          </code>
        ) : (
          <Fragment key={index}>
            <Highlight text={segment.content} term={searchTerm} />
          </Fragment>
        ),
      )}
    </>
  );
}

/** Renders a fenced code block with real syntax highlighting (auto-detected
 * among the languages actually used in this exam bank/AI generation:
 * SQL, PySpark/Python, YAML, CLI/bash), styled with the vs2015 theme --
 * the closest highlight.js theme to VS Code's Dark+ palette. Falls back
 * to plain escaped text if highlighting throws for any reason, so a
 * malformed snippet never breaks the whole question card. */
function CodeBlock({ content }: { content: string }) {
  const html = useMemo(() => {
    try {
      return hljs.highlightAuto(content, CODE_LANGUAGE_SUBSET).value;
    } catch {
      return content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  }, [content]);

  return (
    <pre className="my-2 overflow-x-auto rounded-lg text-xs leading-relaxed">
      {/* hljs escapes the source itself; this only ever renders its own highlighted-span markup, never raw user HTML */}
      <code
        className="hljs block rounded-lg px-3 py-2.5 font-mono"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </pre>
  );
}

function TextWithCode({ text, searchTerm }: { text: string; searchTerm: string }) {
  const segments = useMemo(() => splitCodeBlocks(text), [text]);

  // Common case, zero fences and zero inline backticks: render exactly as
  // the old plain <Highlight> call did, no wrapper overhead.
  if (segments.length === 1 && segments[0].type === 'text' && !segments[0].content.includes('`')) {
    return <Highlight text={text} term={searchTerm} />;
  }

  return (
    <>
      {segments.map((segment, index) =>
        segment.type === 'code' ? (
          <CodeBlock key={index} content={segment.content} />
        ) : (
          <TextWithInlineCode key={index} text={segment.content} searchTerm={searchTerm} />
        ),
      )}
    </>
  );
}
