import { useCallback, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Sidebar } from '@/quiz/components/Sidebar';
import { Filters } from '@/quiz/components/Filters';
import { QuestionList } from '@/quiz/components/QuestionList';
import { Pagination } from '@/quiz/components/Pagination';
import { useProgress } from '@/quiz/hooks/useProgress';
import { useQuestionBank } from '@/quiz/hooks/useQuestionBank';
import { useQuestionFilter } from '@/quiz/hooks/useQuestionFilter';
import { useAuth } from '@/auth/useAuth';
import { InlineSpinner } from '@/shared/components/InlineSpinner';
import type { Question } from '@/quiz/quiz.types';

export function QuizPage() {
  const { certId } = useParams<{ certId: string }>();
  const { user } = useAuth();
  const {
    progress,
    isLoading: isProgressLoading,
    syncError,
    gradeQuestion,
    revealQuestion,
    retryQuestion,
    resetAll,
  } = useProgress(user?.id ?? null);
  const { bank: fetchedBank, isLoading: isBankLoading, error: bankError } = useQuestionBank(certId);

  // Local copy so shuffling reorders the on-screen list without mutating
  // the data returned by Supabase. Re-synced whenever a fresh fetch lands,
  // using React's "adjust state while rendering" pattern instead of an
  // effect, since this only needs to run when fetchedBank's identity
  // changes (not on every render).
  const [previousFetchedBank, setPreviousFetchedBank] = useState(fetchedBank);
  const [bank, setBank] = useState<Question[]>(fetchedBank);
  if (fetchedBank !== previousFetchedBank) {
    setPreviousFetchedBank(fetchedBank);
    setBank(fetchedBank);
  }

  const examNumbers = useMemo(() => [...new Set(bank.map((q) => q.exam))].sort((a, b) => a - b), [bank]);

  const {
    filters,
    setDomain,
    setExam,
    setStatus,
    setSearch,
    page,
    setPage,
    totalPages,
    pageItems,
    totalFiltered,
    totalBank,
    answeredCount,
    correctCount,
    registerAnswer,
  } = useQuestionFilter(bank, progress);

  const handleGrade = useCallback(
    (question: Question, picked: number[]) => {
      registerAnswer(question.id);
      gradeQuestion(question, picked);
    },
    [registerAnswer, gradeQuestion],
  );

  const handleReveal = useCallback(
    (question: Question) => {
      registerAnswer(question.id);
      revealQuestion(question);
    },
    [registerAnswer, revealQuestion],
  );

  const handleRetry = useCallback(
    (questionId: string) => {
      retryQuestion(questionId);
    },
    [retryQuestion],
  );

  const handleShuffle = useCallback(() => {
    setBank((prev: Question[]) => {
      const next = [...prev];
      for (let i = next.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      return next;
    });
    setPage(1);
  }, [setPage]);

  const handleReset = useCallback(() => {
    if (window.confirm('Delete all saved progress (correct and wrong answers)?')) {
      resetAll();
    }
  }, [resetAll]);

  const pendingCount = useMemo(() => totalFiltered - answeredCount, [totalFiltered, answeredCount]);

  if (isBankLoading || isProgressLoading) {
    return <InlineSpinner label="Loading questions from the database..." />;
  }

  if (bankError) {
    return (
      <div className="rounded-2xl border border-ko-100 bg-surface p-6 text-sm text-ko-600" role="alert">
        Could not load the question bank: {bankError}. Make sure the <code>questions</code> table has been
        created and seeded (see the README).
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <Sidebar
        bank={bank}
        progress={progress}
        activeDomain={filters.domain}
        onSelectDomain={setDomain}
        onShuffle={handleShuffle}
        onResetProgress={handleReset}
      />

      <div className="min-w-0 flex-1">
        {syncError && (
          <div className="mb-4 rounded-xl bg-ko-100 px-4 py-3 text-sm text-ko-600" role="alert">
            Could not sync progress with the server: {syncError}
          </div>
        )}

        <div className="mb-5 rounded-2xl border border-ink-100 bg-surface p-4 shadow-sm">
          <Filters
            search={filters.search}
            exam={filters.exam}
            status={filters.status}
            examNumbers={examNumbers}
            onSearchChange={setSearch}
            onExamChange={setExam}
            onStatusChange={setStatus}
          />
        </div>

        <div className="mb-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-500">
          <span>
            <b className="text-ink-800">{totalFiltered}</b> questions in this filter (of{' '}
            <b className="text-ink-800">{totalBank}</b> total)
          </span>
          <span>
            <b className="text-ok-600">{correctCount}</b> correct
          </span>
          <span className="text-ko-600">{answeredCount - correctCount} wrong</span>
          <span>{pendingCount} pending</span>
        </div>

        <QuestionList
          questions={pageItems}
          progress={progress}
          searchTerm={filters.search}
          onGrade={handleGrade}
          onReveal={handleReveal}
          onRetry={handleRetry}
        />

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
