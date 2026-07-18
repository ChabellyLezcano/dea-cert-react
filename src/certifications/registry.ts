// src/certifications/registry.ts
/**
 * Registry of certifications available in this app. This is the single
 * source of truth for certification metadata: seed scripts use it to stamp
 * `certId` on rows, and (once the multi-cert UI lands) the catalog page and
 * cert switcher will read from it too.
 *
 * Mirrors the `certifications` table in Supabase (see
 * supabase/migrations/0004_certifications.sql) -- this is the local,
 * human-editable counterpart used at build/seed time.
 */
export interface CertificationMeta {
  /** Stable slug id, matches certifications.id in Supabase, e.g. "databricks-dea" */
  id: string;
  name: string;
  provider: string;
  examGuideVersion?: string;
}

export const CERTIFICATIONS: readonly CertificationMeta[] = [
  {
    id: 'databricks-dea',
    name: 'Data Engineer Associate',
    provider: 'Databricks',
    examGuideVersion: '2026-05-04',
  },
];

/** Convenience constant for the certification currently loaded end-to-end. */
export const DATABRICKS_DEA_CERT_ID = 'databricks-dea';
