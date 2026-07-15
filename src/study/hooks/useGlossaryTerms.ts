import { useEffect, useState } from 'react';
import { supabase } from '../../shared/lib/supabaseClient';
import type { DomainId } from '../../quiz/quiz.types';
import type { GlossaryTerm } from '../data/glossary.types';

export interface UseGlossaryTermsResult {
  terms: GlossaryTerm[];
  isLoading: boolean;
  error: string | null;
}

/** Loads the concept glossary from the `glossary_terms` table. Shared,
 * read-only content — same fetch-once-per-mount pattern as useQuestionBank. */
export function useGlossaryTerms(): UseGlossaryTermsResult {
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    supabase
      .from('glossary_terms')
      .select('*')
      .order('term', { ascending: true })
      .then(({ data, error: fetchError }) => {
        if (!isMounted) return;
        if (fetchError) {
          setError(fetchError.message);
          setIsLoading(false);
          return;
        }
        const mapped: GlossaryTerm[] = (data ?? []).map((row) => ({
          t: row.term,
          c: row.domain as DomainId,
          d: row.definition,
          k: row.code_snippet ?? undefined,
          r: row.retired ? 1 : 0,
        }));
        setTerms(mapped);
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { terms, isLoading, error };
}
