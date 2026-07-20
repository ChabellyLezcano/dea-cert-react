import type { RawQuestion, SeededQuestion } from '@/quiz/quiz.types';

/**
 * Eagerly import every exam file across every certification folder at
 * build time, e.g. ./databricks-dea/exams/exam3.ts. Adding a new exam is
 * just adding examN.ts under a cert's exams/ folder; adding a whole new
 * certification is just adding a new top-level folder here -- neither
 * requires touching this file.
 *
 * Each module is expected to export a single array named `examN`
 * (matching its filename), following the existing convention.
 */
const examModules = import.meta.glob<Record<string, RawQuestion[]>>('./*/exams/exam*.ts', {
  eager: true,
});

const EXAM_PATH_PATTERN = /^\.\/([^/]+)\/exams\/exam(\d+)\.ts$/;

const EXAMS: readonly (readonly [certId: string, examNumber: number, questions: RawQuestion[]])[] =
  Object.entries(examModules)
    .map(([path, mod]) => {
      const match = EXAM_PATH_PATTERN.exec(path);
      if (!match) {
        throw new Error(`Unexpected exam file path, expected "./<certId>/exams/examN.ts": ${path}`);
      }
      const [, certId, examNumberStr] = match;
      const examNumber = Number(examNumberStr);
      const exportName = `exam${examNumber}`;
      const questions = mod[exportName];
      if (!questions) {
        throw new Error(`Expected ${path} to export "${exportName}"`);
      }
      return [certId, examNumber, questions] as const;
    })
    .sort(([certA, examA], [certB, examB]) => certA.localeCompare(certB) || examA - examB);

/**
 * The full question bank across all certifications, built synchronously at
 * import time from static TypeScript modules. Because there is no async
 * loading or DOM script ordering involved, the bank (and therefore the
 * sidebar stats derived from it) is guaranteed to be available on the very
 * first render.
 *
 * Note: `id` intentionally keeps its original unprefixed shape
 * ("E{exam}Q{n}") rather than being prefixed with certId, to stay
 * compatible with existing `question_progress` rows in Supabase. Only
 * Databricks DEA is loaded today, so there's no cross-cert collision yet --
 * revisit this (and the matching `questions.id` values in Supabase) before
 * a second certification reuses the same exam/question numbering.
 */
export const QUESTION_BANK: SeededQuestion[] = EXAMS.flatMap(([certId, examNumber, questions]) =>
  questions.map((question) => ({
    ...question,
    exam: examNumber,
    certId,
    id: `E${examNumber}Q${question.n}`,
  })),
);

export const EXAM_NUMBERS: number[] = [...new Set(EXAMS.map(([, examNumber]) => examNumber))].sort(
  (a, b) => a - b,
);

export const QUESTION_BY_ID: Map<string, SeededQuestion> = new Map(
  QUESTION_BANK.map((question) => [question.id, question]),
);
