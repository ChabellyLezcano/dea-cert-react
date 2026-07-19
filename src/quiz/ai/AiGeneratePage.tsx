import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { Button } from '@/shared/components/Button';
import { QuestionCard } from '@/quiz/components/QuestionCard';
import { DOMAINS } from '@/quiz/data/domains';
import { buildGradedEntry, buildRevealedEntry } from '@/quiz/hooks/useProgress';
import { useGenerateAiQuestions } from '@/quiz/hooks/useGenerateAiQuestions';
import { useFavoriteAiQuestions } from '@/quiz/hooks/useFavoriteAiQuestions';
import { useAuth } from '@/auth/useAuth';
import { toDisplayQuestion, AiBadge } from '@/quiz/ai/aiDisplay';
import type { AiGeneratedQuestion } from '@/quiz/ai/aiQuestions.types';
import type { DomainId, ProgressMap, Question } from '@/quiz/quiz.types';

const COUNT_PRESETS = [3, 5, 10];

export function AiGeneratePage() {
  const { certId } = useParams<{ certId: string }>();
  const { user } = useAuth();

  // DOMAINS aggregates every certification's domains together (see
  // src/quiz/data/domains.ts) -- must filter to this certId before using
  // it, or the default selection can silently be a domain that belongs to
  // a different certification (empty study_topics for this cert -> 422
  // from the edge function).
  const certDomains = useMemo(() => DOMAINS.filter((d) => d.certId === certId), [certId]);

  const [domain, setDomain] = useState<DomainId>(certDomains[0]?.id ?? '');
  const [count, setCount] = useState(5);
  const [generated, setGenerated] = useState<AiGeneratedQuestion[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [draftAnswers, setDraftAnswers] = useState<ProgressMap>({});

  const { generate, isLoading, error } = useGenerateAiQuestions();
  const { save } = useFavoriteAiQuestions(certId, user?.id ?? null);

  const handleGenerate = async () => {
    const questions = await generate({ certId: certId ?? '', domain, count });
    setGenerated(questions);
    setSavedIds(new Set());
    setDraftAnswers({});
  };

  const handleSave = async (aiQ: AiGeneratedQuestion) => {
    await save(aiQ);
    setSavedIds((prev) => new Set(prev).add(aiQ.id));
  };

  const handleGrade = (question: Question, picked: number[]) => {
    setDraftAnswers((prev) => ({ ...prev, [question.id]: buildGradedEntry(question, picked) }));
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
      <p className="mb-4 text-xs text-ink-500">
        Se generan a partir de tus propias notas de estudio de este dominio. No se guardan solas — usa el
        botón de guardar para conservar las que quieras en tu biblioteca de favoritas.
      </p>

      <div className="mb-4">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-400">Dominio</span>
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
          Número de preguntas
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

      <Button onClick={handleGenerate} isLoading={isLoading} disabled={!domain}>
        {isLoading ? 'Generando...' : 'Generar preguntas'}
      </Button>

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
                      Guardada
                    </span>
                  ) : (
                    'Guardar en favoritas'
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
