import { useCallback, useMemo, useState } from 'react';
import { normalizeText } from '../../shared/utils/text';
import type { DomainId, ProgressMap, Question, QuestionFilters, QuestionStatus } from '../quiz.types';

export const PAGE_SIZE = 20;

export interface UseQuestionFilterResult {
  filters: QuestionFilters;
  setDomain: (domain: DomainId | 'ALL') => void;
  setExam: (exam: number) => void;
  setStatus: (status: QuestionStatus) => void;
  setSearch: (search: string) => void;
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
  pageItems: Question[];
  totalFiltered: number;
  totalBank: number;
  answeredCount: number;
  correctCount: number;
  /** Keeps a question visible in the current view even if it stops matching
   * the active status filter once it's answered. Without this, answering a
   * question while filtering by "Pending" makes it vanish from the list
   * before you can see whether you got it right. */
  registerAnswer: (questionId: string) => void;
}

const DEFAULT_FILTERS: QuestionFilters = { domain: 'ALL', exam: 0, status: 'all', search: '' };

export function useQuestionFilter(bank: Question[], progress: ProgressMap): UseQuestionFilterResult {
  const [filters, setFilters] = useState<QuestionFilters>(DEFAULT_FILTERS);
  const [page, setPageState] = useState(1);
  const [stickyIds, setStickyIds] = useState<ReadonlySet<string>>(new Set());

  const applyFilterChange = useCallback((patch: Partial<QuestionFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setStickyIds(new Set());
    setPageState(1);
  }, []);

  const setDomain = useCallback(
    (domain: DomainId | 'ALL') => applyFilterChange({ domain }),
    [applyFilterChange],
  );
  const setExam = useCallback((exam: number) => applyFilterChange({ exam }), [applyFilterChange]);
  const setStatus = useCallback(
    (status: QuestionStatus) => applyFilterChange({ status }),
    [applyFilterChange],
  );
  const setSearch = useCallback((search: string) => applyFilterChange({ search }), [applyFilterChange]);

  const registerAnswer = useCallback((questionId: string) => {
    setStickyIds((prev) => {
      if (prev.has(questionId)) return prev;
      const next = new Set(prev);
      next.add(questionId);
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    const term = normalizeText(filters.search.trim());
    return bank.filter((question) => {
      if (filters.domain !== 'ALL' && question.d !== filters.domain) return false;
      if (filters.exam !== 0 && question.exam !== filters.exam) return false;
      if (term) {
        const haystack = normalizeText(`${question.q} ${question.o.join(' ')} ${question.x}`);
        if (!haystack.includes(term)) return false;
      }
      if (stickyIds.has(question.id)) return true;

      const entry = progress[question.id];
      if (filters.status === 'pending' && entry) return false;
      if (filters.status === 'wrong' && (!entry || entry.ok)) return false;
      if (filters.status === 'right' && (!entry || !entry.ok)) return false;
      return true;
    });
  }, [bank, filters, progress, stickyIds]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);

  const pageItems = useMemo(
    () => filtered.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE),
    [filtered, clampedPage],
  );

  const setPage = useCallback(
    (next: number) => {
      setPageState(Math.min(Math.max(1, next), totalPages));
    },
    [totalPages],
  );

  const answeredCount = useMemo(() => filtered.filter((q) => progress[q.id]).length, [filtered, progress]);
  const correctCount = useMemo(() => filtered.filter((q) => progress[q.id]?.ok).length, [filtered, progress]);

  return {
    filters,
    setDomain,
    setExam,
    setStatus,
    setSearch,
    page: clampedPage,
    setPage,
    totalPages,
    pageItems,
    totalFiltered: filtered.length,
    totalBank: bank.length,
    answeredCount,
    correctCount,
    registerAnswer,
  };
}
