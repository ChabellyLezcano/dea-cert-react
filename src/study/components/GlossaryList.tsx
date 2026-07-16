import { Highlight } from '../../shared/components/Highlight';
import { DOMAINS } from '../../quiz/data/domains';
import type { GlossaryTerm } from '../data/glossary.types';

interface GlossaryListProps {
  terms: GlossaryTerm[];
  searchTerm: string;
}

export function GlossaryList({ terms, searchTerm }: GlossaryListProps) {
  const grouped = DOMAINS.map((domain) => ({
    domain,
    items: terms.filter((term) => term.c === domain.id),
  })).filter((group) => group.items.length > 0);

  if (!grouped.length) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-200 bg-surface p-10 text-center text-sm text-ink-500">
        No results for "{searchTerm}". Try another term (e.g. "VACUUM", "broadcast", "ABAC").
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {grouped.map(({ domain, items }) => (
        <section key={domain.id}>
          <h3 className="mb-3 flex flex-wrap items-center gap-2 break-words text-base font-bold text-ink-800">
            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
              S{domain.order}
            </span>
            {domain.name}
            <span className="rounded-full bg-ink-50 px-2.5 py-1 text-xs font-medium text-ink-400">
              {domain.weight}% of the exam
            </span>
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 animate-stagger">
            {items.map((term) => (
              <article key={term.t} className="rounded-xl border border-ink-100 bg-surface p-4 shadow-sm">
                <h4 className="flex flex-wrap items-center gap-2 break-words font-semibold text-brand-700">
                  <Highlight text={term.t} term={searchTerm} />
                  {term.r === 1 && (
                    <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-500">
                      Not in 2026 scope
                    </span>
                  )}
                </h4>
                <p className="mt-1 break-words text-sm text-ink-600">
                  <Highlight text={term.d} term={searchTerm} />
                </p>
                {term.k && (
                  <pre className="mt-2 max-w-full overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-ink-50">
                    <code>
                      <Highlight text={term.k} term={searchTerm} />
                    </code>
                  </pre>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
