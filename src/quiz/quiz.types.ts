/**
 * Raw question shape as authored in the exam data files.
 * Field names are kept short (n, d, m, q, o, a, x) to match the
 * original data source; they are mapped to descriptive names
 * wherever they are consumed in the UI layer.
 */
export interface RawQuestion {
  /** Question number within its exam */
  n: number;
  /** Domain id, e.g. "ING", "TRA", "GOV"... */
  d: DomainId;
  /** 1 if the question accepts multiple correct answers, 0 otherwise */
  m: 0 | 1;
  /** Question statement (English) */
  q: string;
  /** Answer options (English) */
  o: string[];
  /** Zero-based indices of the correct option(s) */
  a: number[];
  /** Explanation (Spanish) */
  x: string;
}

/** A question enriched with its exam number and a stable global id */
export interface Question extends RawQuestion {
  /** Exam number (1-9) this question belongs to */
  exam: number;
  /** Which certification this question belongs to, e.g. "databricks-dea" */
  certId: string;
  /** Stable identifier, e.g. "E3Q12" */
  id: string;
}

/**
 * Domain code. Historically a fixed union scoped to the Databricks DEA exam;
 * now a plain string so other certifications can define their own domain
 * codes without touching this type. Validity is enforced where it matters:
 * a composite FK in Supabase (domains.cert_id + domains.code).
 */
export type DomainId = string;

/** A domain as authored in a certification's own domains.ts (no certId --
 * the aggregator in src/quiz/data/domains.ts stamps it from the folder). */
export interface RawDomain {
  id: DomainId;
  order: number;
  name: string;
  /** Official weight of this domain in the exam, as a percentage */
  weight: number;
}

export interface Domain extends RawDomain {
  /** Which certification this domain belongs to, e.g. "databricks-dea" */
  certId: string;
}

export type QuestionStatus = 'all' | 'pending' | 'wrong' | 'right';

/** Per-question progress, persisted in Supabase and mirrored in local state */
export interface QuestionProgress {
  questionId: string;
  ok: boolean;
  picked: number[];
  revealed: boolean;
  updatedAt: string;
}

export type ProgressMap = Record<string, QuestionProgress>;

export interface DomainStats {
  total: number;
  answered: number;
  correct: number;
}

export interface QuestionFilters {
  domain: DomainId | 'ALL';
  exam: number; // 0 = all exams
  status: QuestionStatus;
  search: string;
}
