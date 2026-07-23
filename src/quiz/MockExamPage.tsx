import { useCallback, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MockExamPanel, type MockExamSessionStats } from '@/quiz/components/MockExamPanel';
import { QuestionList } from '@/quiz/components/QuestionList';
import { Pagination } from '@/quiz/components/Pagination';
import { useProgress, buildGradedEntry, buildRevealedEntry } from '@/quiz/hooks/useProgress';
import { useQuestionBank } from '@/quiz/hooks/useQuestionBank';
import { PAGE_SIZE } from '@/quiz/hooks/useQuestionFilter';
import { generateMockExam, type MockExamOptions, type MockExamResult } from '@/quiz/utils/mockExam';
import { useAuth } from '@/auth/useAuth';
import { InlineSpinner } from '@/shared/components/InlineSpinner';
import { useLocale } from '@/shared/i18n/useLocale';
import type { ProgressMap, Question } from '@/quiz/quiz.types';

export function MockExamPage() {
  const { certId } = useParams<{ certId: string }>();
  const { user } = useAuth();
  const { t } = useLocale();
  const {
    progress,
    isLoading: isProgressLoading,
    syncError,
    gradeQuestion,
    revealQuestion,
  } = useProgress(user?.id ?? null);
  const { bank, isLoading: isBankLoading, error: bankError } = useQuestionBank(certId);

  // A self-contained question list mixed across all exams and weighted by
  // official domain percentages, with its own pagination.
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

  const handleGrade = useCallback((question: Question, picked: number[]) => {
    setMockDraftAnswers((prev) => ({ ...prev, [question.id]: buildGradedEntry(question, picked) }));
  }, []);

  const handleReveal = useCallback((question: Question) => {
    setMockDraftAnswers((prev) => ({ ...prev, [question.id]: buildRevealedEntry(question) }));
  }, []);

  const handleRetry = useCallback((questionId: string) => {
    setMockDraftAnswers((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  }, []);

  if (isBankLoading || isProgressLoading) {
    return <InlineSpinner label={t('loading.questions')} />;
  }

  if (bankError) {
    return (
      <div className="rounded-2xl border border-ko-100 bg-surface p-6 text-sm text-ko-600" role="alert">
        {t('quiz.bankError', { error: bankError })}
      </div>
    );
  }

  return (
    <div>
      {syncError && (
        <div className="mb-4 rounded-xl bg-ko-100 px-4 py-3 text-sm text-ko-600" role="alert">
          {t('quiz.syncError', { error: syncError })}
        </div>
      )}

      <MockExamPanel
        certId={certId}
        active={mockExam}
        sessionStats={mockSessionStats}
        finished={mockExamFinished}
        maxAvailable={bank.length}
        onGenerate={handleGenerateMockExam}
        onFinish={handleFinishMockExam}
        onExit={handleExitMockExam}
      />

      {mockExam && (
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
      )}
    </div>
  );
}
