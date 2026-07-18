import type { ExamMeta } from '@/study/data/glossary.types';

export const examMeta: ExamMeta = {
  cert: 'AWS Certified Solutions Architect - Associate',
  version: 'SAA-C03',
  facts: [
    ['Duration', '130 minutes'],
    ['Questions', '65 (scored + unscored)'],
    ['Format', 'Multiple choice / multiple response'],
    ['Passing score', '720 / 1000'],
  ],
  resources: [
    [
      'AWS Certification page',
      'https://aws.amazon.com/certification/certified-solutions-architect-associate/',
    ],
    ['AWS Well-Architected Framework', 'https://aws.amazon.com/architecture/well-architected/'],
  ],
};
