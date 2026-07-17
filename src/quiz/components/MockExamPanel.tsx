import { useState } from 'react';
import { DOMAIN_MAP } from '../data/domains';
import { Button } from '../../shared/components/Button';
import type { MockExamOptions, MockExamResult, MockExamSource } from '../utils/mockExam';

export interface MockExamSessionStats {
  answered: number;
  correct: number;
  total: number;
}

interface MockExamPanelProps {
  /** null when no mock exam is currently active. */
  active: MockExamResult | null;
  /** Live tally of answered/correct questions: this session's draft-only
   * answers while the attempt is in progress, or the final committed tally
   * once "Finalizar examen" has been pressed. Only meaningful while
   * `active` is set. */
  sessionStats: MockExamSessionStats | null;
  /** True once "Finalizar examen" has been pressed and the draft answers
   * for this attempt have been committed to your real progress. */
  finished: boolean;
  maxAvailable: number;
  onGenerate: (options: MockExamOptions) => void;
  onFinish: () => void;
  onExit: () => void;
}

const QUESTION_COUNT_PRESETS = [15, 25, 45, 60, 90];

const SOURCE_OPTIONS: { value: MockExamSource; label: string }[] = [
  { value: 'unanswered', label: 'Sin responder' },
  { value: 'answered', label: 'Ya respondidas' },
  { value: 'both', label: 'Ambas' },
];

export function MockExamPanel({
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

  if (active && finished && sessionStats) {
    const passThreshold = Math.ceil(sessionStats.total * 0.71); // ~ the real exam's 32/45 bar
    const passed = sessionStats.correct >= passThreshold;
    return (
      <div className="mb-5 rounded-2xl border border-ink-100 bg-surface p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-ink-800">
              🏁 Examen finalizado ·{' '}
              <span className={passed ? 'text-ok-600' : 'text-ko-600'}>
                {sessionStats.correct}/{sessionStats.total} correctas
              </span>
            </p>
            <p className="mt-0.5 text-xs text-ink-500">
              {passed
                ? '✓ Por encima del umbral aproximado de aprobado (~71%).'
                : '✗ Por debajo del umbral aproximado de aprobado (~71%). '}
              Tus respuestas ya se han guardado en tu progreso real.
            </p>
          </div>
          <Button variant="ghost" onClick={onExit}>
            Salir del simulacro
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
            <p className="text-sm font-bold text-brand-700">
              🎯 Examen simulado en curso · {sessionStats.answered}/{sessionStats.total} respondidas
            </p>
            <p className="mt-0.5 text-xs text-ink-500">
              Tus respuestas de este intento no se guardan hasta que pulses "Finalizar examen" — si sales
              antes, no se modifica tu progreso real. Aunque incluyas preguntas ya respondidas antes,
              aparecerán en blanco: es un intento nuevo.
            </p>
            {active.isShortOfTarget && (
              <p className="mt-0.5 text-xs text-ink-500">
                Algún dominio no tenía suficientes preguntas elegibles con este filtro; se completó con
                preguntas de otros dominios.
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button onClick={onFinish}>Finalizar examen</Button>
            <Button variant="ghost" onClick={onExit}>
              Salir sin guardar
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {active.breakdown.map((entry) => (
            <span
              key={entry.domain}
              className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-ink-600"
              title={DOMAIN_MAP[entry.domain].name}
            >
              {entry.domain}: {entry.picked}
              {entry.picked !== entry.target && (
                <span className="text-ink-400"> (objetivo {entry.target})</span>
              )}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-5 rounded-2xl border border-ink-100 bg-surface p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-bold text-ink-800">🎯 Generar examen simulado</h2>
      <p className="mb-4 text-xs text-ink-500">
        Mezcla preguntas de todos tus exámenes, repartidas por dominio según los porcentajes oficiales (P 6% ·
        ING 21% · TRA 22% · JOBS 16% · CICD 10% · TRO 10% · GOV 15%). Tus respuestas solo se guardan si
        finalizas el examen.
      </p>

      <div className="mb-4">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-400">
          Número de preguntas
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
            aria-label="Número de preguntas personalizado"
            className="w-20 rounded-full border border-ink-200 bg-surface px-3 py-1.5 text-xs text-ink-700 focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
          />
          <span className="text-xs text-ink-400">de {maxAvailable} disponibles</span>
        </div>
      </div>

      <div className="mb-4">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-400">
          Preguntas a incluir
        </span>
        <div className="flex flex-wrap gap-1.5">
          {SOURCE_OPTIONS.map((option) => (
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
        Generar examen
      </Button>
    </div>
  );
}
