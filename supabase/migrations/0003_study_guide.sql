-- supabase/migrations/0003_study_guide.sql
-- DEA·26 — study guide table (topic-by-topic notes, separate from the
-- glossary: long-form explanations, exam tips and diagrams per exam domain)
-- Run this in the Supabase SQL editor after 0001_init.sql and
-- 0002_content.sql, or via `supabase db push` if you use the CLI.
-- Populate with `npm run db:seed`.

create table if not exists public.study_topics (
  -- Stable slug id, e.g. "TRA-medallion-architecture"
  id text primary key,
  domain text not null check (domain in ('P', 'ING', 'TRA', 'JOBS', 'CICD', 'TRO', 'GOV')),
  -- Display order within its domain (1, 2, 3...)
  topic_order integer not null,
  title text not null,
  -- Short one-line teaser shown in the topic list
  summary text not null,
  -- Full study notes in Markdown. Supports GitHub-flavored Markdown
  -- (headings, lists, tables, blockquotes used as "exam tip" callouts) and
  -- fenced ```mermaid code blocks, which the app renders as diagrams.
  content_md text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (domain, topic_order)
);

create index if not exists study_topics_domain_idx on public.study_topics (domain);

alter table public.study_topics enable row level security;

-- Same read model as questions/glossary_terms: shared content, readable by
-- any signed-in user, writable only via the seed script (service role key).
create policy "Authenticated users can read study topics"
  on public.study_topics for select
  to authenticated
  using (true);

-- Reuse the same updated_at trigger function created in 0001_init.sql.
drop trigger if exists study_topics_set_updated_at on public.study_topics;
create trigger study_topics_set_updated_at
  before update on public.study_topics
  for each row
  execute function public.set_updated_at();