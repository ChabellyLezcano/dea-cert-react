// src/guide/guide.types.ts
import type { DomainId } from '@/quiz/quiz.types';

/** A study guide topic as authored in the seed data files. */
export interface RawStudyTopic {
  /** Stable slug id, e.g. "TRA-medallion-architecture" */
  id: string;
  domain: DomainId;
  /** Display order within its domain (1, 2, 3...) */
  order: number;
  title: string;
  /** Short one-line teaser shown in the topic list */
  summary: string;
  /** Full study notes in Markdown (GFM). May include fenced ```mermaid
   * code blocks, which are rendered as diagrams instead of code. */
  contentMd: string;
}

/** A topic as returned by Supabase, or by the local aggregator in
 * src/guide/data/bank.ts — same shape as RawStudyTopic plus which
 * certification it belongs to. */
export interface StudyTopic extends RawStudyTopic {
  certId: string;
}
