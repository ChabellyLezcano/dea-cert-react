# Cert Prep — Multi-certification study platform

Personal platform for studying IT certifications: practice questions, a
searchable glossary, and study guides, with progress tracked per
certification and per account. React + TypeScript + Supabase.

**Currently loaded certification:**

- **Databricks Certified Data Engineer Associate** (exam guide version
  May 4, 2026) — 438 practice questions across 9 practice exams and a
  264-term glossary, grouped by the 7 official exam domains.

The data model supports multiple certifications side by side (see
`certifications` / `domains` in `supabase/migrations/`); the UI currently
surfaces only Databricks content while the certification-aware routing and
catalog page are being built out.

## What's included

- **438 practice questions** across 9 practice exams, grouped by the 7 official
  exam domains with their weight — served from a Supabase `questions` table.
- **264-term glossary** of certification concepts, searchable and filterable
  by domain — served from a Supabase `glossary_terms` table.
- **Authentication** (Supabase email/password) so progress is tied to your
  account and available from any device.
- **Light / dark / system theme selector** in the header (and on the
  login/signup screens), persisted per browser and applied without a flash
  of the wrong theme on load.
- **Paginated question list** (20 per page) with search, exam filter and
  status filter (all / pending / wrong / correct).
- **Sidebar** with a live progress bar per domain, always rendered
  immediately (loading/empty states are handled explicitly, not by racing
  script tags).

### Bugs fixed from the original version

1. **Sidebar not loading on first paint.** The original app read the question
   bank from global `window.EXAMx` variables set by separately loaded
   `<script>` tags, so the sidebar could render before the data existed.
   Content now loads through an explicit `isLoading`/`error` state
   (`useQuestionBank`, `useGlossaryTerms`), so the UI always knows exactly
   what it has and shows a spinner instead of an empty shell.
