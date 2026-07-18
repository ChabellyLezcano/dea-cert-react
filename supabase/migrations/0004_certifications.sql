-- supabase/migrations/0004_certifications.sql
-- Multi-certification support — step 1 (additive, non-breaking).
--
-- Introduces `certifications` and `domains` as first-class tables, then
-- attaches `cert_id` to the existing content tables (questions,
-- glossary_terms, study_topics) so a row always knows which certification
-- it belongs to. The old hardcoded `domain in ('P','ING',...)` CHECK
-- constraints are replaced by a composite FK into `domains`.
--
-- Safe to run on a live DB: cert_id is added nullable, backfilled for the
-- existing Databricks content, and only then set NOT NULL.
--
-- Run after 0001_init.sql, 0002_content.sql and 0003_study_guide.sql, or
-- via `supabase db push` if you use the CLI.

-- 1. Certifications -----------------------------------------------------

create table if not exists public.certifications (
  -- Stable slug id, e.g. "databricks-dea"
  id text primary key,
  name text not null,
  provider text not null,
  exam_guide_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.certifications enable row level security;

create policy "Authenticated users can read certifications"
  on public.certifications for select
  to authenticated
  using (true);

drop trigger if exists certifications_set_updated_at on public.certifications;
create trigger certifications_set_updated_at
  before update on public.certifications
  for each row
  execute function public.set_updated_at();

-- 2. Domains (now scoped per certification, instead of a global enum) ---

create table if not exists public.domains (
  cert_id text not null references public.certifications (id) on delete cascade,
  code text not null,
  name text not null,
  -- Official weight of this domain in the exam, as a percentage
  weight numeric not null,
  -- Display order within its certification (1, 2, 3...)
  domain_order integer not null,
  primary key (cert_id, code)
);

alter table public.domains enable row level security;

create policy "Authenticated users can read domains"
  on public.domains for select
  to authenticated
  using (true);

-- 3. Seed the existing certification and its domains --------------------

insert into public.certifications (id, name, provider, exam_guide_version)
values ('databricks-dea', 'Data Engineer Associate', 'Databricks', '2026-05-04')
on conflict (id) do nothing;

insert into public.domains (cert_id, code, name, weight, domain_order)
values
  ('databricks-dea', 'P',    'Databricks Intelligence Platform',           6,  1),
  ('databricks-dea', 'ING',  'Data Ingestion and Loading',                 21, 2),
  ('databricks-dea', 'TRA',  'Data Transformation and Modeling',           22, 3),
  ('databricks-dea', 'JOBS', 'Lakeflow Jobs',                              16, 4),
  ('databricks-dea', 'CICD', 'Implementing CI/CD',                        10, 5),
  ('databricks-dea', 'TRO',  'Troubleshooting, Monitoring & Optimization', 10, 6),
  ('databricks-dea', 'GOV',  'Governance and Security',                    15, 7)
on conflict (cert_id, code) do nothing;

-- 4. Attach cert_id to existing content tables (nullable first) ---------

alter table public.questions
  add column if not exists cert_id text references public.certifications (id);

alter table public.glossary_terms
  add column if not exists cert_id text references public.certifications (id);

alter table public.study_topics
  add column if not exists cert_id text references public.certifications (id);

-- 5. Backfill: every existing row belongs to the Databricks cert --------

update public.questions set cert_id = 'databricks-dea' where cert_id is null;
update public.glossary_terms set cert_id = 'databricks-dea' where cert_id is null;
update public.study_topics set cert_id = 'databricks-dea' where cert_id is null;

-- 6. Enforce NOT NULL now that every row has a value ---------------------

alter table public.questions alter column cert_id set not null;
alter table public.glossary_terms alter column cert_id set not null;
alter table public.study_topics alter column cert_id set not null;

-- 7. Replace the old hardcoded domain CHECK with a composite FK ---------

alter table public.questions
  drop constraint if exists questions_domain_check;
alter table public.questions
  add constraint questions_domain_fkey
  foreign key (cert_id, domain) references public.domains (cert_id, code);

alter table public.glossary_terms
  drop constraint if exists glossary_terms_domain_check;
alter table public.glossary_terms
  add constraint glossary_terms_domain_fkey
  foreign key (cert_id, domain) references public.domains (cert_id, code);

alter table public.study_topics
  drop constraint if exists study_topics_domain_check;
alter table public.study_topics
  add constraint study_topics_domain_fkey
  foreign key (cert_id, domain) references public.domains (cert_id, code);

-- 8. Helpful indexes for the new access pattern (filter by cert) --------

create index if not exists questions_cert_id_idx on public.questions (cert_id);
create index if not exists glossary_terms_cert_id_idx on public.glossary_terms (cert_id);
create index if not exists study_topics_cert_id_idx on public.study_topics (cert_id);