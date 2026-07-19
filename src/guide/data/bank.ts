// src/guide/data/bank.ts
import type { RawStudyTopic, StudyTopic } from '@/types/guide.types';

/**
 * Eagerly import every topic file across every certification's topics/
 * folder at build time, e.g. ./databricks-dea/topics/p.ts. Adding a new
 * topic file, or a whole new certification, requires no changes here.
 * Each topic file is expected to export exactly one array of topics
 * (whatever it's named -- p.ts exports pTopics, ing.ts exports ingTopics,
 * etc.), following the existing convention.
 */
const topicModules = import.meta.glob<Record<string, RawStudyTopic[]>>('./*/topics/*.ts', {
  eager: true,
});

const CERT_PATH_PATTERN = /^\.\/([^/]+)\/topics\/[^/]+\.ts$/;

/**
 * The full study guide across all certifications. This is the SEED SOURCE
 * consumed by `npm run db:seed` -- the running app reads topics from
 * Supabase (see useStudyTopics), not from this module.
 */
export const STUDY_TOPICS: StudyTopic[] = Object.entries(topicModules).flatMap(([path, mod]) => {
  const match = CERT_PATH_PATTERN.exec(path);
  if (!match) {
    throw new Error(`Unexpected topic file path, expected "./<certId>/topics/<name>.ts": ${path}`);
  }
  const [, certId] = match;
  const topics = Object.values(mod).flat();
  return topics.map((topic) => ({ ...topic, certId }));
});