2. **A just-answered question disappearing before you could see if it was
   right.** Answering a question while filtering by "Pending" immediately
   removed it from the list, because the list was re-filtered after every
   answer. The question list now keeps a just-answered question visible
   until you change a filter (see `useQuestionFilter`'s `registerAnswer`),
   so you always get to see the verdict and explanation first.
3. **Exam filter chips out of sync with the data** (the UI only listed exams
   1–6 while 9 exam files existed). The exam filter is now generated from
   whatever exams are actually present in the database.

## Tech stack

- React 19 + TypeScript (strict mode) + Vite
- React Router for client-side routing
- Supabase (`@supabase/supabase-js`) for auth, content and progress storage
- Tailwind CSS v4 for styling, Poppins font, CSS-variable-based theming
  (light/dark)
- Zod for form validation
- Vitest + Testing Library for unit/component tests (80%+ coverage)
- ESLint + Prettier + Husky/lint-staged
- Docker + Nginx for containerized deployment

## Project structure

```
src/
├── app/              # Root component and routing
├── auth/             # Auth context, guard, login/signup pages, schemas
├── quiz/             # Question filtering/progress hooks, quiz UI
│   ├── data/         # Domains (static exam structure) — questions/exams
│   │                 #   here are the SEED SOURCE, not used at runtime
│   ├── hooks/        # useQuestionBank (Supabase), useProgress (Supabase),
│   │                 #   useQuestionFilter
│   └── components/   # Sidebar, Filters, QuestionCard, Pagination...
├── study/            # Glossary UI
│   ├── data/         # examMeta (static) — glossary.ts here is the SEED
│   │                 #   SOURCE, not used at runtime
│   └── hooks/        # useGlossaryTerms (Supabase)
├── shared/           # Reusable UI components, Supabase client, theme, utils
│   └── theme/        # ThemeProvider / useTheme (light/dark/system)
└── types/            # Supabase database types
scripts/
└── seed.ts           # Pushes questions/glossary from src/*/data into Supabase
supabase/
├── config.toml       # Supabase CLI config (linked project ref lives here)
└── migrations/       # SQL: question_progress, questions, glossary_terms,
                       #   study_topics, certifications, domains
```

**Note on `src/quiz/data/exams/*.ts` and `src/study/data/glossary.ts`:** these
are no longer imported by the running app. They're kept as the canonical,
human-editable **seed source** — `npm run db:seed` reads them and upserts
into Supabase. `src/quiz/data/domains.ts` and `src/study/data/examMeta.ts`
stay static and _are_ used at runtime, since exam structure/quick-facts are
fixed reference data rather than editable content.

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

   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npm run db:migrate
   ```

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

   If a project already had `0001`–`0003` applied by hand (e.g. pasted into
   the SQL editor before this CLI setup existed), mark them as already
   applied instead of re-running them, then push the rest:

   ```bash
   npx supabase migration repair --status applied 0001
   npx supabase migration repair --status applied 0002
   npx supabase migration repair --status applied 0003
   npm run db:migrate
   ```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` with the values from step 1. The service role
key is **only** used locally by the seed script — it's never bundled into
the app (nothing prefixed `SUPABASE_SERVICE_ROLE_KEY` reaches Vite's
`import.meta.env`, since Vite only exposes `VITE_`-prefixed variables to the
browser).

### 3. Install, seed, and run

```bash
npm install
npm run db:seed   # pushes the 438 questions + 264 glossary terms into Supabase
npm run dev
```

The app runs at `http://localhost:5173`. Create an account, sign in, and
your progress will be saved to Supabase automatically. Pick a theme with the
selector in the header (or on the login screen) — it's remembered per
browser via `localStorage`.

### Available scripts

| Script                      | Description                                                 |
| --------------------------- | ----------------------------------------------------------- |
| `npm run dev`               | Start the Vite dev server                                   |
| `npm run build`             | Type-check and build for production                         |
| `npm run preview`           | Preview the production build locally                        |
| `npm run db:seed`           | Push questions/glossary from `src/*/data` into Supabase     |
| `npm run db:migrate`        | Apply pending SQL migrations to the linked Supabase project |
| `npm run db:migrate:new`    | Scaffold a new empty migration file                         |
| `npm run db:migrate:diff`   | Diff the linked remote DB against local migrations          |
| `npm run lint`              | Run ESLint                                                  |
| `npm run lint:fix`          | Run ESLint with autofix                                     |
| `npm run format`            | Format the codebase with Prettier                           |
| `npm run format:check`      | Check formatting without writing                            |
| `npm run typecheck`         | Type-check the app                                          |
| `npm run typecheck:scripts` | Type-check `scripts/seed.ts`                                |
| `npm test`                  | Run the unit/component test suite                           |
| `npm run test:coverage`     | Run tests with a coverage report                            |

### Docker

```bash
docker compose build \
  --build-arg VITE_SUPABASE_URL=https://your-project-ref.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=your-anon-public-key
docker compose up
```

The app is served by Nginx on `http://localhost:8080`. Run `npm run db:seed`
separately (outside Docker, with your `.env` filled in) — seeding is a local
one-off data-loading step, not part of the container image.

Note: because this is a static single-page app, the Supabase URL/anon key
are baked in at **build** time (they are public/anon values, safe to ship to
the browser — access is enforced by row-level security, not by hiding the
key). The service role key never goes into the Docker build.

## Editing or extending the content

- To fix or add questions, edit `src/quiz/data/exams/examN.ts`, then run
  `npm run db:seed`. Each question follows the `RawQuestion` shape defined in
  `src/quiz/quiz.types.ts`: `{ n, d, m, q, o, a, x }` → number, domain
  (`P|ING|TRA|JOBS|CICD|TRO|GOV`), multi-answer flag (0/1), question text,
  options, zero-based correct answer indices, and a Spanish explanation.
- To add glossary terms, edit `src/study/data/glossary.ts`, then run
  `npm run db:seed`. Each entry follows `{ t, c, d, k?, r? }` → term, domain,
  definition, optional code snippet, optional "retired from the 2026
  syllabus" flag.
- The seed script **upserts** by `id` (questions) / `term` (glossary), so
  re-running it after an edit updates existing rows instead of duplicating
  them.

---

Personal study tool · not affiliated with Databricks.
