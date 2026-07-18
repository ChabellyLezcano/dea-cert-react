import type { RawDomain } from '@/quiz/quiz.types';

/**
 * Official domains from the AWS Certified Solutions Architect - Associate
 * exam guide (SAA-C03). Only Domain 1 is loaded for now (minimal viable
 * content to validate the multi-cert model) -- the other 3 official
 * domains (Design Resilient Architectures 26%, Design High-Performing
 * Architectures 24%, Design Cost-Optimized Architectures 20%) are not
 * loaded yet.
 */
export const DOMAINS: RawDomain[] = [
  { id: 'SEC', order: 1, name: 'Design Secure Architectures', weight: 30 },
];
