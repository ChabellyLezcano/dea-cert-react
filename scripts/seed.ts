/**
 * Seeds the `questions`, `glossary_terms`, and `study_topics` tables in
 * Supabase from the static source data in src/quiz/data, src/study/data,
 * and src/guide/data.
 *
 * This is the ONLY place that writes to those tables — the running app only
 * ever reads them (see useQuestionBank / useGlossaryTerms / useStudyTopics).
 * Run this once after applying the migrations, and again whenever you edit
 * the source question/glossary/study guide files.
 *
 * Usage:
 *   npm run db:seed
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env (Project Settings > API in the
 * Supabase dashboard — "service_role", never expose this in the browser).
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { QUESTION_BANK } from '@/quiz/data/bank';
import { glossary } from '@/study/data/glossary';
import { STUDY_TOPICS } from '@/guide/data/bank';
import process from 'process';

const CHUNK_SIZE = 200;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function main() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing environment variables. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env before seeding ' +
        '(the service role key is only needed locally for seeding, never ship it to the browser).',
    );
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  console.log(`Seeding ${QUESTION_BANK.length} questions...`);
  const questionRows = QUESTION_BANK.map((q) => ({
    id: q.id,
    cert_id: q.certId,
    exam: q.exam,
    n: q.n,
    domain: q.d,
    is_multi: q.m === 1,
    question: q.q,
    options: q.o,
    correct_answers: q.a,
    explanation: q.x,
  }));

  for (const batch of chunk(questionRows, CHUNK_SIZE)) {
    const { error } = await supabase.from('questions').upsert(batch, { onConflict: 'id' });
    if (error) throw new Error(`Failed to seed questions: ${error.message}`);
    console.log(`  ...${batch.length} rows upserted`);
  }

  console.log(`Seeding ${glossary.length} glossary terms...`);
  const glossaryRows = glossary.map((term) => ({
    term: term.t,
    cert_id: term.certId,
    domain: term.c,
    definition: term.d,
    code_snippet: term.k ?? null,
    retired: term.r === 1,
  }));

  for (const batch of chunk(glossaryRows, CHUNK_SIZE)) {
    const { error } = await supabase.from('glossary_terms').upsert(batch, { onConflict: 'term' });
    if (error) throw new Error(`Failed to seed glossary terms: ${error.message}`);
    console.log(`  ...${batch.length} rows upserted`);
  }

  console.log(`Seeding ${STUDY_TOPICS.length} study guide topics...`);
  const studyTopicRows = STUDY_TOPICS.map((topic) => ({
    id: topic.id,
    cert_id: topic.certId,
    domain: topic.domain,
    topic_order: topic.order,
    title: topic.title,
    summary: topic.summary,
    content_md: topic.contentMd,
  }));

  for (const batch of chunk(studyTopicRows, CHUNK_SIZE)) {
    const { error } = await supabase.from('study_topics').upsert(batch, { onConflict: 'id' });
    if (error) throw new Error(`Failed to seed study guide topics: ${error.message}`);
    console.log(`  ...${batch.length} rows upserted`);
  }

  console.log('Done. Questions, glossary and study guide are now served from Supabase.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
