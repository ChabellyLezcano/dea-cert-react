import type { DomainId } from '../../quiz/quiz.types';

export interface GlossaryTerm {
  /** Term title */
  t: string;
  /** Domain id this term belongs to */
  c: DomainId;
  /** Definition (Spanish, as originally authored) */
  d: string;
  /** Optional code snippet */
  k?: string;
  /** 1 if this concept was retired from the May 2026 exam guide (shown as a
   * "not in scope" hint rather than removed, since it's still useful as a
   * distractor-recognition aid). */
  r?: 0 | 1;
}

export interface ExamMeta {
  cert: string;
  version: string;
  facts: [string, string][];
  resources: [string, string][];
}
