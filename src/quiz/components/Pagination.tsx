import { Button } from '../../shared/components/Button';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pageNumbers = buildPageWindow(page, totalPages);

  return (
    <nav className="flex flex-wrap items-center justify-center gap-2 py-2" aria-label="Question pages">
      <Button variant="ghost" onClick={() => onPageChange(page - 1)} disabled={page === 1}>
        ‹ Prev
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
            onClick={() => onPageChange(entry)}
            className={`h-9 w-9 rounded-lg text-sm font-semibold transition ${
              entry === page ? 'bg-action text-white' : 'text-ink-600 hover:bg-ink-100'
            }`}
          >
            {entry}
          </button>
        ),
      )}

      <Button variant="ghost" onClick={() => onPageChange(page + 1)} disabled={page === totalPages}>
        Next ›
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
