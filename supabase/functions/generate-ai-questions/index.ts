import { createClient } from 'npm:@supabase/supabase-js@2';

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const MAX_COUNT = 10;
// Free tier via GroqCloud: no billing required, runs on Groq's LPU hardware.
const MODEL = 'llama-3.3-70b-versatile';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not configured on this function.');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing Authorization header.' }, 401);
    }

    const { certId, domain, count } = await req.json();

    if (typeof certId !== 'string' || typeof domain !== 'string') {
      return jsonResponse({ error: 'certId and domain are required.' }, 400);
    }
    const safeCount = Math.max(1, Math.min(Number(count) || 5, MAX_COUNT));

    // Client scoped to the caller's own JWT, so the existing RLS policies
    // ("authenticated users can read study_topics/questions") apply
    // naturally -- no service role key needed for this function.
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const [
      { data: topics, error: topicsError },
      { data: codeExamples, error: codeExamplesError },
      { data: plainExamples, error: plainExamplesError },
    ] = await Promise.all([
      supabase
        .from('study_topics')
        .select('id, title, content_md')
        .eq('cert_id', certId)
        .eq('domain', domain)
        .order('topic_order'),
      // Prioritize examples that already contain a code/config snippet
      // (marked with backticks in the bank), so the few-shot sample
      // actually demonstrates the code-heavy question style we want
      // the model to imitate -- a plain `.limit(3)` with no filter
      // frequently returned zero code examples by luck of ordering.
      supabase
        .from('questions')
        .select('is_multi, question, options, correct_answers, explanation')
        .eq('cert_id', certId)
        .eq('domain', domain)
        .ilike('question', '%`%')
        .limit(3),
      supabase
        .from('questions')
        .select('is_multi, question, options, correct_answers, explanation')
        .eq('cert_id', certId)
        .eq('domain', domain)
        .limit(2),
    ]);

    if (topicsError) throw topicsError;
    if (codeExamplesError) throw codeExamplesError;
    if (plainExamplesError) throw plainExamplesError;

    if (!topics || topics.length === 0) {
      return jsonResponse(
        { error: 'No hay notas de estudio para este dominio todavía, no se puede generar con garantías.' },
        422,
      );
    }

    // Bound the context sent to the model -- study notes can be long, and
    // we only need enough to ground a handful of new questions, not the
    // entire domain verbatim.
    const notes = topics
      .map((t) => `### ${t.title}\n${t.content_md}`)
      .join('\n\n')
      .slice(0, 16000);

    // Merge code-containing examples first (they're the ones worth
    // imitating for style), then top up with plain ones, deduped by
    // question text in case a row matched both queries.
    const seen = new Set<string>();
    const sampleQuestions = [...(codeExamples ?? []), ...(plainExamples ?? [])]
      .filter((row) => {
        if (seen.has(row.question)) return false;
        seen.add(row.question);
        return true;
      })
      .slice(0, 5);

    const exampleQuestions = sampleQuestions.map((q) => ({
      m: q.is_multi ? 1 : 0,
      q: q.question,
      o: q.options,
      a: q.correct_answers,
      x: q.explanation,
    }));

    const prompt = buildPrompt({ domain, count: safeCount, notes, exampleQuestions });

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        // Groq's OpenAI-compatible JSON mode -- the word "json" must
        // appear in the prompt itself for this to take effect, which it
        // does (see buildPrompt below).
        response_format: { type: 'json_object' },
        temperature: 0.7,
        // Code-heavy, scenario-based questions run noticeably longer than
        // one-line trivia -- the default response length was occasionally
        // truncating the JSON mid-question and failing to parse. Scale
        // with count, generous floor for a single complex question.
        max_tokens: Math.min(8000, 1200 + safeCount * 550),
      }),
    });

    if (!groqResponse.ok) {
      const detail = await groqResponse.text();
      throw new Error(`Groq API error (${groqResponse.status}): ${detail}`);
    }

    const groqData = await groqResponse.json();
    const rawText = groqData.choices?.[0]?.message?.content ?? '';

    const parsed = parseGeneratedQuestions(rawText);
    if (parsed.length === 0) {
      return jsonResponse({ error: 'El modelo no devolvió preguntas válidas. Inténtalo de nuevo.' }, 502);
    }

    const topicIds = topics.map((t) => t.id);
    const questions = parsed.map((q) => ({
      id: `AI-${crypto.randomUUID()}`,
      certId,
      domain,
      m: q.m,
      q: q.q,
      o: q.o,
      a: q.a,
      x: q.x,
      sourceTopicIds: topicIds,
    }));

    return jsonResponse({ questions });
  } catch (error) {
    console.error('generate-ai-questions error:', error);
    const message = error instanceof Error ? error.message : 'Unexpected error generating questions.';
    return jsonResponse({ error: message }, 500);
  }
});

