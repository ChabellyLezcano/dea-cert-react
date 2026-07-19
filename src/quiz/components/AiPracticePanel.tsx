import { useMemo, useState } from 'react';
import { Button } from '@/shared/components/Button';
import { QuestionCard } from '@/quiz/components/QuestionCard';
import { DOMAINS } from '@/quiz/data/domains';
import { buildGradedEntry, buildRevealedEntry } from '@/quiz/hooks/useProgress';
import { useGenerateAiQuestions } from '@/quiz/hooks/useGenerateAiQuestions';
import { useFavoriteAiQuestions } from '@/quiz/hooks/useFavoriteAiQuestions';
import type { AiGeneratedQuestion } from '@/quiz/ai/aiQuestions.types';
import type { DomainId, ProgressMap, Question } from '@/quiz/quiz.types';

const COUNT_PRESETS = [3, 5, 10];

function toDisplayQuestion(aiQ: AiGeneratedQuestion): Question {
  return {
    n: 0,
    exam: 0, // signals "not a bank question" to QuestionCard
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

interface AiPracticePanelProps {
  certId: string;
  userId: string | null;
}

export function AiPracticePanel({ certId, userId }: AiPracticePanelProps) {
  // DOMAINS aggregates every certification's domains together (see
  // src/quiz/data/domains.ts) -- must filter to this certId before using
  // it, or the default selection can silently be a domain that belongs to
  // a different certification (empty study_topics for this cert -> 422
  // from the edge function).
  const certDomains = useMemo(() => DOMAINS.filter((d) => d.certId === certId), [certId]);

  const [view, setView] = useState<'generate' | 'favorites'>('generate');
  const [domain, setDomain] = useState<DomainId>(certDomains[0]?.id ?? '');
  const [count, setCount] = useState(5);
  const [generated, setGenerated] = useState<AiGeneratedQuestion[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [draftAnswers, setDraftAnswers] = useState<ProgressMap>({});

  const { generate, isLoading, error } = useGenerateAiQuestions();
  const { favorites, isLoading: favoritesLoading, save, remove } = useFavoriteAiQuestions(certId, userId);

  const handleGenerate = async () => {
    const questions = await generate({ certId, domain, count });
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

  const aiBadge = (
    <span className="rounded-full bg-accent-400/30 px-2.5 py-1 text-xs font-semibold text-accent-600">
      Generada por IA
    </span>
  );

  return (
    <div className="mb-5 rounded-2xl border border-ink-100 bg-surface p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setView('generate')}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            view === 'generate' ? 'bg-action text-white' : 'bg-ink-50 text-ink-500 hover:bg-ink-100'
          }`}
        >
          Generar con IA
        </button>
        <button
          type="button"
          onClick={() => setView('favorites')}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            view === 'favorites' ? 'bg-action text-white' : 'bg-ink-50 text-ink-500 hover:bg-ink-100'
          }`}
        >
          Favoritas{favorites.length > 0 ? ` (${favorites.length})` : ''}
        </button>
      </div>

      {view === 'generate' && (
        <>
          <p className="mb-4 text-xs text-ink-500">
            Se generan a partir de tus propias notas de estudio de este dominio. No se guardan solas — usa el
            botón de guardar para conservar las que quieras en tu biblioteca de favoritas.
          </p>

          <div className="mb-4">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-400">
              Dominio
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
                  badge={aiBadge}
                  extraActions={
                    <Button variant="ghost" onClick={() => handleSave(aiQ)} disabled={savedIds.has(aiQ.id)}>
                      {savedIds.has(aiQ.id) ? 'Guardada ✓' : 'Guardar en favoritas'}
                    </Button>
                  }
                />
              ))}
            </div>
          )}
        </>
      )}

      {view === 'favorites' && (
        <div className="flex flex-col gap-4">
          {favoritesLoading && <p className="text-sm text-ink-500">Cargando favoritas...</p>}
          {!favoritesLoading && favorites.length === 0 && (
            <div className="rounded-2xl border border-dashed border-ink-200 bg-surface p-10 text-center text-sm text-ink-500">
              Todavía no has guardado ninguna pregunta generada por IA.
            </div>
          )}
          {favorites.map((aiQ) => (
            <QuestionCard
              key={aiQ.id}
              question={toDisplayQuestion(aiQ)}
              entry={draftAnswers[aiQ.id]}
              searchTerm=""
              onGrade={handleGrade}
              onReveal={handleReveal}
              onRetry={handleRetry}
              badge={aiBadge}
              extraActions={
                <Button
                  variant="danger"
                  onClick={() => {
                    if (window.confirm('¿Quitar esta pregunta de tus favoritas?')) remove(aiQ.id);
                  }}
                >
                  Quitar
                </Button>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
