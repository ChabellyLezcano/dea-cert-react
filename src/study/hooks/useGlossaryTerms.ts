import { useEffect, useState } from 'react';
import { supabase } from '@/shared/lib/supabaseClient';
import type { DomainId } from '@/quiz/quiz.types';
import type { GlossaryTerm } from '@/study/data/glossary.types';

export interface UseGlossaryTermsResult {
  terms: GlossaryTerm[];
  isLoading: boolean;
  error: string | null;
}

/** Loads the concept glossary from the `glossary_terms` table. Shared,
 * read-only content — same fetch-once-per-mount pattern as useQuestionBank.
 * @param certId When provided, only terms for that certification are
 * fetched. Omitted entirely in tests, which don't care about filtering. */
export function useGlossaryTerms(certId?: string): UseGlossaryTermsResult {
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    let query = supabase.from('glossary_terms').select('*');
    if (certId) query = query.eq('cert_id', certId);

    query.order('term', { ascending: true }).then(({ data, error: fetchError }) => {
      if (!isMounted) return;
      if (fetchError) {
        setError(fetchError.message);
        setIsLoading(false);
        return;
      }
      const mapped: GlossaryTerm[] = (data ?? []).map((row) => ({
        t: row.term,
        certId: row.cert_id,
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
  }, [certId]);

  return { terms, isLoading, error };
}
