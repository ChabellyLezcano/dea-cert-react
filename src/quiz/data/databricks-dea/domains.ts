import type { RawDomain } from '@/quiz/quiz.types';

/**
 * Official domains from the Databricks Certified Data Engineer Associate
 * exam guide (May 4, 2026 version), in exam order with their weight.
 */
export const DOMAINS: RawDomain[] = [
  { id: 'P', order: 1, name: 'Databricks Intelligence Platform', weight: 6 },
  { id: 'ING', order: 2, name: 'Data Ingestion and Loading', weight: 21 },
  { id: 'TRA', order: 3, name: 'Data Transformation and Modeling', weight: 22 },
  { id: 'JOBS', order: 4, name: 'Lakeflow Jobs', weight: 16 },
  { id: 'CICD', order: 5, name: 'Implementing CI/CD', weight: 10 },
  { id: 'TRO', order: 6, name: 'Troubleshooting, Monitoring & Optimization', weight: 10 },
  { id: 'GOV', order: 7, name: 'Governance and Security', weight: 15 },
];
