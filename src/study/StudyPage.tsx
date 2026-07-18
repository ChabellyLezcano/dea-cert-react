import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { GlossaryList } from '@/study/components/GlossaryList';
import { useGlossaryTerms } from '@/study/hooks/useGlossaryTerms';
import { examMeta } from '@/study/data/examMeta';
import { DOMAINS } from '@/quiz/data/domains';
import { normalizeText } from '@/shared/utils/text';
import { InlineSpinner } from '@/shared/components/InlineSpinner';
import type { DomainId } from '@/quiz/quiz.types';

export function StudyPage() {
  const { certId } = useParams<{ certId: string }>();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<DomainId | 'ALL'>('ALL');
  const { terms: glossary, isLoading, error } = useGlossaryTerms(certId);

  const filteredTerms = useMemo(() => {
    const term = normalizeText(search.trim());
    return glossary.filter((entry) => {
      if (category !== 'ALL' && entry.c !== category) return false;
      if (term && !normalizeText(`${entry.t} ${entry.d} ${entry.k ?? ''}`).includes(term)) return false;
      return true;
    });
  }, [glossary, search, category]);

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-2xl border border-ink-100 bg-gradient-to-br from-action to-brand-900 p-8 text-white shadow-lg">
        <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
          {examMeta.version}
        </span>
        <h1 className="mt-3 text-2xl font-bold">Study section: certification concepts, as a glossary</h1>
        <p className="mt-2 max-w-2xl text-sm text-brand-100">
          Exam quick facts, links to the official Databricks platform and documentation, and a glossary of
          concepts organized by the 7 official exam sections with their weight. Use the search box to find any
          term.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {examMeta.facts.map(([key, value]) => (
            <div key={key} className="rounded-xl bg-white/10 p-3">
              <div className="text-xs text-brand-100">{key}</div>
              <div className="mt-0.5 text-sm font-semibold">{value}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-base font-bold text-ink-800">Official Databricks resources</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {examMeta.resources.map(([name, url]) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col rounded-xl border border-ink-100 bg-surface p-4 shadow-sm transition hover:border-brand-300 hover:shadow-md"
            >
              <span className="font-semibold text-ink-800">{name}</span>
              <span className="mt-0.5 truncate text-xs text-ink-400">{url}</span>
            </a>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-base font-bold text-ink-800">Concept glossary</h3>
        <div className="relative mb-4">
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
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search a concept… (Auto Loader, MERGE INTO, Unity Catalog…)"
            aria-label="Search the glossary"
            className="w-full rounded-xl border border-ink-200 bg-surface py-2.5 pl-10 pr-3.5 text-sm text-ink-800 shadow-sm placeholder:text-ink-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
          />
        </div>

        <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Filter by section">
          <CategoryChip active={category === 'ALL'} onClick={() => setCategory('ALL')}>
            All the glossary
          </CategoryChip>
          {DOMAINS.map((domain) => (
            <CategoryChip
              key={domain.id}
              active={category === domain.id}
              onClick={() => setCategory(domain.id)}
            >
              S{domain.order} · {domain.name}
            </CategoryChip>
          ))}
        </div>

        <p className="mb-4 text-sm text-ink-500">
          <b className="text-ink-800">{filteredTerms.length}</b> concepts
          {category !== 'ALL' ? ' in this section' : ''} (of <b className="text-ink-800">{glossary.length}</b>
          )
        </p>

        {isLoading && <InlineSpinner label="Loading the glossary from the database..." />}

        {!isLoading && error && (
          <div className="rounded-2xl border border-ko-100 bg-surface p-6 text-sm text-ko-600" role="alert">
            Could not load the glossary: {error}. Make sure the <code>glossary_terms</code> table has been
            created and seeded (see the README).
          </div>
        )}

        {!isLoading && !error && <GlossaryList terms={filteredTerms} searchTerm={search} />}
      </section>
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active ? 'bg-accent-500 text-white' : 'bg-ink-50 text-ink-500 hover:bg-ink-100'
      }`}
    >
      {children}
    </button>
  );
}
