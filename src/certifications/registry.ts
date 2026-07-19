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
  /** Short label used in tight UI spots (header wordmark, tab titles),
   * e.g. "DEA", "SAA". Kept as an explicit field rather than derived from
   * `id`, since not every future cert's slug will cleanly map to one. */
  acronym: string;
  provider: string;
  examGuideVersion?: string;
}

export const CERTIFICATIONS: readonly CertificationMeta[] = [
  {
    id: 'databricks-dea',
    name: 'Data Engineer Associate',
    acronym: 'DEA',
    provider: 'Databricks',
    examGuideVersion: '2026-05-04',
  },
  {
    id: 'aws-saa',
    name: 'Solutions Architect Associate',
    acronym: 'SAA',
    provider: 'AWS',
    examGuideVersion: 'SAA-C03',
  },
];

/** Convenience constant for the certification currently loaded end-to-end. */
export const DATABRICKS_DEA_CERT_ID = 'databricks-dea';

/** Looks up a certification's metadata by its route id. Returns undefined
 * for an unknown or missing id -- callers should fall back sensibly (see
 * AppLayout's use of this for the header wordmark). */
export function getCertification(id: string | undefined): CertificationMeta | undefined {
  if (!id) return undefined;
  return CERTIFICATIONS.find((cert) => cert.id === id);
}
