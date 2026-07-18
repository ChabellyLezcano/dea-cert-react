import type { RawGlossaryTerm } from '@/study/data/glossary.types';

/**
 * Minimal viable glossary for AWS SAA, used to validate the multi-cert
 * model end to end.
 */
export const glossary: RawGlossaryTerm[] = [
  {
    t: 'IAM (Identity and Access Management)',
    c: 'SEC',
    d: 'Servicio de AWS para gestionar de forma centralizada usuarios, grupos, roles y sus permisos sobre recursos de la cuenta, siguiendo el principio de minimo privilegio.',
  },
  {
    t: 'S3 Server-Side Encryption (SSE-S3)',
    c: 'SEC',
    d: 'Cifrado en reposo de objetos en Amazon S3 usando claves gestionadas por el propio servicio S3, sin que el cliente tenga que administrar las claves.',
  },
  {
    t: 'Security Group',
    c: 'SEC',
    d: 'Firewall virtual a nivel de instancia en AWS que controla el trafico entrante y saliente mediante reglas con estado (stateful), a diferencia de las Network ACLs, que son sin estado.',
  },
];
