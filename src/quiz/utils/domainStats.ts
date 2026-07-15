import type { DomainId, DomainStats, ProgressMap, Question } from '../quiz.types';

export function computeDomainStats(
  bank: Question[],
  domainId: DomainId | 'ALL',
  progress: ProgressMap,
): DomainStats {
  const questions = domainId === 'ALL' ? bank : bank.filter((q) => q.d === domainId);
  let answered = 0;
  let correct = 0;
  for (const question of questions) {
    const entry = progress[question.id];
    if (entry) {
      answered += 1;
      if (entry.ok) correct += 1;
    }
  }
  return { total: questions.length, answered, correct };
}
