import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/shared/components/Button';
import { QuestionCard } from '@/quiz/components/QuestionCard';
import { buildGradedEntry, buildRevealedEntry } from '@/quiz/hooks/useProgress';
import { useFavoriteAiQuestions } from '@/quiz/hooks/useFavoriteAiQuestions';
import { useAuth } from '@/auth/useAuth';
import { toDisplayQuestion, AiBadge } from '@/quiz/ai/aiDisplay';
import type { ProgressMap, Question } from '@/quiz/quiz.types';

export function AiFavoritesPage() {
  const { certId } = useParams<{ certId: string }>();
  const { user } = useAuth();
  const { favorites, isLoading, remove } = useFavoriteAiQuestions(certId, user?.id ?? null);

  const [draftAnswers, setDraftAnswers] = useState<ProgressMap>({});

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
      <div className="flex flex-col gap-4">
        {isLoading && <p className="text-sm text-ink-500">Cargando favoritas...</p>}
        {!isLoading && favorites.length === 0 && (
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
            badge={<AiBadge />}
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
    </div>
  );
}
