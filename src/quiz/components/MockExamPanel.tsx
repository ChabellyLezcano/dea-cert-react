import { useState, useMemo } from 'react';
import { CheckCircle2, Flag, Target, XCircle } from 'lucide-react';
import { DOMAINS, DOMAIN_MAP } from '../data/domains';
import { Button } from '../../shared/components/Button';
import { CircularProgress } from '../../shared/components/CircularProgress';
import { useLocale } from '../../shared/i18n/useLocale';
import type { MockExamOptions, MockExamResult, MockExamSource } from '../utils/mockExam';

export interface MockExamSessionStats {
  answered: number;
  correct: number;
  total: number;
}

interface MockExamPanelProps {
  /** Which certification's domains to filter against */
  certId?: string;
  /** null when no mock exam is currently active. */
  active: MockExamResult | null;
  /** Live tally of answered/correct questions: this session's draft-only
   * answers while the attempt is in progress, or the final committed tally
   * once "Finish exam" has been pressed. Only meaningful while
   * `active` is set. */
  sessionStats: MockExamSessionStats | null;
  /** True once "Finish exam" has been pressed and the draft answers
   * for this attempt have been committed to your real progress. */
  finished: boolean;
  maxAvailable: number;
  onGenerate: (options: MockExamOptions) => void;
  onFinish: () => void;
  onExit: () => void;
}

const QUESTION_COUNT_PRESETS = [15, 25, 45, 60, 90];

export function MockExamPanel({
  certId,
  active,
  sessionStats,
  finished,
  maxAvailable,
  onGenerate,
  onFinish,
  onExit,
}: MockExamPanelProps) {
  const [totalQuestions, setTotalQuestions] = useState(45);
  const [source, setSource] = useState<MockExamSource>('both');
  const { t } = useLocale();

  // Filtramos los dominios asegurando que pertenecen únicamente al certId actual
  const certDomains = useMemo(() => DOMAINS.filter((d) => d.certId === certId), [certId]);

  const sourceOptions: { value: MockExamSource; label: string }[] = [
    { value: 'unanswered', label: t('mockExam.source.unanswered') },
    { value: 'answered', label: t('mockExam.source.answered') },
    { value: 'both', label: t('mockExam.source.both') },
  ];

  if (active && finished && sessionStats) {
    const passThreshold = Math.ceil(sessionStats.total * 0.71); // ~ the real exam's 32/45 bar
    const passed = sessionStats.correct >= passThreshold;
    const accuracyPercentage = sessionStats.total > 0 ? (sessionStats.correct / sessionStats.total) * 100 : 0;
    return (
      <div className="mb-5 rounded-2xl border border-ink-100 bg-surface p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <CircularProgress
              percentage={accuracyPercentage}
              colorClassName={passed ? 'text-ok-500' : 'text-ko-500'}
              label={`${sessionStats.correct}/${sessionStats.total}`}
            />
            <div>
              <p className="flex items-center gap-1.5 text-sm font-bold text-ink-800">
                <Flag className="h-4 w-4 shrink-0" aria-hidden="true" />
                {t('mockExam.finishedTitle')}{' '}
                <span className={passed ? 'text-ok-600' : 'text-ko-600'}>
                  {t('mockExam.scoreLine', { correct: sessionStats.correct, total: sessionStats.total })}
                </span>
              </p>
              <p className="mt-0.5 flex items-start gap-1.5 text-xs text-ink-500">
                {passed ? (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ok-600" aria-hidden="true" />
                ) : (
                  <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ko-600" aria-hidden="true" />
                )}
                <span>
                  {passed ? t('mockExam.passedNote') : t('mockExam.failedNote')} {t('mockExam.savedNote')}
                </span>
              </p>
            </div>
          </div>
          <Button variant="ghost" onClick={onExit}>
            {t('mockExam.exitFinished')}
          </Button>
        </div>
      </div>
    );
  }

  if (active && sessionStats) {
    return (
      <div className="mb-5 rounded-2xl border border-brand-500 bg-brand-50 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-bold text-brand-700">
              <Target className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t('mockExam.inProgress', { answered: sessionStats.answered, total: sessionStats.total })}
            </p>
            <p className="mt-0.5 text-xs text-ink-500">{t('mockExam.draftNotice')}</p>
            {active.isShortOfTarget && (
              <p className="mt-0.5 text-xs text-ink-500">{t('mockExam.shortOfTarget')}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button onClick={onFinish}>{t('mockExam.finish')}</Button>
            <Button variant="ghost" onClick={onExit}>
              {t('mockExam.exitWithoutSaving')}
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {active.breakdown
            .filter((entry) => certDomains.some((d) => d.id === entry.domain)) // <--- Filtramos aquí
            .map((entry) => {
              const domainInfo = DOMAIN_MAP[entry.domain];
              return (
                <span
                  key={entry.domain}
                  className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-ink-600"
                  title={domainInfo?.name ?? entry.domain}
                >
                  {entry.domain}: {entry.picked}
                  {entry.picked !== entry.target && (
                    <span className="text-ink-400"> {t('mockExam.targetSuffix', { n: entry.target })}</span>
                  )}
                </span>
              );
            })}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-5 rounded-2xl border border-ink-100 bg-surface p-4 shadow-sm">
      <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-ink-800">
        <Target className="h-4 w-4 shrink-0" aria-hidden="true" />
        {t('mockExam.generateTitle')}
      </h2>
      <p className="mb-4 text-xs text-ink-500">{t('mockExam.generateDescription')}</p>

      <div className="mb-4">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-400">
          {t('mockExam.questionCountLabel')}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {QUESTION_COUNT_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              aria-pressed={totalQuestions === preset}
              onClick={() => setTotalQuestions(preset)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                totalQuestions === preset ? 'bg-action text-white' : 'bg-ink-50 text-ink-500 hover:bg-ink-100'
              }`}
            >
              {preset}
            </button>
          ))}
          <input
            type="number"
            min={1}
            max={maxAvailable}
            value={totalQuestions}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (!Number.isNaN(next)) setTotalQuestions(next);
            }}
            aria-label={t('mockExam.customCountAriaLabel')}
            className="w-20 rounded-full border border-ink-200 bg-surface px-3 py-1.5 text-xs text-ink-700 focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
          />
          <span className="text-xs text-ink-400">{t('mockExam.ofAvailable', { max: maxAvailable })}</span>
        </div>
      </div>

      <div className="mb-4">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-400">
          {t('mockExam.sourceLabel')}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {sourceOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={source === option.value}
              onClick={() => setSource(option.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                source === option.value ? 'bg-action text-white' : 'bg-ink-50 text-ink-500 hover:bg-ink-100'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <Button
        onClick={() =>
          onGenerate({ totalQuestions: Math.max(1, Math.min(totalQuestions, maxAvailable)), source })
        }
        disabled={maxAvailable === 0}
      >
        {t('mockExam.generateButton')}
      </Button>
    </div>
  );
}
