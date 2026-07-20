import type { QuestionStatus } from '../quiz.types';
import { useLocale } from '../../shared/i18n/useLocale';

interface FiltersProps {
  search: string;
  exam: number;
  status: QuestionStatus;
  examNumbers: number[];
  onSearchChange: (value: string) => void;
  onExamChange: (value: number) => void;
  onStatusChange: (value: QuestionStatus) => void;
}

export function Filters({
  search,
  exam,
  status,
  examNumbers,
  onSearchChange,
  onExamChange,
  onStatusChange,
}: FiltersProps) {
  const { t } = useLocale();

  const statusOptions: { value: QuestionStatus; label: string }[] = [
    { value: 'all', label: t('filters.status.all') },
    { value: 'pending', label: t('filters.status.pending') },
    { value: 'wrong', label: t('filters.status.wrong') },
    { value: 'right', label: t('filters.status.right') },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth={2}
          stroke="currentColor"
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t('filters.searchPlaceholder')}
          aria-label={t('filters.searchAriaLabel')}
          className="w-full rounded-xl border border-ink-200 bg-surface py-2.5 pl-10 pr-3.5 text-sm text-ink-800 shadow-sm placeholder:text-ink-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <ChipGroup label={t('filters.examLabel')} ariaLabel={t('filters.filterByExam')}>
          <Chip active={exam === 0} onClick={() => onExamChange(0)}>
            {t('filters.allExams')}
          </Chip>
          {examNumbers.map((n) => (
            <Chip key={n} active={exam === n} onClick={() => onExamChange(n)}>
              {t('filters.examN', { n })}
            </Chip>
          ))}
        </ChipGroup>

        <ChipGroup label={t('filters.statusLabel')} ariaLabel={t('filters.filterByStatus')}>
          {statusOptions.map((option) => (
            <Chip
              key={option.value}
              tone="accent"
              active={status === option.value}
              onClick={() => onStatusChange(option.value)}
            >
              {option.label}
            </Chip>
          ))}
        </ChipGroup>
      </div>
    </div>
  );
}

function ChipGroup({
  label,
  ariaLabel,
  children,
}: {
  label: string;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={ariaLabel}>
      <span className="mr-1 text-xs font-bold uppercase tracking-wide text-ink-400">{label}</span>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
  tone = 'brand',
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: 'brand' | 'accent';
}) {
  const activeClasses = tone === 'brand' ? 'bg-action text-white' : 'bg-accent-500 text-white';
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active ? activeClasses : 'bg-ink-50 text-ink-500 hover:bg-ink-100'
      }`}
    >
      {children}
    </button>
  );
}
