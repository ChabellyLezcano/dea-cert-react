import type { RawQuestion, SeededQuestion } from '@/quiz/quiz.types';

/**
 * Eagerly import every exam module across every certification folder at
 * build time. Two on-disk shapes are supported, both matched by the two
 * globs below:
 *
 *  - Legacy, one file per exam: ./<certId>/exams/examN.ts, each exporting a
 *    single array named `examN` (matching its filename), e.g. AWS SAA.
 *  - Consolidated, one file per certification: ./<certId>/exams.ts,
 *    exporting several `examN` arrays side by side (a plain merge/append of
 *    the old per-exam files into one module), e.g. Databricks DEA.
 *
 * Either way, every export matching `examN` is picked up regardless of how
 * many live in the same module, so adding a new exam is just adding (or
 * appending) an `examN` export -- neither shape requires touching this file.
 */
const legacyExamModules = import.meta.glob<Record<string, RawQuestion[]>>('./*/exams/exam*.ts', {
  eager: true,
});
const consolidatedExamModules = import.meta.glob<Record<string, RawQuestion[]>>('./*/exams.ts', {
  eager: true,
});

const LEGACY_PATH_PATTERN = /^\.\/([^/]+)\/exams\/exam\d+\.ts$/;
const CONSOLIDATED_PATH_PATTERN = /^\.\/([^/]+)\/exams\.ts$/;
const EXAM_EXPORT_PATTERN = /^exam(\d+)$/;

function extractExams(
  path: string,
  certId: string,
  mod: Record<string, RawQuestion[]>,
): (readonly [certId: string, examNumber: number, questions: RawQuestion[]])[] {
  const entries = Object.entries(mod).filter(([exportName]) => EXAM_EXPORT_PATTERN.test(exportName));
  if (entries.length === 0) {
    throw new Error(`Expected ${path} to export at least one "examN" array`);
  }
  return entries.map(([exportName, questions]) => {
    const [, examNumberStr] = EXAM_EXPORT_PATTERN.exec(exportName)!;
    return [certId, Number(examNumberStr), questions] as const;
  });
}

const EXAMS: readonly (readonly [certId: string, examNumber: number, questions: RawQuestion[]])[] = [
  ...Object.entries(legacyExamModules).flatMap(([path, mod]) => {
    const match = LEGACY_PATH_PATTERN.exec(path);
    if (!match) {
      throw new Error(`Unexpected exam file path, expected "./<certId>/exams/examN.ts": ${path}`);
    }
    return extractExams(path, match[1], mod);
  }),
  ...Object.entries(consolidatedExamModules).flatMap(([path, mod]) => {
    const match = CONSOLIDATED_PATH_PATTERN.exec(path);
    if (!match) {
      throw new Error(`Unexpected exam file path, expected "./<certId>/exams.ts": ${path}`);
    }
    return extractExams(path, match[1], mod);
  }),
].sort(([certA, examA], [certB, examB]) => certA.localeCompare(certB) || examA - examB);

/**
 * The full question bank across all certifications, built synchronously at
 * import time from static TypeScript modules. Because there is no async
 * loading or DOM script ordering involved, the bank (and therefore the
 * sidebar stats derived from it) is guaranteed to be available on the very
 * first render.
 *
 * `id` is `{examNumber}{questionNumber}`, with the question number
 * zero-padded to 2 digits (exam 4, question 17 -> "417"). The padding is
 * what keeps it collision-free: without it, exam 1 question 17 ("117")
 * would equal exam 11 question 7 ("11" + "7"). This intentionally replaces
 * the older "E{exam}Q{n}" shape, which means existing `question_progress`
 * rows in Supabase keyed by the old ids will no longer match -- a
 * migration/reset of that table is needed alongside this change.
 */
export const QUESTION_BANK: SeededQuestion[] = EXAMS.flatMap(([certId, examNumber, questions]) =>
  questions.map((question) => ({
    ...question,
    exam: examNumber,
    certId,
    id: `${examNumber}${String(question.n).padStart(2, '0')}`,
  })),
);

export const EXAM_NUMBERS: number[] = [...new Set(EXAMS.map(([, examNumber]) => examNumber))].sort(
  (a, b) => a - b,
);

export const QUESTION_BY_ID: Map<string, SeededQuestion> = new Map(
  QUESTION_BANK.map((question) => [question.id, question]),
);
