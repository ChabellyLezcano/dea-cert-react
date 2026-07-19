-- supabase/migrations/0006_favorite_ai_questions.sql
-- AI-generated practice questions that a user has chosen to keep.
--
-- Unlike `questions` (the vetted, shared retired-question bank), rows here
-- are per-user and never shared: generation is ephemeral by default (the
-- edge function returns questions straight to the browser, nothing is
-- written here), and a row only exists because the user explicitly
-- pressed "Guardar en favoritas". Deleting a row is how you "quitar" one.
--
-- Deliberately NOT linked to `question_progress`: answers on these
-- questions are tracked in local component state only, so they never
-- affect official per-domain accuracy stats (unverified AI content
-- shouldn't be mixed with the vetted question bank's numbers).
--
-- Run after 0001-0005, or via `supabase db push`.

create table if not exists public.favorite_ai_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  cert_id text not null references public.certifications (id),
  domain text not null,
  is_multi boolean not null default false,
  question text not null,
  options jsonb not null,
  correct_answers integer[] not null,
  explanation text not null,
  -- Which study_topics.id rows grounded this question, for traceability --
  -- lets the UI link back to "verify this against the study guide".
  source_topic_ids text[] not null default '{}',
  generated_by text not null default 'claude',
  created_at timestamptz not null default now(),
  foreign key (cert_id, domain) references public.domains (cert_id, code)
);

create index if not exists favorite_ai_questions_user_id_idx on public.favorite_ai_questions (user_id);
create index if not exists favorite_ai_questions_cert_id_idx on public.favorite_ai_questions (cert_id);

alter table public.favorite_ai_questions enable row level security;

create policy "Users can view their own favorite AI questions"
  on public.favorite_ai_questions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own favorite AI questions"
  on public.favorite_ai_questions for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own favorite AI questions"
  on public.favorite_ai_questions for delete
  using (auth.uid() = user_id);
