import type { RawQuestion } from '@/quiz/quiz.types';

/**
 * Minimal viable question set for AWS SAA, used to validate the multi-cert
 * model end to end. Numbered 101 (not 1) to avoid colliding with
 * Databricks DEA exam 1-11 question ids (E{exam}Q{n} is not yet prefixed
 * by certId -- see the note in src/quiz/data/bank.ts).
 */
export const exam101: RawQuestion[] = [
  {
    n: 1,
    d: 'SEC',
    m: 0,
    q: 'A company wants to ensure that data stored in an Amazon S3 bucket is encrypted at rest without managing encryption keys themselves. Which S3 encryption option should they use?',
    o: [
      'Server-Side Encryption with Amazon S3 managed keys (SSE-S3)',
      'Client-side encryption with a custom key management application',
      'No encryption, relying on bucket policies alone',
      'Server-Side Encryption with customer-provided keys (SSE-C)',
    ],
    a: [0],
    x: 'SSE-S3 cifra los objetos con claves gestionadas por el propio S3, sin que el cliente tenga que crear ni administrar claves. SSE-C requeriria que el cliente aporte y gestione sus propias claves, y el cifrado del lado del cliente exige gestionar claves fuera de AWS.',
  },
  {
    n: 2,
    d: 'SEC',
    m: 0,
    q: 'Which AWS service is used to centrally manage fine-grained permissions for IAM users, groups, and roles across AWS services?',
    o: ['AWS IAM', 'Amazon GuardDuty', 'AWS Shield', 'Amazon Macie'],
    a: [0],
    x: 'IAM (Identity and Access Management) es el servicio para definir y gestionar permisos granulares sobre quien puede hacer que en la cuenta de AWS. GuardDuty es deteccion de amenazas, Shield es proteccion DDoS, y Macie es descubrimiento de datos sensibles.',
  },
];
