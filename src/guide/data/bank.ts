// src/guide/data/bank.ts
import type { RawStudyTopic } from '../../types/guide.types';
import { pTopics } from './topics/p';
import { ingTopics } from './topics/ing';
import { traTopics } from './topics/tra';
import { jobsTopics } from './topics/jobs';
import { cicdTopics } from './topics/cicd';
import { troTopics } from './topics/tro';
import { govTopics } from './topics/gov';

/**
 * The full study guide, assembled from the per-domain seed files. This is
 * the SEED SOURCE consumed by `npm run db:seed` — the running app reads
 * topics from Supabase (see useStudyTopics), not from this module.
 */
export const STUDY_TOPICS: RawStudyTopic[] = [
  ...pTopics,
  ...ingTopics,
  ...traTopics,
  ...jobsTopics,
  ...cicdTopics,
  ...troTopics,
  ...govTopics,
];
