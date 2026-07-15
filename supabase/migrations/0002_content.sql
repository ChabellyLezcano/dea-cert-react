-- DEA·26 — content tables (questions + glossary)
-- Run this in the Supabase SQL editor after 0001_init.sql, or via
-- `supabase db push` if you use the CLI. Populate with `npm run db:seed`.

create table if not exists public.questions (
  -- Stable id in the "E{exam}Q{n}" form, matches question_progress.question_id
  id text primary key,
  exam integer not null,
  n integer not null,
  domain text not null check (domain in ('P', 'ING', 'TRA', 'JOBS', 'CICD', 'TRO', 'GOV')),
  is_multi boolean not null default false,
  question text not null,
  options jsonb not null,
  correct_answers integer[] not null,
  explanation text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exam, n)
);

create index if not exists questions_exam_idx on public.questions (exam);
create index if not exists questions_domain_idx on public.questions (domain);

alter table public.questions enable row level security;

-- Content is shared: every signed-in user can read it, nobody can write to
-- it from the client (writes happen only via the seed script using the
-- service role key, which bypasses RLS).
create policy "Authenticated users can read questions"
  on public.questions for select
  to authenticated
  using (true);

create table if not exists public.glossary_terms (
  id bigint generated always as identity primary key,
  term text not null unique,
  domain text not null check (domain in ('P', 'ING', 'TRA', 'JOBS', 'CICD', 'TRO', 'GOV')),
  definition text not null,
  code_snippet text,
  retired boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists glossary_terms_domain_idx on public.glossary_terms (domain);

alter table public.glossary_terms enable row level security;

create policy "Authenticated users can read glossary terms"
  on public.glossary_terms for select
  to authenticated
  using (true);

-- Reuse the same updated_at trigger function created in 0001_init.sql.
drop trigger if exists questions_set_updated_at on public.questions;
create trigger questions_set_updated_at
  before update on public.questions
  for each row
  execute function public.set_updated_at();

drop trigger if exists glossary_terms_set_updated_at on public.glossary_terms;
create trigger glossary_terms_set_updated_at
  before update on public.glossary_terms
  for each row
  execute function public.set_updated_at();

-- Optional referential integrity: a progress row can only point at a real
-- question. Safe to add even before seeding — it's only checked on insert.
alter table public.question_progress
  drop constraint if exists question_progress_question_id_fkey;
alter table public.question_progress
  add constraint question_progress_question_id_fkey
  foreign key (question_id) references public.questions (id) on delete cascade;
