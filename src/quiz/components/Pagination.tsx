import { Button } from '../../shared/components/Button';
import { useLocale } from '../../shared/i18n/useLocale';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  const { t } = useLocale();
  if (totalPages <= 1) return null;

  const pageNumbers = buildPageWindow(page, totalPages);

  // Pagination controls sit at the bottom of a long question list, so
  // without this the next page renders while you're still scrolled down
  // near the bottom you'd land on question 46 having to scroll back up
  // to see question 1 of the new page instead of starting from the top.
  function goToPage(next: number) {
    onPageChange(next);
    window.scrollTo({ top: 0 });
  }

  return (
    <nav
      className="flex flex-wrap items-center justify-center gap-2 py-2"
      aria-label={t('pagination.ariaLabel')}
    >
      <Button variant="ghost" onClick={() => goToPage(page - 1)} disabled={page === 1}>
        ‹ {t('pagination.prev')}
      </Button>

      {pageNumbers.map((entry, index) =>
        entry === 'ellipsis' ? (
          <span key={`ellipsis-${index}`} className="px-1 text-ink-300">
            …
          </span>
        ) : (
          <button
            key={entry}
            type="button"
            aria-current={entry === page ? 'page' : undefined}
            onClick={() => goToPage(entry)}
            className={`h-9 w-9 rounded-lg text-sm font-semibold transition ${
              entry === page ? 'bg-action text-white' : 'text-ink-600 hover:bg-ink-100'
            }`}
          >
            {entry}
          </button>
        ),
      )}

      <Button variant="ghost" onClick={() => goToPage(page + 1)} disabled={page === totalPages}>
        {t('pagination.next')} ›
      </Button>
    </nav>
  );
}

function buildPageWindow(page: number, totalPages: number): (number | 'ellipsis')[] {
  const window = 1;
  const pages = new Set<number>([1, totalPages]);
  for (let p = page - window; p <= page + window; p += 1) {
    if (p >= 1 && p <= totalPages) pages.add(p);
  }
  const sorted = [...pages].sort((a, b) => a - b);

  const result: (number | 'ellipsis')[] = [];
  sorted.forEach((value, index) => {
    if (index > 0 && value - sorted[index - 1] > 1) result.push('ellipsis');
    result.push(value);
  });
  return result;
}
