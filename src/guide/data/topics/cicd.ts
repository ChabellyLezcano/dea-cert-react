import type { RawStudyTopic } from '../../../types/guide.types';

export const cicdTopics: RawStudyTopic[] = [
  {
    id: 'CICD-databricks-asset-bundles',
    domain: 'CICD',
    order: 1,
    title: 'Databricks Asset Bundles: infrastructure-as-code for Databricks projects',
    summary:
      'Defining Jobs, pipelines, and their target environments as version-controlled YAML — and the full CLI workflow.',
    contentMd: `
**Databricks Asset Bundles** (DABs) let you define Jobs, Lakeflow Declarative Pipelines, notebooks, and their compute/permissions as **YAML files** that live in source control alongside your code — instead of clicking through the UI to configure them. They are also referred to as **Declarative Automation Bundles** in some exam phrasing — the same concept.

## Why bundles instead of UI configuration

- **Version-controlled configuration**: a Job's schedule, cluster spec, and task graph are reviewable in a pull request, just like code.
- **Reproducible environments**: the same bundle can be deployed to \`dev\`, \`staging\`, and \`prod\` targets with different parameters (cluster size, catalog/schema names, notification recipients) instead of manually recreating the Job three times.
- **CI/CD-friendly**: \`databricks bundle deploy\` and \`databricks bundle run\` are plain CLI commands, easy to call from any CI system (GitHub Actions, Azure DevOps, GitLab CI...).

## Anatomy of a bundle

A bundle is rooted in a \`databricks.yml\` file:

\`\`\`yaml
bundle:
  name: orders-pipeline

resources:
  jobs:
    ingest_orders:
      name: "Ingest Orders"
      tasks:
        - task_key: extract
          notebook_task:
            notebook_path: ./src/my_notebook.py
      schedule:
        quartz_cron_expression: "0 0 3 * * ?"
        timezone_id: "UTC"
      permissions:
        - level: CAN_MANAGE
          group_name: data-engineers
        - level: CAN_VIEW
          group_name: analysts

targets:
  dev:
    mode: development
    workspace:
      host: https://dev-workspace.databricks.com
  prod:
    mode: production
    workspace:
      host: https://prod-workspace.databricks.com
    variables:
      cluster_size: "large"
\`\`\`

- **\`resources\`** declares the Jobs/pipelines and their configuration, including **who can view or manage them** via a \`permissions\` block — this is how a bundle can grant a group \`CAN_MANAGE\` or \`CAN_VIEW\` access to a job declaratively, instead of clicking through the Jobs UI's permissions tab by hand.
- **\`targets\`** declares deployment environments — each can override variables, the workspace, and permissions.
- **\`mode: development\`** vs **\`mode: production\`** changes deployment behavior: development mode prefixes resource names with the deploying user's identity and defaults jobs to a paused schedule (so multiple developers testing the same bundle don't collide or trigger unwanted scheduled runs); production mode deploys resources exactly as named, with schedules active.

## The full CLI workflow

| Command | Purpose |
| --- | --- |
| \`databricks bundle init\` | Scaffold a **new** bundle project from a template in the current/target local directory |
| \`databricks bundle validate\` | Check the YAML for errors **before** deploying — the standard first step in any CI pipeline |
| \`databricks bundle deploy -t <target>\` | Deploy (create or update) all resources defined in the bundle to the named target — **idempotent**, safe to re-run |
| \`databricks bundle run -t <target> <resource_key>\` | Trigger an immediate run of a specific deployed job/pipeline by its resource key (e.g. \`sales_job\`) |
| \`databricks bundle summary -t <target>\` | Print the URLs and IDs of the deployed resources for a target |
| \`databricks bundle destroy -t <target>\` | **Tear down** (delete) every resource the bundle deployed to that target |

Deploying a bundle is **idempotent**: rerunning \`deploy\` with the same bundle updates existing resources to match rather than creating duplicates, because the bundle tracks the resources it owns via metadata stored alongside the deployment.

## Variables and per-target overrides

Bundle variables let the **same** resource definition be parameterized differently per environment:

\`\`\`yaml
variables:
  catalog_name:
    default: demo_catalog

resources:
  jobs:
    ingest_orders:
      tasks:
        - task_key: extract
          notebook_task:
            notebook_path: ./src/extract.py
            base_parameters:
              catalog: \${var.catalog_name}

targets:
  dev:
    variables:
      catalog_name: dev_catalog
  prod:
    variables:
      catalog_name: prod_catalog
\`\`\`

If a target doesn't override a variable, the **top-level \`default\`** value is used — this is the mechanism behind "a bundle defines \`catalog_name\` with a default of \`demo_catalog\`; the team wants to set it per target to enable environment-specific catalogs" — each target's \`variables\` block overrides just that one value, without duplicating the entire job definition per environment.

### Variables are resolved at deploy time, not at run time

A subtle but exam-tested behavior: a \`--var\` override only takes effect during \`bundle deploy\` — that's when the variable's value gets baked into the deployed job definition. Running \`bundle run --var="..."\` **afterward** does **not** change an already-deployed resource's configuration:

\`\`\`bash
databricks bundle deploy -t dev --var="schema_name=finance_schema"   # deployed job now uses finance_schema
databricks bundle run -t dev sales_job --var="schema_name=marketing_schema"   # has NO effect on the notebook parameter — the job still uses finance_schema
\`\`\`

If a scenario deploys with one variable value and then runs with a **different** \`--var\` override, the value actually used by the job is whatever was set at **deploy** time — not the one passed to \`run\`.

## Non-interactive and safe production deployments

Two flags matter specifically for automated (CI/CD) deployments:

- **\`--auto-approve\`** — skips interactive confirmation prompts, required for \`bundle deploy\` to run inside a non-interactive CI pipeline with no human available to confirm.
- **\`--fail-on-active-runs\`** — aborts the deployment if any of the bundle's jobs/pipelines currently have an **active run**, preventing a deploy from overwriting the definition of a workload that's actively executing.

## Binding a bundle to an existing, manually-created resource

\`databricks bundle generate job --existing-job-id <id> --bind\` generates the YAML definition for a job that already exists (created previously through the UI), **downloading its referenced artifacts**, and \`--bind\` links the generated resource to that existing job — so future \`bundle deploy\` runs **update** the existing job in place instead of creating a duplicate. This is the standard path for migrating UI-created jobs into bundle-managed, source-controlled configuration.

## Authenticating the CLI

For local development against a workspace using a personal access token, two environment variables configure Databricks Unified Authentication:

- \`DATABRICKS_HOST\` — the workspace URL.
- \`DATABRICKS_TOKEN\` — the PAT itself.

(\`DATABRICKS_CLIENT_ID\`/\`DATABRICKS_CLIENT_SECRET\` are the OAuth equivalent for service-principal-based auth, generally preferred over PATs where available — but the two PAT variables above are the minimum needed for a quick local setup.)

## Aborting on drift

For a **production deployment that must abort if existing jobs/pipelines were modified outside the bundle** (manual UI changes since the last bundle deploy) — protecting against a bundle deploy silently overwriting manual production changes nobody remembered to bring back into source control — the bundle deploy process detects this drift and can be configured to fail the deployment rather than silently overwrite it, prompting a human to reconcile the difference first.

\`\`\`mermaid
flowchart LR
    Git["Git repo\\n(databricks.yml + notebooks)"] -->|"bundle validate"| Val["Syntax/config check"]
    Val -->|"bundle deploy -t dev"| Dev["Dev workspace\\nJobs/Pipelines"]
    Val -->|"bundle deploy -t prod"| Prod["Prod workspace\\nJobs/Pipelines"]
    CI["CI pipeline"] -->|"on merge to main"| Git
    CI -->|"triggers"| Prod
\`\`\`

## Practice check

> **Scenario:** *A data engineer is configuring a job using Databricks Asset Bundles and needs to define which user groups can manage or view the job.*
>
> **Reasoning:** this is a \`permissions\` block nested under the job resource in \`databricks.yml\`, listing each principal (group or user) with a \`level\` (e.g. \`CAN_MANAGE\`, \`CAN_VIEW\`, \`CAN_RUN\`) — declared as code, the same as the job's tasks and schedule, so access control ships and reviews alongside the job definition itself.

> 💡 **Exam tip:** \`bundle validate\` = check only, no deployment. \`bundle deploy\` = create/update resources (idempotent). \`bundle run\` = trigger an already-deployed resource. \`bundle destroy\` = delete everything the bundle owns in that target. Mixing these up is a common source of wrong answers.
`,
  },
  {
    id: 'CICD-pipeline-git-integration',
    domain: 'CICD',
    order: 2,
    title: 'CI/CD pipeline for notebooks and Jobs: Git folders and testing',
    summary:
      'Connecting Databricks to a Git provider, what Git folders can (and can\u2019t) do, and what a CI pipeline checks before deploying.',
    contentMd: `
## Git integration (Databricks Git folders / Repos)

Databricks **Git folders** (formerly called Repos) clone a Git repository directly into the workspace, so notebooks are edited as actual files tracked by Git rather than living only inside Databricks.

### Supported directly inside a Git folder

- **Commit and push** local changes to the connected remote branch.
- **Pull** the latest changes from the remote.
- **Create and switch branches.**
- **View the diff** of local changes before committing.

### Must be done in the Git provider itself (GitHub/GitLab/Azure DevOps/Bitbucket UI), not inside Databricks

- **Opening and reviewing a pull request.**
- **Merging a pull request into another branch** (e.g. merging a feature branch into \`main\`).
- **Resolving merge conflicts** through a formal review/approval process.

This distinction — what Git folders support directly vs. what must happen in the Git provider — is tested directly: if a scenario says *"a data engineer has made changes on a feature branch and now wants to merge these changes into main,"* the answer is that the **merge/pull request itself happens in the Git provider's UI**, not as an in-workspace Git folder action. Git folders are a **working-copy/checkout** tool, not a full replacement for the provider's collaboration workflow.

The standard workflow: create a feature branch, develop/test in a Databricks Git folder checked out to that branch, commit and push from the Git folder, then open and merge the pull request **in the Git provider**. The **source of truth stays in Git** — the workspace is just a checkout, the same way a laptop clone would be.

### Why not just use built-in notebook versioning?

Databricks notebooks have their own lightweight built-in revision history, but it is **workspace-local** — it doesn't integrate with pull requests, code review, branching strategies, or CI pipelines the way a real Git repository does. If a junior engineer relies on built-in notebook versioning "for source control" and a senior engineer recommends **Git folders** instead, the reasoning is exactly this gap: built-in versioning has no branch/PR/CI story, while Git folders connect the same notebooks to a real, team-shared Git workflow.

## A typical CI pipeline for a Databricks project

1. **On pull request**: run linting and **unit tests** for any plain Python/SQL logic that doesn't require a cluster (e.g. transformation functions tested with local Spark or mocked inputs), and \`databricks bundle validate\` against the affected target(s).
2. **Integration tests**: deploy the bundle to an ephemeral or shared **dev/staging** target and run the actual Job/pipeline against test data, asserting on the output table.
3. **On merge to \`main\`**: deploy the bundle to **production** (\`databricks bundle deploy -t prod\`), often gated by a manual approval step for sensitive environments, and verify no untracked drift is being overwritten (see the DABs topic).

\`\`\`mermaid
flowchart TD
    PR["Pull request opened\\n(in Git provider)"] --> Lint["Lint + unit tests\\n+ bundle validate"]
    Lint --> IT["Deploy to staging target\\n+ run integration test"]
    IT --> Rev["Code review + approval\\n(in Git provider)"]
    Rev -->|"merged to main\\n(in Git provider)"| Deploy["bundle deploy -t prod"]
    Deploy --> Run["Job runs on schedule\\nin production"]
\`\`\`

## Testing notebook logic

Because notebooks mix orchestration with logic, a common best practice is to **extract transformation logic into plain Python functions** (in a \`.py\` file, imported by the notebook) so it can be unit-tested with a normal test framework (e.g. \`pytest\`) — without needing a live cluster for every test run. The notebook itself becomes a thin orchestration layer that calls those tested functions.

## Environment parity

Using the **same bundle** (with different \`targets\`) for dev/staging/prod avoids configuration drift — the Job definition, task graph, and cluster spec are structurally identical across environments; only parameters (catalog name, cluster size, schedule) differ (see the DABs variables topic).

## Practice check

> **Scenario:** *A data engineer has made changes to a notebook inside a Databricks Git folder on a feature branch and now wants to merge these changes into the main branch shared by the rest of the team.*
>
> **Reasoning:** the engineer pushes the committed changes from the Git folder to the remote feature branch, then opens and merges a **pull request in the Git provider itself** — merging is not an operation Git folders perform on their own; it's explicitly listed as something that must happen in the Git provider's UI/workflow.

> 💡 **Exam tip:** "unit test transformation logic without spinning up a cluster for every test" points to **extracting logic into testable functions outside the notebook**, run with a standard test framework — not to running the whole notebook as the test. "Merge a pull request" always points to the **Git provider**, never a Git-folder-only action.
`,
  },
];
