# Cert Prep — Multi-certification study platform

Personal platform for studying IT certifications: practice questions, a
searchable glossary, and study guides, with progress tracked per
certification and per account. React + TypeScript + Supabase.

**Currently loaded certifications:**

- **Databricks Certified Data Engineer Associate** (exam guide version
  May 4, 2026) — 528 practice questions across 11 practice exams, a
  264-term glossary, and 39 study guide topics, grouped by the 7 official
  exam domains.
- **AWS Certified Solutions Architect – Associate** (SAA-C03) — minimal
  viable content (2 practice questions, 3 glossary terms, 1 study guide
  topic, 1 of the 4 official domains) added to validate that the platform
  genuinely supports more than one certification, not just Databricks with
  extra steps.

The data model, the seed pipeline, the routing (`/certifications/:certId/...`),
and the `/certifications` catalog page are all certification-agnostic —
adding a third certification is "add a folder of content data", not "write
new engine code". See **Adding a new certification** below.

## What's included

- **Practice questions** grouped by official exam domains with their weight
  — served from a Supabase `questions` table, filtered by certification.
- **Glossary** of certification concepts, searchable and filterable by
  domain — served from a Supabase `glossary_terms` table.
- **Study guide**: longer-form notes per topic, with Markdown rendering
  (including Mermaid diagrams) — served from a Supabase `study_topics`
  table.
- **Certification catalog** (`/certifications`) listing every loaded
  certification as a card; picking one takes you into its own scoped
  practice/study-guide/glossary sections.
- **Authentication** (Supabase email/password) so progress is tied to your
  account and available from any device.
- **Light / dark / system theme selector**, persisted per browser and
  applied without a flash of the wrong theme on load.
- **Paginated question list** (20 per page) with search, exam filter and
  status filter (all / pending / wrong / correct).
- **Sidebar** with a live progress bar per domain, always rendered
  immediately (loading/empty states are handled explicitly).

## Tech stack

- React 19 + TypeScript (strict mode) + Vite
- React Router for client-side, certification-scoped routing
- Supabase (`@supabase/supabase-js`) for auth, content and progress storage
- Tailwind CSS v4 for styling, Poppins font, CSS-variable-based theming
  (light/dark)
- Zod for form validation
- Vitest + Testing Library for unit/component tests (80%+ coverage)
- ESLint + Prettier + Husky/lint-staged
- Docker + Nginx for containerized deployment

## Project structure

