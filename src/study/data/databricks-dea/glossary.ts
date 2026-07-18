import type { GlossaryTerm, RawGlossaryTerm } from '@/study/data/glossary.types';

/**
 * Eagerly import every certification's glossary.ts at build time, e.g.
 * ./databricks-dea/glossary.ts. Adding a new certification's glossary is
 * just adding glossary.ts under its own top-level folder here -- no import
 * list to update in this file.
 */
const glossaryModules = import.meta.glob<{ glossary: RawGlossaryTerm[] }>('./*/glossary.ts', {
  eager: true,
});

const CERT_PATH_PATTERN = /^\.\/([^/]+)\/glossary\.ts$/;

/** All glossary terms across every loaded certification, each stamped with
 * its certId. This is the SEED SOURCE consumed by `npm run db:seed` -- the
 * running app reads terms from Supabase (see useGlossaryTerms), not from
 * this module. */
export const glossary: GlossaryTerm[] = Object.entries(glossaryModules).flatMap(([path, mod]) => {
  const match = CERT_PATH_PATTERN.exec(path);
  if (!match) {
    throw new Error(`Unexpected glossary file path, expected "./<certId>/glossary.ts": ${path}`);
  }
  const [, certId] = match;
  return mod.glossary.map((term) => ({ ...term, certId }));
});
