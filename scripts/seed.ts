/**
 * Seeds the `questions` table in Supabase from the static source data in
 * src/quiz/data.
 *
 * This is the ONLY place that writes to that table -- the running app only
 * ever reads it (see useQuestionBank). Run this once after applying the
 * migrations, and again whenever you edit the source question files.
 *
 * Note: `glossary_terms` and `study_topics` are no longer seeded here --
 * the frontend modules that read glossary_terms were removed, and
 * study_topics is now only written to via its own workflow (it's read by
 * the generate-ai-questions edge function, but this script no longer owns
 * it).
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
  // Only the columns the local .ts source actually authors (English
  // question/options, Spanish explanation) are included in the upsert
  // payload -- Supabase upsert only touches columns present in the
  // payload, so question_es/options_es/explanation_en (written by
  // `npm run translate-questions`) survive every reseed untouched.
  const questionRows = QUESTION_BANK.map((q) => ({
    id: q.id,
    cert_id: q.certId,
    exam: q.exam,
    n: q.n,
    domain: q.d,
    is_multi: q.m === 1,
    question_en: q.q,
    options_en: q.o,
    correct_answers: q.a,
    explanation_es: q.x,
  }));

  for (const batch of chunk(questionRows, CHUNK_SIZE)) {
    const { error } = await supabase.from('questions').upsert(batch, { onConflict: 'id' });
    if (error) throw new Error(`Failed to seed questions: ${error.message}`);
    console.log(`  ...${batch.length} rows upserted`);
  }

  console.log('Done. Questions are now served from Supabase.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