\`\`\`
src/
├── app/ # Root component and routing (/certifications/:certId/...)
├── auth/ # Auth context, guard, login/signup pages, schemas
├── certifications/ # Certification registry + /certifications catalog page
├── quiz/ # Question filtering/progress hooks, quiz UI
│ ├── data/
│ │ ├── bank.ts # Aggregator: discovers every <certId>/exams/examN.ts
│ │ ├── domains.ts # Aggregator: discovers every <certId>/domains.ts
│ │ ├── databricks-dea/
│ │ │ ├── domains.ts
│ │ │ └── exams/ # SEED SOURCE, not used at runtime
│ │ └── aws-saa/
│ │ ├── domains.ts
│ │ └── exams/
│ ├── hooks/ # useQuestionBank (Supabase), useProgress, useQuestionFilter
│ └── components/ # Sidebar, Filters, QuestionCard, Pagination...
├── study/ # Glossary UI
│ ├── data/
│ │ ├── glossary.ts # Aggregator: discovers every <certId>/glossary.ts
│ │ ├── examMeta.ts # Aggregator: discovers every <certId>/examMeta.ts
│ │ ├── databricks-dea/
│ │ └── aws-saa/
│ └── hooks/ # useGlossaryTerms (Supabase)
├── guide/ # Study guide UI
│ ├── data/
│ │ ├── bank.ts # Aggregator: discovers every <certId>/topics/\*.ts
│ │ ├── databricks-dea/topics/
│ │ └── aws-saa/topics/
│ └── hooks/ # useStudyTopics (Supabase)
├── shared/ # Reusable UI components, Supabase client, theme, utils
│ └── theme/ # ThemeProvider / useTheme (light/dark/system)
└── types/ # Supabase database types
scripts/
└── seed.ts # Pushes questions/glossary/topics from src/\*/data into Supabase
supabase/
├── config.toml # Supabase CLI config (linked project ref lives here)
└── migrations/ # SQL: question_progress, questions, glossary_terms,

# study_topics, certifications, domains, aws-saa seed

\`\`\`

**Path alias:** the whole codebase uses `@/*` → `src/*` (configured in
`vite.config.ts` `resolve.alias` **and** `tsconfig.app.json` /
`tsconfig.scripts.json` `compilerOptions.paths` — both are needed, Vite and
`tsc` resolve aliases independently). Always import via `@/...` rather than
relative `../../../` paths; it's what makes moving content between
certification folders a non-event.

**Note on the per-certification `data/` folders:** none of the files inside
`src/*/data/<certId>/` are imported directly by the running app. They're the
canonical, human-editable **seed source** — `npm run db:seed` reads them
(via the aggregators in `bank.ts` / `domains.ts` / `glossary.ts` /
`examMeta.ts`) and upserts into Supabase. The app itself always reads from
Supabase at runtime (`useQuestionBank`, `useGlossaryTerms`, `useStudyTopics`).

## Adding a new certification

Thanks to the aggregator pattern, this is almost entirely a data-authoring
task:

1. **Register it**: add an entry to `CERTIFICATIONS` in
   `src/certifications/registry.ts` (`id`, `name`, `provider`,
   `examGuideVersion`).
2. **Supabase**: add a migration (`npm run db:migrate:new`) that inserts a
   row into `certifications` and one row per domain into `domains` for the
   new `cert_id` — see `supabase/migrations/0005_aws_saa.sql` for the
   pattern. Without this, seeding will fail with a foreign-key violation.
3. **Domains**: create `src/quiz/data/<certId>/domains.ts` exporting
   `DOMAINS: RawDomain[]` (`{ id, order, name, weight }`, no `certId` — the
   aggregator stamps it from the folder name).
4. **Questions**: create `src/quiz/data/<certId>/exams/examN.ts` files, each
   exporting `examN: RawQuestion[]` (`{ n, d, m, q, o, a, x }`). **Pick exam
   numbers that don't collide with another certification's** — question ids
   are `E{exam}Q{n}`, not yet prefixed by `certId` (see the note in
   `src/quiz/data/bank.ts`); AWS SAA uses exam number 101 for exactly this
   reason. Fixing this properly (prefixed ids, or a composite Supabase
   primary key) is tracked as follow-up work.
5. **Glossary**: create `src/study/data/<certId>/glossary.ts` exporting
   `glossary: RawGlossaryTerm[]` (`{ t, c, d, k?, r? }`).
6. **Exam facts**: create `src/study/data/<certId>/examMeta.ts` exporting
   `examMeta: ExamMeta` (`{ cert, version, facts, resources }`).
7. **Study guide** (optional): create
   `src/guide/data/<certId>/topics/*.ts` files, each exporting one array of
   `RawStudyTopic` (`{ id, domain, order, title, summary, contentMd }`) —
   any export name works, the aggregator takes every array a file exports.
8. Run `npm run db:migrate && npm run db:seed`, then `npm test && npm run build`.

No changes are needed to `bank.ts`, `domains.ts` (aggregator), `glossary.ts`
(aggregator), `examMeta.ts` (aggregator), `guide/data/bank.ts`, the routing,
or the catalog page — they all discover certifications dynamically via
`import.meta.glob`.

## Getting started

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In **Project Settings → API**, copy the **Project URL**, the **anon
   public key**, and the **service_role key**.
3. In **Authentication → Providers**, make sure "Email" is enabled. For local
   development you may want to disable "Confirm email" so you can sign up
   and sign in immediately.
4. Link the local repo to your project (one-time step) and push the
   migrations:

   \`\`\`bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npm run db:migrate
   \`\`\`

   `<your-project-ref>` is the id in your project's dashboard URL
   (`https://supabase.com/dashboard/project/<project-ref>`). This applies
   every file under `supabase/migrations/` in order:
   - `0001_init.sql` — `question_progress` (per-user answers) with row-level
     security.
   - `0002_content.sql` — `questions` and `glossary_terms` (shared,
     read-only content), linked to `question_progress`.
   - `0003_study_guide.sql` — `study_topics` (long-form notes per domain).
   - `0004_certifications.sql` — `certifications` and `domains` as
     first-class tables, so content isn't tied to a single certification.
   - `0005_aws_saa.sql` — seeds the `certifications`/`domains` rows for
     AWS SAA.

   If a project already had earlier migrations applied by hand (e.g. pasted
   into the SQL editor before this CLI setup existed), mark them as already
   applied instead of re-running them, then push the rest:

   \`\`\`bash
   npx supabase migration repair --status applied 0001
   npx supabase migration repair --status applied 0002
   npx supabase migration repair --status applied 0003
   npm run db:migrate
   \`\`\`

### 2. Configure environment variables

\`\`\`bash
cp .env.example .env
\`\`\`

Fill in `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` with the values from step 1. The service role
key is **only** used locally by the seed script — it's never bundled into
the app (nothing prefixed `SUPABASE_SERVICE_ROLE_KEY` reaches Vite's
`import.meta.env`, since Vite only exposes `VITE_`-prefixed variables to the
browser).

### 3. Install, seed, and run

\`\`\`bash
npm install
npm run db:seed # pushes every loaded certification's content into Supabase
npm run dev
\`\`\`

The app runs at `http://localhost:5173`. Create an account, sign in, and
your progress will be saved to Supabase automatically. You'll land on
`/certifications` — pick a certification to start.

### Available scripts

| Script                      | Description                                                        |
| --------------------------- | ------------------------------------------------------------------ |
| `npm run dev`               | Start the Vite dev server                                          |
| `npm run build`             | Type-check and build for production                                |
| `npm run preview`           | Preview the production build locally                               |
| `npm run db:seed`           | Push every certification's content from `src/*/data` into Supabase |
| `npm run db:migrate`        | Apply pending SQL migrations to the linked Supabase project        |
| `npm run db:migrate:new`    | Scaffold a new empty migration file                                |
| `npm run db:migrate:diff`   | Diff the linked remote DB against local migrations                 |
| `npm run lint`              | Run ESLint                                                         |
| `npm run lint:fix`          | Run ESLint with autofix                                            |
| `npm run format`            | Format the codebase with Prettier                                  |
| `npm run format:check`      | Check formatting without writing                                   |
| `npm run typecheck`         | Type-check the app                                                 |
| `npm run typecheck:scripts` | Type-check `scripts/seed.ts`                                       |
| `npm test`                  | Run the unit/component test suite                                  |
| `npm run test:coverage`     | Run tests with a coverage report                                   |

### Docker

\`\`\`bash
docker compose build \
--build-arg VITE_SUPABASE_URL=https://your-project-ref.supabase.co \
--build-arg VITE_SUPABASE_ANON_KEY=your-anon-public-key
docker compose up
\`\`\`

The app is served by Nginx on `http://localhost:8080`. Run `npm run db:seed`
separately (outside Docker, with your `.env` filled in) — seeding is a local
one-off data-loading step, not part of the container image.

Note: because this is a static single-page app, the Supabase URL/anon key
are baked in at **build** time (they are public/anon values, safe to ship to
the browser — access is enforced by row-level security, not by hiding the
key). The service role key never goes into the Docker build.

## Editing or extending existing content

- To fix or add questions, edit `src/quiz/data/<certId>/exams/examN.ts`,
  then run `npm run db:seed`. Each question follows the `RawQuestion` shape
  defined in `src/quiz/quiz.types.ts`: `{ n, d, m, q, o, a, x }` → number,
  domain code (must match one of that cert's `domains.ts` entries),
  multi-answer flag (0/1), question text, options, zero-based correct
  answer indices, and an explanation.
- To add glossary terms, edit `src/study/data/<certId>/glossary.ts`, then
  run `npm run db:seed`. Each entry follows `{ t, c, d, k?, r? }` → term,
  domain, definition, optional code snippet, optional "retired" flag.
- The seed script **upserts** by `id` (questions) / `term` (glossary), so
  re-running it after an edit updates existing rows instead of duplicating
  them.

---

Personal study tool · not affiliated with Databricks or AWS.
