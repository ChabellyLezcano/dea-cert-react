import type { Domain, DomainId } from '@/quiz/quiz.types';

export const AI_EXAM_QUESTION_COUNT = 45;

/** Mirrors MAX_COUNT in supabase/functions/generate-ai-questions/index.ts.
 * Keep these two in sync if that edge function's per-call cap ever
 * changes -- a batch above this would just be silently clamped server
 * side, throwing off our own progress accounting. */
export const AI_EXAM_BATCH_MAX = 10;

export interface AiExamBatch {
  domain: DomainId;
  count: number;
}

/** Splits `total` into one integer target per domain, proportional to
 * each domain's official exam weight, using the largest-remainder method
 * (same approach as the static mock exam's allocateByWeight in
 * utils/mockExam.ts -- duplicated in miniature here rather than shared,
 * because that version is tightly coupled to the global cross-cert
 * DOMAINS import and this one must take an explicit, already
 * certId-filtered domain list; see "AI domain bug pattern" in project
 * notes). Works even when the given domains' weights don't sum to 100
 * (e.g. a certification with only some official domains loaded so far):
 * the remainder step still forces the totals to add up to exactly
 * `total`, cycling through domains again if needed. */
function allocateByWeight(domains: Domain[], total: number): Record<DomainId, number> {
  const raw = domains.map((d) => ({ id: d.id, exact: (d.weight / 100) * total }));

  const targets = {} as Record<DomainId, number>;
  let allocated = 0;
  for (const entry of raw) {
    const base = Math.floor(entry.exact);
    targets[entry.id] = base;
    allocated += base;
  }

  const remainder = total - allocated;
  const byRemainder = [...raw].sort((a, b) => (b.exact % 1) - (a.exact % 1));
  for (let i = 0; i < remainder; i += 1) {
    targets[byRemainder[i % byRemainder.length].id] += 1;
  }

  return targets;
}

/** Plans the sequence of edge-function calls needed to build a full
 * multi-domain AI mock exam: `total` questions distributed across every
 * given domain per its official weight, then split into batches no
 * larger than `batchMax` (the edge function's own per-call cap) --
 * issuing more than one call to the same domain if its target exceeds
 * that cap, which is what makes this work even for a certification with
 * very few domains loaded (e.g. one domain gets every batch). */
export function planAiExamBatches(
  domains: Domain[],
  total: number,
  batchMax: number = AI_EXAM_BATCH_MAX,
): AiExamBatch[] {
  if (domains.length === 0 || total <= 0) return [];

  const targets = allocateByWeight(domains, total);

  const batches: AiExamBatch[] = [];
  for (const domain of domains) {
    let remaining = targets[domain.id];
    while (remaining > 0) {
      const count = Math.min(batchMax, remaining);
      batches.push({ domain: domain.id, count });
      remaining -= count;
    }
  }
  return batches;
}
