import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { Button } from '@/shared/components/Button';
import { QuestionCard } from '@/quiz/components/QuestionCard';
import { DOMAINS } from '@/quiz/data/domains';
import { buildGradedEntry, buildRevealedEntry } from '@/quiz/hooks/useProgress';
import { useGenerateAiQuestions } from '@/quiz/hooks/useGenerateAiQuestions';
import { useGenerateAiExam } from '@/quiz/hooks/useGenerateAiExam';
import { useFavoriteAiQuestions } from '@/quiz/hooks/useFavoriteAiQuestions';
import { useAuth } from '@/auth/useAuth';
import { toDisplayQuestion, AiBadge } from '@/quiz/ai/aiDisplay';
import { useLocale } from '@/shared/i18n/useLocale';
import { AI_EXAM_QUESTION_COUNT } from '@/quiz/utils/aiExamPlan';
import type { AiGeneratedQuestion } from '@/quiz/ai/aiQuestions.types';
import type { DomainId, ProgressMap, Question } from '@/quiz/quiz.types';

const COUNT_PRESETS = [3, 5, 10];
type GenerateMode = 'topic' | 'exam';

export function AiGeneratePage() {
  const { certId } = useParams<{ certId: string }>();
  const { user } = useAuth();
  const { t } = useLocale();

  // DOMAINS aggregates every certification's domains together (see
  // src/quiz/data/domains.ts) -- must filter to this certId before using
  // it, or the default selection can silently be a domain that belongs to
  // a different certification (empty study_topics for this cert -> 422
  // from the edge function).
  const certDomains = useMemo(() => DOMAINS.filter((d) => d.certId === certId), [certId]);

  const [mode, setMode] = useState<GenerateMode>('topic');
  const [domain, setDomain] = useState<DomainId>(certDomains[0]?.id ?? '');
  const [count, setCount] = useState(5);
  const [generated, setGenerated] = useState<AiGeneratedQuestion[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [draftAnswers, setDraftAnswers] = useState<ProgressMap>({});

  const { generate, isLoading: isGeneratingTopic, error: topicError } = useGenerateAiQuestions();
  const {
    generateExam,
    isLoading: isGeneratingExam,
    progress: examProgress,
    error: examError,
  } = useGenerateAiExam();
  const { save } = useFavoriteAiQuestions(certId, user?.id ?? null);

  const error = mode === 'topic' ? topicError : examError;

  const handleGenerateTopic = async () => {
    const questions = await generate({ certId: certId ?? '', domain, count });
    setGenerated(questions);
    setSavedIds(new Set());
    setDraftAnswers({});
  };

  const handleGenerateExam = async () => {
    const questions = await generateExam({
      certId: certId ?? '',
      domains: certDomains,
      totalCount: AI_EXAM_QUESTION_COUNT,
    });
    setGenerated(questions);
    setSavedIds(new Set());
    setDraftAnswers({});
  };

  // Guarded so this is safe to call both from the explicit "Save" button
  // and automatically from handleGrade below -- calling it twice for the
  // same question (e.g. auto-save on a wrong answer, then the person also
  // clicks Save) never inserts a duplicate favorite row.
  const handleSave = async (aiQ: AiGeneratedQuestion) => {
    if (savedIds.has(aiQ.id)) return;
    await save(aiQ);
    setSavedIds((prev) => new Set(prev).add(aiQ.id));
  };

  const handleGrade = (question: Question, picked: number[]) => {
    const entry = buildGradedEntry(question, picked);
    setDraftAnswers((prev) => ({ ...prev, [question.id]: entry }));
    if (!entry.ok) {
      const aiQ = generated.find((g) => g.id === question.id);
      if (aiQ) void handleSave(aiQ);
    }
  };

  const handleReveal = (question: Question) => {
    setDraftAnswers((prev) => ({ ...prev, [question.id]: buildRevealedEntry(question) }));
  };

  const handleRetry = (questionId: string) => {
    setDraftAnswers((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  };

  return (
    <div className="rounded-2xl border border-ink-100 bg-surface p-4 shadow-sm">
      <p className="mb-1 text-xs text-ink-500">
        {mode === 'topic'
          ? t('ai.generate.intro')
          : t('ai.generate.examIntro', { count: AI_EXAM_QUESTION_COUNT })}
      </p>
      <p className="mb-4 text-xs font-medium text-ink-400">{t('ai.generate.autoSavedNotice')}</p>

      <div className="mb-4">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-400">
          {t('ai.generate.modeLabel')}
        </span>
        <div className="flex gap-1.5">
          <button
            type="button"
            aria-pressed={mode === 'topic'}
            onClick={() => setMode('topic')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              mode === 'topic' ? 'bg-action text-white' : 'bg-ink-50 text-ink-500 hover:bg-ink-100'
            }`}
          >
            {t('ai.generate.modeTopic')}
          </button>
          <button
            type="button"
            aria-pressed={mode === 'exam'}
            onClick={() => setMode('exam')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              mode === 'exam' ? 'bg-action text-white' : 'bg-ink-50 text-ink-500 hover:bg-ink-100'
            }`}
          >
            {t('ai.generate.modeExam')}
          </button>
        </div>
      </div>

      {mode === 'topic' && (
        <>
          <div className="mb-4">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-400">
              {t('ai.generate.domainLabel')}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {certDomains.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  aria-pressed={domain === d.id}
                  onClick={() => setDomain(d.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    domain === d.id ? 'bg-action text-white' : 'bg-ink-50 text-ink-500 hover:bg-ink-100'
                  }`}
                >
                  {d.id}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-400">
              {t('ai.generate.countLabel')}
            </span>
            <div className="flex gap-1.5">
              {COUNT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  aria-pressed={count === preset}
                  onClick={() => setCount(preset)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    count === preset ? 'bg-action text-white' : 'bg-ink-50 text-ink-500 hover:bg-ink-100'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleGenerateTopic} isLoading={isGeneratingTopic} disabled={!domain}>
            {isGeneratingTopic ? t('ai.generate.generating') : t('ai.generate.button')}
          </Button>
        </>
      )}

      {mode === 'exam' && (
        <>
          <Button
            onClick={handleGenerateExam}
            isLoading={isGeneratingExam}
            disabled={certDomains.length === 0}
          >
            {isGeneratingExam
              ? t('ai.generate.generating')
              : t('ai.generate.examButton', { count: AI_EXAM_QUESTION_COUNT })}
          </Button>
          {isGeneratingExam && examProgress && (
            <p className="mt-3 text-xs text-ink-500">
              {examProgress.retryingInSeconds !== undefined
                ? t('ai.generate.examRateLimited', { seconds: examProgress.retryingInSeconds })
                : t('ai.generate.examProgress', {
                    completed: examProgress.completedBatches,
                    total: examProgress.totalBatches,
                  })}
            </p>
          )}
        </>
      )}

      {error && <p className="mt-3 text-xs text-ko-600">{error}</p>}

      {generated.length > 0 && (
        <div className="mt-4 flex flex-col gap-4">
          {generated.map((aiQ) => (
            <QuestionCard
              key={aiQ.id}
              question={toDisplayQuestion(aiQ)}
              entry={draftAnswers[aiQ.id]}
              searchTerm=""
              onGrade={handleGrade}
              onReveal={handleReveal}
              onRetry={handleRetry}
              badge={<AiBadge />}
              extraActions={
                <Button variant="ghost" onClick={() => handleSave(aiQ)} disabled={savedIds.has(aiQ.id)}>
                  {savedIds.has(aiQ.id) ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('ai.generate.saved')}
                    </span>
                  ) : (
                    t('ai.generate.save')
                  )}
                </Button>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
