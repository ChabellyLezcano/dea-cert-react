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

    const [{ data: topics, error: topicsError }, { data: sampleQuestions, error: questionsError }] =
      await Promise.all([
        supabase
          .from('study_topics')
          .select('id, title, content_md')
          .eq('cert_id', certId)
          .eq('domain', domain)
          .order('topic_order'),
        supabase
          .from('questions')
          .select('is_multi, question, options, correct_answers, explanation')
          .eq('cert_id', certId)
          .eq('domain', domain)
          .limit(3),
      ]);

    if (topicsError) throw topicsError;
    if (questionsError) throw questionsError;

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
      .slice(0, 12000);

    const exampleQuestions = (sampleQuestions ?? []).map((q) => ({
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
  return `You write practice exam questions for a certification study app, in the exact JSON schema used by the app's real question bank.

STRICT GROUNDING RULE: only use facts present in the study notes below. If the notes don't support a fact, do not include it. Never invent option text, numbers, or behavior not stated in the notes.

Study notes for domain "${domain}":
"""
${notes}
"""

Example questions already in the bank for this domain (match this style, tone, and difficulty -- do not repeat their content):
${JSON.stringify(exampleQuestions, null, 2)}

Generate exactly ${count} NEW multiple-choice questions for this domain. Where the study notes include code, commands, config syntax (PySpark, SQL, YAML, CLI), or similar, prefer writing at least some questions in that style -- e.g. "which code block does X", or options that ARE code/config snippets themselves, matching real certification exams. Wrap any code/config snippet in triple backticks inside the JSON string, using literal "\\n" for line breaks -- e.g. "o": ["\`\`\`\\nCREATE FUNCTION f(x INT)\\nRETURNS INT\\nRETURN x + 1;\\n\`\`\`", "plain text option", ...]. Don't force code into domains/topics where the notes are purely conceptual, and don't fence plain prose.

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
