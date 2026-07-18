import type { ExamMeta } from '@/study/data/glossary.types';
import { DATABRICKS_DEA_CERT_ID } from '@/certifications/registry';

/**
 * Eagerly import every certification's examMeta.ts at build time, e.g.
 * ./databricks-dea/examMeta.ts. Adding a new certification's exam facts is
 * just adding examMeta.ts under its own top-level folder here.
 */
const examMetaModules = import.meta.glob<{ examMeta: ExamMeta }>('./*/examMeta.ts', {
  eager: true,
});

const CERT_PATH_PATTERN = /^\.\/([^/]+)\/examMeta\.ts$/;

/** Exam quick-facts/resources for every loaded certification, keyed by certId. */
export const EXAM_META_BY_CERT: Record<string, ExamMeta> = Object.fromEntries(
  Object.entries(examMetaModules).map(([path, mod]) => {
    const match = CERT_PATH_PATTERN.exec(path);
    if (!match) {
      throw new Error(`Unexpected examMeta file path, expected "./<certId>/examMeta.ts": ${path}`);
    }
    const [, certId] = match;
    return [certId, mod.examMeta];
  }),
);

/**
 * Convenience default for the certification currently loaded end-to-end in
 * the UI (StudyPage still imports this directly). Once StudyPage becomes
 * cert-aware (reading certId from the URL like QuizPage/GuidePage already
 * do), switch it to `EXAM_META_BY_CERT[certId]` instead.
 */
export const examMeta: ExamMeta = EXAM_META_BY_CERT[DATABRICKS_DEA_CERT_ID];
