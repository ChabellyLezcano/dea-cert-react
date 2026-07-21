import { useMemo } from 'react';
import { RotateCcw, Shuffle } from 'lucide-react';
import { DOMAINS } from '../data/domains';
import { computeDomainStats } from '../utils/domainStats';
import type { DomainId, ProgressMap, Question } from '../quiz.types';
import { Button } from '../../shared/components/Button';
import { useLocale } from '../../shared/i18n/useLocale';

interface SidebarProps {
  /** Which certification's domains to show -- DOMAINS aggregates every
   * loaded certification together (see data/domains.ts), so this must be
   * filtered before rendering or the sidebar shows every certification's
   * sections mixed together instead of just the one being studied. */
  certId: string | undefined;
  bank: Question[];
  progress: ProgressMap;
  activeDomain: DomainId | 'ALL';
  onSelectDomain: (domain: DomainId | 'ALL') => void;
  onShuffle: () => void;
  onResetProgress: () => void;
}

/** Renders synchronously from the static question bank and domain list, so
 * it never shows an empty state on first paint — only the per-domain
 * progress numbers update once Supabase progress finishes loading. */
export function Sidebar({
  certId,
  bank,
  progress,
  activeDomain,
  onSelectDomain,
  onShuffle,
  onResetProgress,
}: SidebarProps) {
  const { t } = useLocale();
  const allStats = computeDomainStats(bank, 'ALL', progress);
  const certDomains = useMemo(() => DOMAINS.filter((d) => d.certId === certId), [certId]);

  return (
    <aside className="flex w-full flex-col gap-4 lg:w-72 lg:shrink-0" aria-label="Exam sections">
      <div className="rounded-2xl border border-ink-100 bg-surface p-4 shadow-sm">
        <h2 className="mb-3 px-1 text-xs font-bold uppercase tracking-wide text-ink-400">
          {t('sidebar.sectionsWeight')}
        </h2>
        <div className="flex flex-col gap-1.5">
          <DomainButton
            label={t('sidebar.allSections')}
            weight={null}
            stats={allStats}
            active={activeDomain === 'ALL'}
            onClick={() => onSelectDomain('ALL')}
          />
          {certDomains.map((domain) => (
            <DomainButton
              key={domain.id}
              label={`S${domain.order} · ${domain.name}`}
              weight={domain.weight}
              stats={computeDomainStats(bank, domain.id, progress)}
              active={activeDomain === domain.id}
              onClick={() => onSelectDomain(domain.id)}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-ink-100 bg-surface p-4 shadow-sm">
        <Button variant="ghost" onClick={onShuffle} className="w-full">
          <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
          {t('sidebar.shuffle')}
        </Button>
        <Button variant="danger" onClick={onResetProgress} className="w-full">
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          {t('sidebar.resetProgress')}
        </Button>
      </div>
    </aside>
  );
}

function DomainButton({
  label,
  weight,
  stats,
  active,
  onClick,
}: {
  label: string;
  weight: number | null;
  stats: { total: number; answered: number; correct: number };
  active: boolean;
  onClick: () => void;
}) {
  const { t } = useLocale();
  const progressPct = stats.total ? Math.round((stats.answered / stats.total) * 100) : 0;
  const correctPct = stats.total ? Math.round((stats.correct / stats.total) * 100) : 0;
  // Accuracy = correct out of ANSWERED (not out of total) — "how well am I
  // doing on what I've attempted so far", independent of how much is left.
  const accuracyPct = stats.answered > 0 ? Math.round((stats.correct / stats.answered) * 100) : null;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`w-full rounded-xl border px-3 py-2.5 text-left transition [-webkit-tap-highlight-color:transparent] ${
        active
          ? 'border-brand-500 bg-brand-50 shadow-sm'
          : 'border-transparent active:border-ink-100 active:bg-ink-50 hover:border-ink-100 hover:bg-ink-50'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`min-w-0 break-words text-sm font-semibold ${active ? 'text-brand-700' : 'text-ink-700'}`}
            >
              {label}
            </span>
            {weight !== null && <span className="shrink-0 text-xs font-medium text-ink-400">{weight}%</span>}
          </div>
          <div className="relative mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
            <div className="absolute inset-y-0 left-0 bg-brand-200" style={{ width: `${progressPct}%` }} />
            <div className="absolute inset-y-0 left-0 bg-ok-500" style={{ width: `${correctPct}%` }} />
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <p className="text-xs text-ink-400">
              {t('sidebar.statsLine', {
                correct: stats.correct,
                total: stats.total,
                answered: stats.answered,
              })}
            </p>
            <AccuracyBadge accuracyPct={accuracyPct} />
          </div>
        </div>
      </div>
    </button>
  );
}

/** Correct-out-of-answered percentage, color-coded so a glance tells you
 * whether a section needs more review (red/amber) or is solid (green). */
function AccuracyBadge({ accuracyPct }: { accuracyPct: number | null }) {
  const { t } = useLocale();

  if (accuracyPct === null) {
    return <span className="shrink-0 text-xs font-medium text-ink-300">{t('sidebar.noAttempts')}</span>;
  }

  const tone = accuracyPct >= 80 ? 'text-ok-600' : accuracyPct >= 50 ? 'text-accent-600' : 'text-ko-600';

  return (
    <span className={`shrink-0 text-xs font-bold ${tone}`}>
      {t('sidebar.accuracy', { pct: accuracyPct })}
    </span>
  );
}
