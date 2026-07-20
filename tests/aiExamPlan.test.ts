import { describe, expect, it } from 'vitest';
import { planAiExamBatches, AI_EXAM_BATCH_MAX, AI_EXAM_QUESTION_COUNT } from '../src/quiz/utils/aiExamPlan';
import type { Domain } from '../src/quiz/quiz.types';

const DEA_DOMAINS: Domain[] = [
  { id: 'P', order: 1, name: 'Databricks Intelligence Platform', weight: 6, certId: 'databricks-dea' },
  { id: 'ING', order: 2, name: 'Data Ingestion and Loading', weight: 21, certId: 'databricks-dea' },
  { id: 'TRA', order: 3, name: 'Data Transformation and Modeling', weight: 22, certId: 'databricks-dea' },
  { id: 'JOBS', order: 4, name: 'Lakeflow Jobs', weight: 16, certId: 'databricks-dea' },
  { id: 'CICD', order: 5, name: 'Implementing CI/CD', weight: 10, certId: 'databricks-dea' },
  {
    id: 'TRO',
    order: 6,
    name: 'Troubleshooting, Monitoring & Optimization',
    weight: 10,
    certId: 'databricks-dea',
  },
  { id: 'GOV', order: 7, name: 'Governance and Security', weight: 15, certId: 'databricks-dea' },
];

const SINGLE_DOMAIN: Domain[] = [
  { id: 'SEC', order: 1, name: 'Design Secure Architectures', weight: 30, certId: 'aws-saa' },
];

describe('planAiExamBatches', () => {
  it('allocates exactly the requested total across domains, proportional to weight', () => {
    const batches = planAiExamBatches(DEA_DOMAINS, AI_EXAM_QUESTION_COUNT);
    const totalsByDomain = new Map<string, number>();
    for (const batch of batches) {
      totalsByDomain.set(batch.domain, (totalsByDomain.get(batch.domain) ?? 0) + batch.count);
    }

    const grandTotal = batches.reduce((sum, b) => sum + b.count, 0);
    expect(grandTotal).toBe(AI_EXAM_QUESTION_COUNT);

    // Heavier-weighted domains should get more questions than lighter ones.
    expect(totalsByDomain.get('TRA')!).toBeGreaterThan(totalsByDomain.get('P')!);
    expect(totalsByDomain.get('ING')!).toBeGreaterThan(totalsByDomain.get('CICD')!);

    // Every domain gets at least something out of 45 across 7 domains.
    for (const domain of DEA_DOMAINS) {
      expect(totalsByDomain.get(domain.id) ?? 0).toBeGreaterThan(0);
    }
  });

  it('never produces a batch larger than the edge function cap', () => {
    const batches = planAiExamBatches(DEA_DOMAINS, AI_EXAM_QUESTION_COUNT);
    for (const batch of batches) {
      expect(batch.count).toBeLessThanOrEqual(AI_EXAM_BATCH_MAX);
      expect(batch.count).toBeGreaterThan(0);
    }
  });

  it('splits a single loaded domain into multiple capped batches that still sum to the total', () => {
    const batches = planAiExamBatches(SINGLE_DOMAIN, AI_EXAM_QUESTION_COUNT);
    expect(batches.every((b) => b.domain === 'SEC')).toBe(true);
    expect(batches.every((b) => b.count <= AI_EXAM_BATCH_MAX)).toBe(true);
    expect(batches.reduce((sum, b) => sum + b.count, 0)).toBe(AI_EXAM_QUESTION_COUNT);
    // 45 split into batches of at most 10 needs at least 5 batches.
    expect(batches.length).toBeGreaterThanOrEqual(5);
  });

  it('returns an empty plan for zero domains or a non-positive total', () => {
    expect(planAiExamBatches([], AI_EXAM_QUESTION_COUNT)).toEqual([]);
    expect(planAiExamBatches(DEA_DOMAINS, 0)).toEqual([]);
  });

  it('respects a custom batch cap', () => {
    const batches = planAiExamBatches(SINGLE_DOMAIN, 7, 3);
    expect(batches.every((b) => b.count <= 3)).toBe(true);
    expect(batches.reduce((sum, b) => sum + b.count, 0)).toBe(7);
  });
});
