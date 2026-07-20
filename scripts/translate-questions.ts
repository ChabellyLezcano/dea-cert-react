/**
 * Batch-translates whichever question/option/explanation text is still
 * missing its counterpart language column in Supabase, via the Groq API
 * (same free-tier model the AI question generator uses).
 *
 * Safe to run repeatedly -- it only ever selects rows where the target
 * column is still NULL, so previously-translated rows and anything
 * translated by a subsequent AI generation are left untouched. Run it
 * again any time new rows show up (a codemod-modified reseed, a batch of
 * newly favorited AI questions, etc).
 *
 * Usage:
 *   npm run translate-questions            (dry run: reports counts only)
 *   npm run translate-questions -- --write (actually translates and writes)
 *
 * Requires in .env:
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  (bypasses RLS, needed to write to `questions`)
 *   GROQ_API_KEY               (same key the edge function uses)
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import process from 'process';

const WRITE = process.argv.includes('--write');
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODEL = 'llama-3.3-70b-versatile';
const BATCH_SIZE = 4; // smaller batches -- stay well under the 12k TPM free-tier limit
const MAX_RETRIES = 6;

interface TranslateTextJob {
  kind: 'text';
  table: 'questions' | 'favorite_ai_questions';
  sourceColumn: string;
  targetColumn: string;
  sourceLanguage: string;
  targetLanguage: string;
}

interface TranslateQuestionJob {
  kind: 'question';
  table: 'questions' | 'favorite_ai_questions';
  sourceQuestionColumn: string;
  targetQuestionColumn: string;
  sourceOptionsColumn: string;
  targetOptionsColumn: string;
  sourceLanguage: string;
  targetLanguage: string;
}

type Job = TranslateTextJob | TranslateQuestionJob;

const JOBS: Job[] = [
  // questions bank: authored English question/options, Spanish explanation.
  {
    kind: 'question',
    table: 'questions',
    sourceQuestionColumn: 'question_en',
    targetQuestionColumn: 'question_es',
    sourceOptionsColumn: 'options_en',
    targetOptionsColumn: 'options_es',
    sourceLanguage: 'English',
    targetLanguage: 'Spanish',
  },
  {
    kind: 'text',
    table: 'questions',
    sourceColumn: 'explanation_es',
    targetColumn: 'explanation_en',
    sourceLanguage: 'Spanish',
    targetLanguage: 'English',
  },
  // AI favorites: generated end-to-end in whatever locale the user had
  // selected, backfilled entirely into the *_en columns by migration
  // 0007 -- both question/options and explanation need an ES pass.
  {
    kind: 'question',
    table: 'favorite_ai_questions',
    sourceQuestionColumn: 'question_en',
    targetQuestionColumn: 'question_es',
    sourceOptionsColumn: 'options_en',
    targetOptionsColumn: 'options_es',
    sourceLanguage: 'English',
    targetLanguage: 'Spanish',
  },
  {
    kind: 'text',
    table: 'favorite_ai_questions',
    sourceColumn: 'explanation_en',
    targetColumn: 'explanation_es',
    sourceLanguage: 'English',
    targetLanguage: 'Spanish',
  },
];

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Groq 429 bodies look like:
//   "...Please try again in 37.47s. Need more tokens?..."
// Extract that so we wait exactly as long as Groq asks, plus a small buffer.
function extractRetryAfterMs(message: string): number | null {
  const match = message.match(/try again in ([\d.]+)s/i);
  if (!match) return null;
  const seconds = Number.parseFloat(match[1]);
  if (Number.isNaN(seconds)) return null;
  return Math.ceil(seconds * 1000) + 500; // small buffer so we don't shave it too close
}

function isRateLimitError(err: unknown): err is Error {
  return err instanceof Error && err.message.includes('Groq API error (429)');
}

const TRANSLATION_RULES = `Translate the text field(s) below from {source} to {target}, for a technical certification-exam study app.

CRITICAL RULES:
- Preserve any \`\`\`fenced code block\`\`\` or \`inline code\` byte-for-byte identical, including the backticks themselves -- never translate code, SQL, YAML, CLI commands, function/column/table names, or config keys inside them.
- Preserve numbers, technical acronyms (SQL, ACID, RLS, DAG, JSON...), and proper nouns (product/service names) exactly as written.
- Translate only the surrounding natural-language prose.
- Keep the same tone, register, and level of technical precision as the source -- this is exam content, not casual writing.
- Preserve markdown-style structure (line breaks, punctuation) as closely as the target language allows.`;

async function callGroq(prompt: string): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.2, // translation, not creative generation -- stay faithful to the source
      max_tokens: 8000,
    }),
  });
  if (!response.ok) {
    throw new Error(`Groq API error (${response.status}): ${await response.text()}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

// Wraps callGroq with retry-with-backoff specifically for 429s. Any other
// error (bad JSON, network blip) is rethrown immediately -- only rate
// limits get retried, since those are the only ones we know will resolve
// themselves after waiting.
async function callGroqWithRetry(prompt: string): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await callGroq(prompt);
    } catch (err) {
      lastError = err;
      if (!isRateLimitError(err)) throw err;
      const waitMs = extractRetryAfterMs((err as Error).message) ?? 5000;
      console.log(
        `  rate limited, waiting ${(waitMs / 1000).toFixed(1)}s (attempt ${attempt + 1}/${MAX_RETRIES})...`,
      );
      await sleep(waitMs);
    }
  }
  throw lastError;
}

async function translateTextBatch(
  texts: string[],
  sourceLanguage: string,
  targetLanguage: string,
): Promise<string[]> {
  const rules = TRANSLATION_RULES.replace('{source}', sourceLanguage).replace('{target}', targetLanguage);
  const prompt = `${rules}

Input (JSON array of ${texts.length} strings, translate each independently, preserve order):
${JSON.stringify(texts)}

Respond with a JSON object: {"translations": [${texts.map(() => '"..."').join(', ')}]} -- exactly ${texts.length} strings, same order as the input.`;

  const raw = await callGroqWithRetry(prompt);
  const parsed = JSON.parse(raw.trim());
  const translations = parsed.translations;
  if (!Array.isArray(translations) || translations.length !== texts.length) {
    throw new Error(`Expected ${texts.length} translations, got ${JSON.stringify(parsed).slice(0, 200)}`);
  }
  return translations;
}

interface QuestionPayload {
  q: string;
  o: string[];
}

async function translateQuestionBatch(
  items: QuestionPayload[],
  sourceLanguage: string,
  targetLanguage: string,
): Promise<QuestionPayload[]> {
  const rules = TRANSLATION_RULES.replace('{source}', sourceLanguage).replace('{target}', targetLanguage);
  const prompt = `${rules}

Input (JSON array of ${items.length} question objects, each with "q" (question text) and "o" (answer options) -- translate every field, preserve order and array length):
${JSON.stringify(items, null, 2)}

Respond with a JSON object: {"translations": [{"q": "...", "o": ["...", "..."]}, ...]} -- exactly ${items.length} objects, same order and same "o" array length as the input.`;

  const raw = await callGroqWithRetry(prompt);
  const parsed = JSON.parse(raw.trim());
  const translations = parsed.translations;
  if (!Array.isArray(translations) || translations.length !== items.length) {
    throw new Error(
      `Expected ${items.length} translated questions, got ${JSON.stringify(parsed).slice(0, 200)}`,
    );
  }
  for (let i = 0; i < translations.length; i += 1) {
    if (translations[i].o.length !== items[i].o.length) {
      throw new Error(`Option count mismatch at index ${i}: expected ${items[i].o.length}`);
    }
  }
  return translations;
}

// Writes only the target column(s) for a single row. Using .update().eq()
// per row (instead of a bulk .upsert()) means Postgres only ever sees the
// columns we actually pass -- no NOT NULL violations from an incomplete
// candidate row, since there's no INSERT path involved at all.
async function updateRow(
  supabase: ReturnType<typeof createClient<Database>>,
  table: 'questions' | 'favorite_ai_questions',
  id: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from(table)
    .update(patch as never)
    .eq('id', id);
  if (error) throw error;
}

async function runTextJob(supabase: ReturnType<typeof createClient<Database>>, job: TranslateTextJob) {
  const { data, error } = await supabase
    .from(job.table)
    .select(`id, ${job.sourceColumn}, ${job.targetColumn}`)
    .is(job.targetColumn, null);
  if (error) throw error;

  const rows = (data ?? []) as unknown as { id: string; [key: string]: unknown }[];
  console.log(`[${job.table}.${job.targetColumn}] ${rows.length} row(s) need translation`);
  if (rows.length === 0 || !WRITE) return rows.length;

  for (const batch of chunk(rows, BATCH_SIZE)) {
    const texts = batch.map((r) => String(r[job.sourceColumn]));
    try {
      const translations = await translateTextBatch(texts, job.sourceLanguage, job.targetLanguage);
      for (let i = 0; i < batch.length; i += 1) {
        await updateRow(supabase, job.table, batch[i].id, { [job.targetColumn]: translations[i] });
      }
      console.log(`  ...translated ${batch.length} row(s)`);
    } catch (err) {
      console.error(`  batch failed, skipping (${batch.length} rows):`, err);
    }
  }
  return rows.length;
}

async function runQuestionJob(
  supabase: ReturnType<typeof createClient<Database>>,
  job: TranslateQuestionJob,
) {
  const { data, error } = await supabase
    .from(job.table)
    .select(`id, ${job.sourceQuestionColumn}, ${job.sourceOptionsColumn}, ${job.targetQuestionColumn}`)
    .is(job.targetQuestionColumn, null);
  if (error) throw error;

  const rows = (data ?? []) as unknown as { id: string; [key: string]: unknown }[];
  console.log(
    `[${job.table}.${job.targetQuestionColumn}/${job.targetOptionsColumn}] ${rows.length} row(s) need translation`,
  );
  if (rows.length === 0 || !WRITE) return rows.length;

  for (const batch of chunk(rows, BATCH_SIZE)) {
    const items: QuestionPayload[] = batch.map((r) => ({
      q: String(r[job.sourceQuestionColumn]),
      o: r[job.sourceOptionsColumn] as string[],
    }));
    try {
      const translations = await translateQuestionBatch(items, job.sourceLanguage, job.targetLanguage);
      for (let i = 0; i < batch.length; i += 1) {
        await updateRow(supabase, job.table, batch[i].id, {
          [job.targetQuestionColumn]: translations[i].q,
          [job.targetOptionsColumn]: translations[i].o,
        });
      }
      console.log(`  ...translated ${batch.length} row(s)`);
    } catch (err) {
      console.error(`  batch failed, skipping (${batch.length} rows):`, err);
    }
  }
  return rows.length;
}

async function main() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.');
  }
  if (!GROQ_API_KEY) {
    throw new Error('Missing GROQ_API_KEY in .env.');
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  console.log(
    WRITE
      ? 'Translating (writing to Supabase)...\n'
      : 'Dry run -- counting only, no API calls or writes. Re-run with --write to actually translate.\n',
  );

  let totalPending = 0;
  for (const job of JOBS) {
    const pending =
      job.kind === 'text' ? await runTextJob(supabase, job) : await runQuestionJob(supabase, job);
    totalPending += pending;
  }

  console.log(`\n${WRITE ? 'Done.' : `${totalPending} row(s) total pending translation.`}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
