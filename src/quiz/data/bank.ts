import type { Question, RawQuestion } from '../quiz.types';
import { exam1 } from './exams/exam1';
import { exam2 } from './exams/exam2';
import { exam3 } from './exams/exam3';
import { exam4 } from './exams/exam4';
import { exam5 } from './exams/exam5';
import { exam6 } from './exams/exam6';
import { exam7 } from './exams/exam7';
import { exam8 } from './exams/exam8';
import { exam9 } from './exams/exam9';

const EXAMS: readonly (readonly [number, RawQuestion[]])[] = [
  [1, exam1],
  [2, exam2],
  [3, exam3],
  [4, exam4],
  [5, exam5],
  [6, exam6],
  [7, exam7],
  [8, exam8],
  [9, exam9],
];

/**
 * The full question bank, built synchronously at import time from static
 * TypeScript modules. Because there is no async loading or DOM script
 * ordering involved, the bank (and therefore the sidebar stats derived
 * from it) is guaranteed to be available on the very first render.
 */
export const QUESTION_BANK: Question[] = EXAMS.flatMap(([examNumber, questions]) =>
  questions.map((question) => ({
    ...question,
    exam: examNumber,
    id: `E${examNumber}Q${question.n}`,
  })),
);

export const EXAM_NUMBERS: number[] = EXAMS.map(([examNumber]) => examNumber);

export const QUESTION_BY_ID: Map<string, Question> = new Map(
  QUESTION_BANK.map((question) => [question.id, question]),
);
