import type { RawStudyTopic } from '../../../types/guide.types';

export const jobsTopics: RawStudyTopic[] = [
  {
    id: 'JOBS-multi-task-orchestration',
    domain: 'JOBS',
    order: 1,
    title: 'Multi-task Jobs: dependencies, task values, and conditional runs',
    summary: 'Building a DAG of tasks inside a single Job, passing values between them, and branching.',
    contentMd: `
A Databricks **Job** can contain multiple **tasks** wired together as a **DAG** (directed acyclic graph) via "depends on" relationships, instead of one notebook doing everything in a single cell-by-cell script.

## Why multi-task over one big notebook

- **Parallelism**: independent tasks (no dependency between them) run concurrently — reducing total wall-clock time.
- **Isolation & reuse**: each task can be a different notebook, Python script, JAR, dbt project, SQL query, or even another Job — and can be reused across multiple Jobs.
- **Partial retries**: if one task fails, you can retry just that task (and its downstream dependents) instead of rerunning the entire pipeline from scratch (see the Repair Run topic).
- **Clear observability**: the Jobs UI shows a visual DAG with per-task status, duration, and logs.

## Fan-out and fan-in

A single task can have **multiple downstream dependents** (fan-out), and a single task can **depend on multiple upstream tasks** (fan-in):

\`\`\`mermaid
flowchart LR
    T1["Task_1"] --> T2["Task_2"]
    T1 --> T3["Task_3"]
    T1 --> T4["Task_4"]
    T2 --> T5["Task_5\\n(fan-in: waits for\\nT2, T3, AND T4)"]
    T3 --> T5
    T4 --> T5
\`\`\`

To add a **new task that must wait for all three parallel branches to finish** before running, the new task's "depends on" configuration lists **all three** upstream tasks (\`Task_2\`, \`Task_3\`, \`Task_4\`) — a task only starts once *every* task it depends on has satisfied its run-if condition, not just one of them.

## Task values

Tasks can pass small values to downstream tasks **within the same job run** using \`dbutils.jobs.taskValues\`:

\`\`\`python
# In task "extract"
dbutils.jobs.taskValues.set(key="row_count", value=42)

# In a downstream task
count = dbutils.jobs.taskValues.get(taskKey="extract", key="row_count", default=0)
\`\`\`

This is meant for small pieces of metadata (counts, flags, file paths, a computed batch number) passed between tasks — **not** for passing large datasets, which should go through a table or file in storage instead. Task values only exist for the **duration of a single run**; they are not persisted globally across separate runs of the job.

## Conditional execution ("Run if" / If/else tasks)

Each task's **"Run if dependencies"** setting controls when it runs relative to its upstream tasks' outcomes:

- **All succeeded** (default)
- **At least one succeeded**
- **All done** (regardless of success/failure — useful for cleanup/notification tasks)
- **At least one failed** / **All failed**

An explicit **If/else condition task** type can branch the DAG based on a task value or a simple expression, so downstream paths differ depending on upstream results (e.g. route to a streaming path vs. a batch path depending on a flag set by an earlier task).

\`\`\`mermaid
flowchart LR
    E["extract"] --> V{"If/else:\\nrow_count > 0?"}
    V -- "Yes" --> T["transform"]
    V -- "No" --> SK["skip_notify"]
    T --> L["load"]
    L --> N["notify_success\\n(Run if: All succeeded)"]
    E -- "on failure" --> NF["notify_failure\\n(Run if: At least one failed)"]
\`\`\`

## Practice check

> **Scenario:** *Task A finished successfully, Task B failed, and Task C — configured with \`run_if: ALL_DONE\` and depending on both A and B — needs to be evaluated for whether it runs.*
>
> **Reasoning:** \`ALL_DONE\` means "run once every upstream task has finished, regardless of success or failure." Since both A and B have finished (one succeeded, one failed), Task C **does run**. This is different from the default \`ALL_SUCCESS\`, under which Task C would be **skipped** because Task B failed.

> 💡 **Exam tip:** "run a cleanup/notification step whether the pipeline succeeded or failed" is the **"All done"** run-if condition. A very common distractor is picking "All succeeded," which would skip the notification exactly when it's needed most — on failure.
`,
  },
  {
    id: 'JOBS-scheduling-triggers-retries',
    domain: 'JOBS',
    order: 2,
    title: 'Scheduling, triggers, and retry/alerting policies',
    summary:
      'Cron schedules, file-arrival and table-update triggers, and how to make Jobs resilient to transient failures.',
    contentMd: `
## Trigger types

- **Scheduled (cron)**: runs on a defined schedule (e.g. "every day at 03:00"). Supports timezone selection and pause/resume. Databricks Jobs use standard **Quartz cron syntax** under the hood (six fields: seconds, minutes, hours, day-of-month, month, day-of-week), though the UI provides a friendlier scheduling form for common cases.
- **File arrival**: triggers a run automatically when new files show up in a specified cloud storage location — useful for event-driven pipelines without a fixed cron cadence, and a good fit when file arrival timing is unpredictable.
- **Table update trigger**: triggers a run automatically whenever a specified Delta table is updated by an upstream process — the correct answer when a scenario says a **reporting job should automatically refresh whenever an upstream ingestion pipeline updates a table**, without polling on a schedule.
- **Continuous**: the Job restarts itself immediately after each run completes, effectively running non-stop — typically used for streaming workloads that should always be active.
- **Manual / API-triggered**: run on demand from the UI, REST API, or CLI — e.g. triggered by an external orchestrator that isn't Databricks Jobs itself.

## Why runs can start late

If scheduled runs are **delayed during peak hours**, the most common cause is **concurrency limits** — either the job's own **"Maximum concurrent runs"** setting (if a previous run of the *same* job is still in progress, a new scheduled run queues rather than starting immediately) or workspace-level compute/quota limits during a busy period. The fix depends on the cause: raise "Maximum concurrent runs" if overlapping runs are acceptable, or address the underlying compute contention (e.g. dedicated job clusters instead of a shared pool) if they aren't.

## Retries

Each task can define a **retry policy**: number of retries and the delay between them (with optional exponential backoff). Retries help absorb **transient** failures — a brief cloud storage throttle, a temporary network blip — without needing a human to intervene.

- Retries apply **per task**, not to the whole Job — only the failed task (and anything depending on it) needs to rerun.
- Retries are not a substitute for fixing a **deterministic** bug (e.g. a syntax error, a missing configuration file) — those fail the same way on every retry, and the fix is to correct the underlying issue and use **Repair Run** (see the dedicated topic) rather than relying on automatic retries.

## Timeouts

A **timeout** kills a task/Job that's still running after N minutes — protects against a stuck task consuming compute (and budget) indefinitely, e.g. a query stuck waiting on a lock, or a runaway loop.

## Alerting

Jobs can send notifications (email, or via webhooks to Slack/PagerDuty/etc.) on:

- **Start**
- **Success**
- **Failure**
- **Duration threshold exceeded** (e.g. alert if a normally-5-minute job is still running after 30 — useful for catching a "silently hanging" run that hasn't technically failed or timed out yet)

For **"a long-running multi-task Job — team members need to be notified when the run completes"** (regardless of outcome), the answer is configuring a notification on the **job's completion** (success or failure), typically via email/webhook notification settings at the job level, rather than a per-task setting only covering one outcome.

### Job-level vs. task-level notifications

Notifications can be scoped at two levels, and the exam tests picking the right one:

- **Job-level notifications** fire based on the **overall run's** outcome (start/success/failure of the whole job) — the right scope for "notify when the entire pipeline finishes" or "alert on any failure anywhere in the job."
- **Task-level notifications** fire based on **one specific task's** outcome only — the right scope when only a single critical task's failure should page someone, without generating noise for failures elsewhere in the same job. For example, alerting only if a final compliance-critical "generate audit log" task fails, while ignoring failures in earlier, less critical tasks, requires a notification configured **on that one task**, not on the job as a whole (a job-level notification would fire for *any* task's failure, over-alerting).

Configuring the same event (e.g. "Failure") on **every** task and filtering the noise afterward inside Slack/email is not the intended approach — scoping the notification correctly (job-level vs. the one relevant task) is the native way to avoid alert noise in the first place.

## Putting it together

A resilient production Job typically combines: a **cron, file-arrival, or table-update trigger**, **per-task retries** with backoff for transient errors, a **timeout** as a safety net, and **failure alerting** so a human finds out promptly when retries are exhausted.

\`\`\`mermaid
flowchart TD
    T["Trigger fires\\n(cron / file arrival /\\ntable update / manual)"] --> R["Task runs"]
    R --> S{"Succeeded?"}
    S -- "Yes" --> Done["Mark task success"]
    S -- "No" --> RT{"Retries left?"}
    RT -- "Yes" --> W["Wait (backoff)"] --> R
    RT -- "No" --> F["Mark task failed"] --> A["Send failure alert"]
\`\`\`

## Practice check

> **Scenario:** *A team maintains a reporting job that should automatically refresh whenever a Delta table is updated by an upstream ingestion pipeline, so downstream reports never rely on stale data — without polling on a fixed schedule.*
>
> **Reasoning:** this is the signature description of a **table update trigger** — the job fires reactively when the specific upstream table changes, rather than on a cron schedule that might run too early (table not yet updated) or too late (stale data served in the meantime).

> 💡 **Exam tip:** "the pipeline occasionally fails due to a brief network issue and self-recovers on a manual rerun" points to **adding automatic retries with backoff** — not to redesigning the pipeline logic. "Scheduled runs start late during busy periods" points to **concurrency/compute contention**, not to the trigger type being wrong.
`,
  },
  {
    id: 'JOBS-task-types-parameters',
    domain: 'JOBS',
    order: 3,
    title: 'Task types, job/task parameters, and the For Each task',
    summary:
      'What each task type is for, how parameters flow into tasks, and running the same logic across a list of inputs.',
    contentMd: `
## Task types

Databricks Jobs supports several task types, each suited to a different kind of unit of work:

| Task type | Use case |
| --- | --- |
| **Notebook** | Run a Databricks notebook (most common task type) |
| **Python script** | Run a standalone \`.py\` file (not a notebook) |
| **Python wheel** | Run an installed Python package's entry point — common for packaged, tested application code |
| **SQL** | Run a SQL query, a SQL file, or refresh a Databricks SQL dashboard/alert |
| **Lakeflow Declarative Pipeline** | Trigger a run of an existing declarative pipeline as one task in a larger Job |
| **dbt** | Run a dbt project's models as a task |
| **Run Job** | Trigger an entirely separate Job as a task — lets you compose smaller, independently-owned Jobs into a larger workflow |
| **Condition (If/else)** | Branch the DAG based on a task value or expression, with no compute cost of its own |
| **For Each** | Repeat a nested task once per item in a list/array, in parallel (with a configurable concurrency limit) |

A JAR task and a "Run Job" task both exist, but there is **no generic "shell script" task type** for arbitrary shell commands as a first-class Jobs task — if a question lists task types and includes something like a raw "Bash script" option as a standalone task type, that's the distractor to rule out (shell commands are instead typically run *from within* a notebook or script task).

## Job-level vs. task-level parameters

Parameters can be defined at the **job level** and referenced from any task using \`{{job.parameters.<name>}}\`, so a value only needs to be set/changed in one place instead of being duplicated across every task that needs it:

\`\`\`text
Job parameter: processing_region = "eu-west-1"

Notebook task base parameter: region = {{job.parameters.processing_region}}
\`\`\`

For **"configure the parameter \`processing_region\` once for the entire job rather than separately on each notebook task,"** the answer is a **job-level parameter**, referenced by each task rather than hardcoded or repeated per task.

## The For Each task

When the **same notebook logic must run separately for multiple inputs** — e.g. once per region, once per country, once per table in a list — the **For Each** task type runs a nested task **once per item** in a supplied list, in parallel up to a configured concurrency limit, instead of manually duplicating the same task N times in the UI.

\`\`\`text
For Each task, over: ["us-east", "us-west", "eu-central"]
  → nested task: process_region  (parameter: region = {{input}})
\`\`\`

This directly replaces the anti-pattern of **"a junior engineer creates 15 nearly-identical notebook tasks, each running the same validation logic on a different table"** — the correct redesign is a single **For Each** task iterating over the list of 15 table names, both reducing DAG clutter and making it trivial to add a 16th table later (add one list item, not one whole task).

\`\`\`mermaid
flowchart LR
    List["List: [table_a, table_b, ... table_o]"] --> FE["For Each task\\n(concurrency: 5)"]
    FE --> N1["validate(table_a)"]
    FE --> N2["validate(table_b)"]
    FE --> N3["validate(...)"]
\`\`\`

## Practice check

> **Scenario:** *A junior data engineer creates a Databricks Job with 15 notebook tasks, each performing the same data validation logic on 15 different tables, and wants a simpler way to maintain this as the list of tables grows.*
>
> **Reasoning:** replace the 15 duplicated tasks with a single **For Each** task whose nested task contains the validation logic once, iterating over a list of the 15 (soon to be more) table names — adding a new table becomes a one-line list change instead of a new task to configure.

> 💡 **Exam tip:** "the same logic, run separately across a list of inputs" → **For Each task**. "A value needed by several tasks across the whole job" → **job-level parameter**, referenced with \`{{job.parameters.name}}\` rather than duplicated.
`,
  },
  {
    id: 'JOBS-repair-run-partial-failure',
    domain: 'JOBS',
    order: 4,
    title: 'Handling partial failures: Repair Run',
    summary:
      'Re-running only what failed (and its downstream dependents) instead of the entire job from scratch.',
    contentMd: `
## The problem with rerunning everything

A large Job fails at task 12 of 15 because of a missing configuration file. Tasks 1 through 11 already completed successfully and produced correct output. Simply clicking "Run now" again would **re-execute every task from the beginning**, including the 11 that already succeeded — wasting compute time and money, and in some cases risking side effects if a task isn't purely idempotent (e.g. appending duplicate rows).

## Repair Run

**Repair Run** re-executes **only the failed task(s) and any tasks downstream of them** in the DAG — every task that already completed successfully, and that nothing failed depends on, is **left untouched**, using its previous successful output.

\`\`\`mermaid
flowchart LR
    T1["Task 1 ✅"] --> T2["Task 2 ✅"] --> T3["...Task 11 ✅"] --> T12["Task 12 ❌"] --> T13["Task 13\\n(not yet run)"] --> T14["Task 14"] --> T15["Task 15"]
\`\`\`

After fixing the missing configuration issue, a **Repair Run** re-executes **Task 12 through Task 15** only — Tasks 1–11 are **not** re-executed, since they already succeeded and nothing about fixing Task 12's problem invalidates their output.

## When Repair Run is (and isn't) the right tool

- **Right tool**: a deterministic bug (missing file, bad config, a code error) caused a failure partway through a long DAG, and upstream tasks' output is still valid and doesn't need to be recomputed.
- **Not sufficient alone**: if the failure was caused by a **transient** issue that resolves itself (a brief network blip), automatic **retries** (see the Scheduling topic) are the more appropriate first line of defense — Repair Run is a manual action a human triggers after diagnosing and fixing the actual cause.

## Practice check

> **Scenario:** *A large Databricks job fails at task 12 of 15 due to a missing configuration file. After resolving the issue, what is the most appropriate action to resume the job — given that tasks 1 through 11 already completed successfully?*
>
> **Reasoning:** use **Repair Run** to re-execute only task 12 and its downstream tasks (13, 14, 15). Re-triggering the whole job from scratch would unnecessarily redo the 11 tasks that already succeeded, wasting compute and time without changing their (already-correct) output.

> 💡 **Exam tip:** "a job partially failed, some tasks already succeeded, how do we resume efficiently" is the signature phrase for **Repair Run** — not "run now" (which restarts everything) and not "retries" (which are automatic and configured in advance, not a manual recovery action taken after diagnosing a fix).
`,
  },
];
