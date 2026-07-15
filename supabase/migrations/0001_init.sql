-- DEA·26 — question progress table
-- Run this in the Supabase SQL editor, or via `supabase db push` if you use the CLI.

create table if not exists public.question_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id text not null,
  ok boolean not null default false,
  picked integer[] not null default '{}',
  revealed boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (user_id, question_id)
);

create index if not exists question_progress_user_id_idx on public.question_progress (user_id);

alter table public.question_progress enable row level security;

-- Each user can only ever see, insert, update or delete their own rows.
create policy "Users can view their own progress"
  on public.question_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert their own progress"
  on public.question_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own progress"
  on public.question_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own progress"
  on public.question_progress for delete
  using (auth.uid() = user_id);

-- Keep updated_at fresh on every write, as a safety net for direct SQL edits.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists question_progress_set_updated_at on public.question_progress;
create trigger question_progress_set_updated_at
  before update on public.question_progress
  for each row
  execute function public.set_updated_at();
