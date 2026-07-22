-- supabase/migrations/0008_numeric_question_ids.sql
-- Changes public.questions.id from the old "E{exam}Q{n}" shape (e.g.
-- "E4Q17") to a compact "{exam}{n}" shape with n zero-padded to 2 digits
-- (e.g. "417"), matching the id now computed by src/quiz/data/bank.ts
-- after the Databricks DEA exam-file merge (exam1..exam11 -> exams.ts).
--
-- The padding is what keeps it collision-free: without it, exam 1
-- question 17 ("117") would equal exam 11 question 7 ("11" + "7").
--
-- Safe to run on a live DB:
--   - ids are recomputed from the existing `exam`/`n` columns (the source
--     of truth), never by parsing the old id string.
--   - a uniqueness check runs first and aborts the whole migration if the
--     new ids would collide for any reason, before anything is touched.
--   - question_progress.question_id is a foreign key into questions.id;
--     it's switched to ON UPDATE CASCADE first, so updating the parent id
--     automatically carries every user's saved progress row along with it
--     in the same statement -- no progress is lost or orphaned.
--
-- Run after 0001-0007, or via `supabase db push`. Idempotent: running it
-- again is a no-op (the WHERE clause only touches rows still on the old id).

begin;

-- 1. Let question_progress rows follow their question's id automatically.
alter table public.question_progress
  drop constraint if exists question_progress_question_id_fkey;
alter table public.question_progress
  add constraint question_progress_question_id_fkey
  foreign key (question_id) references public.questions (id)
  on update cascade
  on delete cascade;

-- 2. Sanity check before touching any data: abort if the new scheme would
--    produce duplicate ids (would only happen if `exam`/`n` themselves had
--    unexpected values -- this table already enforces unique(exam, n), so
--    this is a belt-and-braces check, not an expected failure path).
do $$
declare
  dupes integer;
begin
  select count(*) into dupes
  from (
    select exam::text || lpad(n::text, 2, '0') as new_id
    from public.questions
    group by new_id
    having count(*) > 1
  ) d;
  if dupes > 0 then
    raise exception 'Aborting: % duplicate new ids would be produced', dupes;
  end if;
end $$;

-- 3. Recompute ids from exam/n. Old ids always contain letters ("E", "Q"),
--    new ids are pure digits, so the two id spaces never overlap --
--    no risk of a transient collision mid-update even though this is a
--    single non-deferred primary key update.
update public.questions
set id = exam::text || lpad(n::text, 2, '0')
where id <> exam::text || lpad(n::text, 2, '0');

commit;
