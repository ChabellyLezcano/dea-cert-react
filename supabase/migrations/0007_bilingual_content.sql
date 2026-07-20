-- supabase/migrations/0007_bilingual_content.sql
-- Splits question/option/explanation text into explicit per-language
-- columns, so the app can let a user pick question language and
-- explanation language independently (see src/shared/i18n).
--
-- The existing single-language columns become the English variant for
-- `questions` (the bank was authored in English) and the Spanish variant
-- for `questions.explanation` (explanations were authored in Spanish).
-- `favorite_ai_questions` was always generated in English end to end, so
-- everything backfills into the _en columns there.
--
-- The *_es question/option columns and *_en explanation column start out
-- NULL -- run `npm run translate-questions` after this migration to fill
-- them in via the Groq API. The app falls back to whichever language IS
-- present (see resolveLocaleField), so nothing breaks before that script
-- runs; the language selector just has nothing to switch to yet on the
-- still-untranslated side.
--
-- Run after 0001-0006, or via `supabase db push`.

-- ---------------------------------------------------------------------
-- questions
-- ---------------------------------------------------------------------

alter table public.questions
  add column if not exists question_en text,
  add column if not exists question_es text,
  add column if not exists options_en jsonb,
  add column if not exists options_es jsonb,
  add column if not exists explanation_en text,
  add column if not exists explanation_es text;

update public.questions
set
  question_en = question,
  options_en = options,
  explanation_es = explanation
where question_en is null;

alter table public.questions
  alter column question_en set not null,
  alter column options_en set not null,
  alter column explanation_es set not null;

alter table public.questions
  drop column if exists question,
  drop column if exists options,
  drop column if exists explanation;

-- ---------------------------------------------------------------------
-- favorite_ai_questions
-- ---------------------------------------------------------------------

alter table public.favorite_ai_questions
  add column if not exists question_en text,
  add column if not exists question_es text,
  add column if not exists options_en jsonb,
  add column if not exists options_es jsonb,
  add column if not exists explanation_en text,
  add column if not exists explanation_es text;

update public.favorite_ai_questions
set
  question_en = question,
  options_en = options,
  explanation_en = explanation
where question_en is null;

alter table public.favorite_ai_questions
  alter column question_en set not null,
  alter column options_en set not null,
  alter column explanation_en set not null;

alter table public.favorite_ai_questions
  drop column if exists question,
  drop column if exists options,
  drop column if exists explanation;