function buildPrompt({
  domain,
  count,
  notes,
  exampleQuestions,
}: {
  domain: string;
  count: number;
  notes: string;
  exampleQuestions: unknown[];
}) {
  return `You write practice exam questions for a certification study app, in the exact JSON schema used by the app's real question bank. These sit alongside real official practice-exam questions, so they must be indistinguishable in style, depth, and difficulty from a real certification exam -- not textbook trivia or one-line definitions.

STRICT GROUNDING RULE: only use facts present in the study notes below. If the notes don't support a fact, do not include it. Never invent option text, numbers, or behavior not stated in the notes.

Study notes for domain "${domain}":
"""
${notes}
"""

Example questions already in the bank for this domain (match this style, tone, and difficulty -- do not repeat their content):
${JSON.stringify(exampleQuestions, null, 2)}

REAL EXAM STYLE -- generate exactly ${count} NEW multiple-choice questions that follow this pattern:

1. **Scenario stem, not a bare definition.** Open with 1-3 sentences setting up a concrete situation: a role ("A data engineer..."), a system/pipeline already in place, and a problem or goal. Never open with "What is X?" or "Which of the following describes X?" as the first line -- earn the concept through a scenario first, the way a real cert exam does.

2. **Code is the norm here, not the exception.** At least ${Math.max(1, Math.ceil(count * 0.6))} of the ${count} questions should center on a real code/config/CLI snippet -- either embedded in the stem (e.g. "...runs the following query:" followed by a snippet, then the actual question), or as the answer options themselves (four candidate code blocks, only one correct). Use realistic PySpark, SQL, YAML, or CLI syntax matching what's in the study notes -- real table/column/variable names, not "foo"/"bar" placeholders. Only skip code for topics where the notes are purely conceptual (e.g. architecture, governance policy) -- don't force it there.

3. **Wrap every code/config snippet in triple backticks** inside the JSON string, using literal "\\n" for line breaks -- e.g. "o": ["\`\`\`\\nCREATE FUNCTION f(x INT)\\nRETURNS INT\\nRETURN x + 1;\\n\`\`\`", "plain text option", ...]. Never fence plain prose. Short inline references (a column name, a CLI flag) can use single backticks instead of a full fenced block.

4. **Distractors must be genuinely plausible**, not obviously wrong or eliminable by length/vagueness alone. Each wrong option should reflect a real, common mistake: a nearly-correct syntax variant, a related-but-wrong command/parameter, a plausible-sounding but incorrect behavior, or a common misconception from the notes. Someone who half-understands the concept should be able to talk themselves into a wrong answer.

5. **Test application, not recall.** Prefer: "given this code, what happens when X" / "fill in the blank to achieve Y" / "which option correctly does Z" / "why did this fail" over "what is the definition of X". Multi-step reasoning (a scenario requiring you to combine two concepts from the notes) is encouraged when the notes support it.

6. **Vary structure across the ${count} questions** -- don't generate ${count} questions that are all the same template. Mix: fill-in-the-blank code, "which code block achieves X", "what's wrong with this snippet", scenario + conceptual tradeoff, and multi-select where genuinely more than one option is correct.

Respond with a JSON object with a single key "questions", whose value is an array where each item has this exact shape:
{
  "m": 0 or 1 (1 if more than one option is correct),
  "q": "question text",
  "o": ["option A", "option B", "option C", "option D"],
  "a": [zero-based indices of the correct option(s) in "o"],
  "x": "explanation citing the relevant concept from the notes"
}`;
}

interface ParsedQuestion {
  m: 0 | 1;
  q: string;
  o: string[];
  a: number[];
  x: string;
}

function parseGeneratedQuestions(rawText: string): ParsedQuestion[] {
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawText.trim());
  } catch {
    return [];
  }

  // Groq's JSON mode returns an object (not a bare array), per the
  // "questions" key requested in the prompt -- unwrap it, but also accept
  // a bare array in case the model ignores that instruction.
  const candidate = Array.isArray(parsedJson)
    ? parsedJson
    : (parsedJson as Record<string, unknown>)?.questions;

  if (!Array.isArray(candidate)) return [];

  return candidate.filter((item): item is ParsedQuestion => {
    if (typeof item !== 'object' || item === null) return false;
    const q = item as Record<string, unknown>;
    if (typeof q.q !== 'string' || !q.q.trim()) return false;
    if (!Array.isArray(q.o) || q.o.length < 2 || !q.o.every((opt) => typeof opt === 'string')) return false;
    if (!Array.isArray(q.a) || q.a.length === 0) return false;
    if (!q.a.every((idx) => typeof idx === 'number' && idx >= 0 && idx < (q.o as unknown[]).length))
      return false;
    if (typeof q.x !== 'string' || !q.x.trim()) return false;
    if (q.m !== 0 && q.m !== 1) return false;
    return true;
  });
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  });
}
