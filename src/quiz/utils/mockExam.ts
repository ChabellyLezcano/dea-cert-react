import { DOMAINS } from '../data/domains';
import { shuffleArray } from '../../shared/utils/shuffle';
import type { DomainId, ProgressMap, Question } from '../quiz.types';

export type MockExamSource = 'unanswered' | 'answered' | 'both';

export interface MockExamOptions {
  /** Total number of questions the generated exam should have. */
  totalQuestions: number;
  /** Which questions are eligible to be picked, based on your saved progress. */
  source: MockExamSource;
}

export interface MockExamDomainBreakdown {
  domain: DomainId;
  /** How many questions this domain *should* get, per its official weight. */
  target: number;
  /** How many questions this domain actually got (may be less if the pool ran short). */
  picked: number;
}

export interface MockExamResult {
  questions: Question[];
  breakdown: MockExamDomainBreakdown[];
  /** True if one or more domains didn't have enough eligible questions to
   * hit their target share, so the exam is shorter/differently balanced
   * than requested (e.g. "unanswered only" running low in a domain). */
  isShortOfTarget: boolean;
}

export interface MockExamDomainResult {
  domain: DomainId;
  correct: number;
  total: number;
}

/** Per-domain correctness breakdown for a finished mock exam attempt, e.g.
 * for a results panel showing "% correct" per domain. Only domains that
 * actually got at least one question in this exam are included -- a
 * domain with `total: 0` would just be a 0/0 row with nothing meaningful
 * to show. `progress` should be the *real*, already-committed progress
 * (post "Finish exam"), not an in-progress draft. */
export function computeMockExamDomainResults(
  questions: Question[],
  progress: ProgressMap,
): MockExamDomainResult[] {
  const byDomain = new Map<DomainId, { correct: number; total: number }>();

  for (const question of questions) {
    const stats = byDomain.get(question.d) ?? { correct: 0, total: 0 };
    stats.total += 1;
    if (progress[question.id]?.ok) stats.correct += 1;
    byDomain.set(question.d, stats);
  }

  // Ordered by each domain's official position. DOMAINS aggregates every
  // loaded certification (each domain stamped with its own certId), but a
  // domain only ends up in `byDomain` if one of its questions was actually
  // in this exam -- which, since the exam is generated from a single
  // cert's bank, means cross-cert entries are naturally excluded without
  // needing a certId here. The `seen` guard is just a defensive backstop
  // against the documented (if currently untrue) risk of two certs
  // reusing the same domain code -- see the note on DOMAIN_MAP.
  const seen = new Set<DomainId>();
  const results: MockExamDomainResult[] = [];
  for (const domain of DOMAINS) {
    const stats = byDomain.get(domain.id);
    if (!stats || seen.has(domain.id)) continue;
    seen.add(domain.id);
    results.push({ domain: domain.id, ...stats });
  }
  return results;
}

/** Splits `total` into one integer count per domain, proportional to each
 * domain's official exam weight, using the largest-remainder method so the
 * counts always add up to exactly `total` (plain rounding can over/undershoot). */
function allocateByWeight(total: number): Record<DomainId, number> {
  const raw = DOMAINS.map((domain) => ({
    id: domain.id,
    exact: (domain.weight / 100) * total,
  }));

  const allocation = {} as Record<DomainId, number>;
  let allocated = 0;
  for (const entry of raw) {
    const base = Math.floor(entry.exact);
    allocation[entry.id] = base;
    allocated += base;
  }

  // Distribute the leftover questions (from flooring) to the domains whose
  // fractional remainder was largest, so the total matches exactly.
  const remainder = total - allocated;
  const byRemainder = [...raw].sort((a, b) => (b.exact % 1) - (a.exact % 1));
  for (let i = 0; i < remainder; i += 1) {
    allocation[byRemainder[i % byRemainder.length].id] += 1;
  }

  return allocation;
}

function matchesSource(question: Question, progress: ProgressMap, source: MockExamSource): boolean {
  const isAnswered = Boolean(progress[question.id]);
  if (source === 'both') return true;
  if (source === 'answered') return isAnswered;
  return !isAnswered; // 'unanswered'
}

/** Generates a mock exam: a set of questions mixed from the whole bank,
 * sampled per domain in proportion to the official exam weights (e.g. ~22%
 * from Data Transformation, ~6% from Platform), restricted to answered,
 * unanswered, or either question, per `options.source`.
 *
 * If a domain doesn't have enough eligible questions to fill its share
 * (e.g. you've already answered everything in a small domain and asked for
 * "unanswered only"), its shortfall is backfilled from any other domain
 * with eligible questions left over, so the exam still reaches
 * `totalQuestions` whenever the overall pool allows it. */
export function generateMockExam(
  bank: Question[],
  progress: ProgressMap,
  options: MockExamOptions,
): MockExamResult {
  const total = Math.max(0, Math.min(options.totalQuestions, bank.length));
  const targets = allocateByWeight(total);

  const eligibleByDomain = new Map<DomainId, Question[]>(
    DOMAINS.map((domain) => [
      domain.id,
      shuffleArray(bank.filter((q) => q.d === domain.id && matchesSource(q, progress, options.source))),
    ]),
  );

  const picked: Question[] = [];
  const pickedCountByDomain = {} as Record<DomainId, number>;

  for (const domain of DOMAINS) {
    const pool = eligibleByDomain.get(domain.id) ?? [];
    const take = pool.splice(0, targets[domain.id]);
    picked.push(...take);
    pickedCountByDomain[domain.id] = take.length;
  }

  // Backfill shortfalls from whatever's left over in any domain's pool,
  // so a domain running low doesn't shrink the exam below what the
  // overall bank could still provide.
  const shortfall = total - picked.length;
  if (shortfall > 0) {
    const leftovers = shuffleArray(DOMAINS.flatMap((d) => eligibleByDomain.get(d.id) ?? []));
    const backfill = leftovers.slice(0, shortfall);
    backfill.forEach((q) => {
      pickedCountByDomain[q.d] += 1;
    });
    picked.push(...backfill);
  }

  const breakdown: MockExamDomainBreakdown[] = DOMAINS.map((domain) => ({
    domain: domain.id,
    target: targets[domain.id],
    picked: pickedCountByDomain[domain.id] ?? 0,
  }));

  return {
    questions: shuffleArray(picked),
    breakdown,
    isShortOfTarget: picked.length < total,
  };
}
