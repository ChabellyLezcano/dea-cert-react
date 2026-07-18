import type { Domain, RawDomain } from '@/quiz/quiz.types';

/**
 * Eagerly import every certification's domains.ts at build time, e.g.
 * ./databricks-dea/domains.ts. Adding a new certification's domains is
 * just adding domains.ts under its own top-level folder here -- no import
 * list to update in this file.
 */
const domainModules = import.meta.glob<{ DOMAINS: RawDomain[] }>('./*/domains.ts', {
  eager: true,
});

const CERT_PATH_PATTERN = /^\.\/([^/]+)\/domains\.ts$/;

/** All domains across every loaded certification, each stamped with its certId. */
export const DOMAINS: Domain[] = Object.entries(domainModules).flatMap(([path, mod]) => {
  const match = CERT_PATH_PATTERN.exec(path);
  if (!match) {
    throw new Error(`Unexpected domains file path, expected "./<certId>/domains.ts": ${path}`);
  }
  const [, certId] = match;
  return mod.DOMAINS.map((domain) => ({ ...domain, certId }));
});

/**
 * Lookup by domain code. Assumes domain codes are unique across all loaded
 * certifications -- true today with only Databricks DEA loaded. If a
 * second certification reuses a code (e.g. another "GOV"), switch this to
 * a compound key of certId + code before that happens.
 */
export const DOMAIN_MAP: Record<string, Domain> = Object.fromEntries(
  DOMAINS.map((domain) => [domain.id, domain]),
);
