import { useCallback, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Sidebar } from '@/quiz/components/Sidebar';
import { Filters } from '@/quiz/components/Filters';
import { MockExamPanel, type MockExamSessionStats } from '@/quiz/components/MockExamPanel';
import { AiPracticePanel } from '@/quiz/components/AiPracticePanel';
import { QuestionList } from '@/quiz/components/QuestionList';
import { Pagination } from '@/quiz/components/Pagination';
import { useProgress, buildGradedEntry, buildRevealedEntry } from '@/quiz/hooks/useProgress';
import { useQuestionBank } from '@/quiz/hooks/useQuestionBank';
import { useQuestionFilter, PAGE_SIZE } from '@/quiz/hooks/useQuestionFilter';
import { generateMockExam, type MockExamOptions, type MockExamResult } from '@/quiz/utils/mockExam';
import { useAuth } from '@/auth/useAuth';
import { InlineSpinner } from '@/shared/components/InlineSpinner';
import type { ProgressMap, Question } from '@/quiz/quiz.types';

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

  // --- Mock exam mode --------------------------------------------------
  // A separate, self-contained question list mixed across all exams and
  // weighted by official domain percentages, with its own pagination.
  //
  // Answers given during a mock exam are kept in LOCAL draft state
  // (mockDraftAnswers) instead of being written to your real progress
  // immediately. They're only committed (persisted to Supabase, via the
  // same gradeQuestion/revealQuestion used everywhere else) when you press
  // "Finalizar examen". If you exit without finishing, the draft is simply
  // discarded and your real progress is left exactly as it was — nothing
  // was ever written to it.
  //
  // Crucially, WHILE THE ATTEMPT IS IN PROGRESS the question list shows
  // ONLY this session's draft answers — never your real history — even for
  // questions included via the "answered"/"both" source filter. A mock
  // exam should feel like a fresh attempt: seeing an old ✓/✗ on a question
  // before you've touched it in this attempt isn't a real simulation. The
  // source filter only controls which questions get PICKED into the exam;
  // it says nothing about how they should look once picked.
  const [mockExam, setMockExam] = useState<MockExamResult | null>(null);
  const [mockExamPage, setMockExamPage] = useState(1);
  const [mockDraftAnswers, setMockDraftAnswers] = useState<ProgressMap>({});
  const [mockExamFinished, setMockExamFinished] = useState(false);
  const [mockFinalStats, setMockFinalStats] = useState<MockExamSessionStats | null>(null);

  const handleGenerateMockExam = useCallback(
    (options: MockExamOptions) => {
      setMockExam(generateMockExam(bank, progress, options));
      setMockExamPage(1);
      setMockDraftAnswers({});
      setMockExamFinished(false);
      setMockFinalStats(null);
    },
    [bank, progress],
  );

  const handleExitMockExam = useCallback(() => {
    // Discard any unsaved draft answers — real progress is untouched since
    // nothing was ever persisted for them.
    setMockExam(null);
    setMockExamPage(1);
    setMockDraftAnswers({});
    setMockExamFinished(false);
    setMockFinalStats(null);
  }, []);

  const handleFinishMockExam = useCallback(() => {
    if (!mockExam) return;
    let answered = 0;
    let correct = 0;
    mockExam.questions.forEach((question) => {
      const draft = mockDraftAnswers[question.id];
      if (!draft) return;
      answered += 1;
      if (draft.ok) correct += 1;
      if (draft.revealed) {
        revealQuestion(question);
      } else {
        gradeQuestion(question, draft.picked);
      }
    });
    // Captured now, before clearing the draft, so the "finished" summary
    // keeps showing this attempt's real tally instead of resetting to 0.
    setMockFinalStats({ answered, correct, total: mockExam.questions.length });
    setMockDraftAnswers({});
    setMockExamFinished(true);
  }, [mockExam, mockDraftAnswers, gradeQuestion, revealQuestion]);

  // What the question list actually displays:
  // - Mid-attempt: ONLY this session's draft answers (a blank slate,
  //   regardless of prior history) — see the note above.
  // - After finishing: your real progress, which by now includes what you
  //   just committed, so you can review the graded attempt before exiting.
  // - Outside mock exam mode: real progress, as always.
  const mockDisplayProgress = useMemo(() => {
    if (!mockExam) return progress;
    return mockExamFinished ? progress : mockDraftAnswers;
  }, [mockExam, mockExamFinished, progress, mockDraftAnswers]);

  const mockSessionStats: MockExamSessionStats | null = useMemo(() => {
    if (!mockExam) return null;
    if (mockExamFinished) return mockFinalStats;
    let answered = 0;
    let correct = 0;
    mockExam.questions.forEach((q) => {
      const entry = mockDraftAnswers[q.id];
      if (entry) {
        answered += 1;
        if (entry.ok) correct += 1;
      }
    });
    return { answered, correct, total: mockExam.questions.length };
  }, [mockExam, mockExamFinished, mockFinalStats, mockDraftAnswers]);

  const mockExamTotalPages = mockExam ? Math.max(1, Math.ceil(mockExam.questions.length / PAGE_SIZE)) : 1;
  const mockExamPageItems = useMemo(
    () =>
      mockExam ? mockExam.questions.slice((mockExamPage - 1) * PAGE_SIZE, mockExamPage * PAGE_SIZE) : [],
    [mockExam, mockExamPage],
  );

  const handleGrade = useCallback(
    (question: Question, picked: number[]) => {
      if (mockExam && !mockExamFinished) {
        setMockDraftAnswers((prev) => ({ ...prev, [question.id]: buildGradedEntry(question, picked) }));
        return;
      }
      registerAnswer(question.id);
      gradeQuestion(question, picked);
    },
    [mockExam, mockExamFinished, registerAnswer, gradeQuestion],
  );

  const handleReveal = useCallback(
    (question: Question) => {
      if (mockExam && !mockExamFinished) {
        setMockDraftAnswers((prev) => ({ ...prev, [question.id]: buildRevealedEntry(question) }));
        return;
      }
      registerAnswer(question.id);
      revealQuestion(question);
    },
    [mockExam, mockExamFinished, registerAnswer, revealQuestion],
  );

  const handleRetry = useCallback(
    (questionId: string) => {
      if (mockExam && !mockExamFinished) {
        setMockDraftAnswers((prev) => {
          const next = { ...prev };
          delete next[questionId];
          return next;
        });
        return;
      }
      retryQuestion(questionId);
    },
    [mockExam, mockExamFinished, retryQuestion],
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

        <MockExamPanel
          active={mockExam}
          sessionStats={mockSessionStats}
          finished={mockExamFinished}
          maxAvailable={bank.length}
          onGenerate={handleGenerateMockExam}
          onFinish={handleFinishMockExam}
          onExit={handleExitMockExam}
        />

        <div className="mb-5">
          <AiPracticePanel certId={certId ?? ''} userId={user?.id ?? null} />
        </div>

        {mockExam ? (
          <>
            <QuestionList
              questions={mockExamPageItems}
              progress={mockDisplayProgress}
              searchTerm=""
              onGrade={handleGrade}
              onReveal={handleReveal}
              onRetry={handleRetry}
            />
            <Pagination page={mockExamPage} totalPages={mockExamTotalPages} onPageChange={setMockExamPage} />
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
