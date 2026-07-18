import type { RawStudyTopic } from '@/types/guide.types';

export const troTopics: RawStudyTopic[] = [
  {
    id: 'TRO-spark-ui-diagnostics',
    domain: 'TRO',
    order: 1,
    title: 'Reading the Spark UI: diagnosing slow or failed jobs',
    summary: 'Jobs, stages, tasks, and the signs of skew, spill, and shuffle problems.',
    contentMd: `
The **Spark UI** (and the equivalent view inside a Job run's details) breaks execution down into a hierarchy: **Job → Stages → Tasks**. Reading it top-down is the fastest way to find *where* a slowdown lives, and exam questions frequently describe a specific task-duration or data-size pattern and ask you to name the cause.

## The hierarchy

- A **Job** corresponds to one action (e.g. a \`write\`, a \`collect\`, a \`count\`).
- A Job is split into **Stages**, separated by **shuffle boundaries** (any operation that needs to redistribute data across partitions, like a \`groupBy\`, \`join\`, or repartition).
- Each Stage runs many **Tasks** in parallel, one per data partition.

## Reading task-duration statistics

The Spark UI's stage summary shows **Min / 25th percentile / Median / 75th percentile / Max** duration (and equivalently for bytes read) across all tasks in a stage. A large gap between the **Max** and the **Median/75th percentile** — e.g. "27 tasks: durations range from 10s (min) to 45s (max) with a median of 12s" or "the Max task took about 10x the time and read about 10x the data of a typical task" — is the direct signature of **data skew**: one or a few partitions hold far more data than the rest, so most tasks finish quickly while a handful drag the whole stage out.

## Common symptoms and what they mean

| Symptom in the UI | Likely cause | Typical fix |
| --- | --- | --- |
| One task (or a few) in a stage takes far longer than the rest, reading far more data ("long tail") | **Data skew** — one partition has much more data than others | Salting the skewed key, or letting **AQE**'s skew join optimization handle it (on by default) |
| Stage shows a lot of time in "shuffle read/write" | Expensive shuffle (large \`groupBy\`/\`join\`) | Reduce shuffle partitions, broadcast the smaller side of a join, filter earlier |
| Task metrics show **spill (memory) / spill (disk)** | Not enough executor memory for the partition being processed | Increase executor memory, reduce partition size (more, smaller partitions), or avoid wide operations on huge single partitions |
| Very many small tasks, each finishing almost instantly | **Too many small files** being read | Run \`OPTIMIZE\` (or enable Liquid Clustering) to compact files upstream |
| Very few tasks, each huge | **Too few partitions** for the cluster size — not using all executors | Increase \`spark.sql.shuffle.partitions\` or repartition explicitly |
| Job fails with **"Executor Lost"** repeatedly during cluster startup or mid-run | Executors being killed — often out-of-memory, or spot instance reclamation | Check executor memory sizing first; if using spot instances, consider on-demand for less interruption-tolerant stages |

## Broadcast joins

When joining a large table to a **small** one, forcing (or letting Spark auto-detect) a **broadcast join** sends the small table to every executor, avoiding an expensive shuffle of the large table entirely:

\`\`\`python
from pyspark.sql.functions import broadcast
big.join(broadcast(small), "id")
\`\`\`

Spark auto-broadcasts tables under the \`spark.sql.autoBroadcastJoinThreshold\` configuration (default **10 MB**) — raising this threshold (e.g. to allow tables **up to 100 MB** to auto-broadcast) is the configuration change to make when a scenario wants Spark to automatically broadcast somewhat larger dimension tables without every join needing an explicit \`broadcast()\` hint. The Spark UI's query plan shows \`BroadcastHashJoin\` when this kicks in, vs. \`SortMergeJoin\` for a shuffled join.

## Adaptive Query Execution (AQE)

AQE re-optimizes the query plan **during execution** using actual runtime statistics (not just the pre-run estimate). Enabled by default on current Databricks Runtimes, it can:

- Dynamically **coalesce** many small shuffle partitions into fewer larger ones.
- **Switch a sort-merge join to a broadcast join** if a table turns out smaller than expected at runtime (even if it looked too large in the pre-run estimate).
- **Split skewed partitions** automatically — this is the built-in, no-code-change answer to a skewed join, and is why "salting" is now often unnecessary for straightforward skew cases when AQE is enabled.

\`\`\`mermaid
flowchart TD
    A["Job runs slow"] --> B{"Check Spark UI:\\nStages tab"}
    B --> C{"One stage much\\nslower than others?"}
    C -- "Yes" --> D{"One task in that\\nstage is an outlier\\n(duration/bytes)?"}
    D -- "Yes" --> E["Data skew\\n→ AQE skew join / salting"]
    D -- "No, all tasks slow" --> F["Check shuffle read/write size\\n→ reduce shuffle, broadcast join"]
    C -- "No, many small stages" --> G["Check file count\\n→ OPTIMIZE / Liquid Clustering"]
\`\`\`

## Practice check

> **Scenario:** *In the Spark UI, a stage contains 500 tasks. Most tasks complete in under 20 seconds, but a few tasks handling extremely large partitions take several minutes each, and those same tasks report reading far more bytes than the rest.*
>
> **Reasoning:** this is **data skew** — a small number of partitions hold disproportionately more data. With AQE enabled (the default), Spark's skew join optimization can split those oversized partitions automatically; without it (or for non-join wide transformations), manually salting the skewed key is the fallback fix.

> 💡 **Exam tip:** "one task takes 10x longer than the rest of the tasks in the same stage, and reads roughly 10x the data" is the textbook description of **data skew** — the fix is AQE's skew handling or salting the key, not simply adding more executors (which wouldn't rebalance the skewed partition itself).
`,
  },
  {
    id: 'TRO-performance-tuning',
    domain: 'TRO',
    order: 2,
    title: 'Performance tuning: partitioning, caching, and file management',
    summary:
      'Physical layout decisions (partitioning, Z-Ordering, file size) and when caching actually helps.',
    contentMd: `
## Partitioning (directory-based)

Partitioning a Delta table by a column (e.g. \`date\`) writes data into separate directories per value, so queries filtering on that column can **skip entire directories** instead of scanning everything:

\`\`\`sql
CREATE TABLE events (id BIGINT, event_date DATE, payload STRING)
PARTITIONED BY (event_date);
\`\`\`

**Only partition by low-to-medium cardinality columns** used often in filters (e.g. date, region). Partitioning by a high-cardinality column (e.g. \`user_id\`, a UUID) creates a huge number of tiny directories/files — this is the **small file problem** and hurts performance instead of helping it.

## Z-Ordering (data clustering within files)

For columns that are filtered often but **aren't** good partition columns (too high cardinality, or you need to filter on several different columns interchangeably), \`ZORDER BY\` co-locates similar values together within files, so Delta's file-level statistics (min/max per column per file) can skip more files at query time:

\`\`\`sql
OPTIMIZE catalog.schema.events ZORDER BY (customer_id);
\`\`\`

Partitioning and Z-Ordering are complementary: partition by a coarse, frequently-filtered column (date), Z-Order by a finer one (customer_id) within each partition. (See the Liquid Clustering topic for the modern replacement for this whole manual layout decision.)

## The small file problem

Lots of small files (from frequent small streaming writes, or over-partitioning) hurt performance because:

- Each file has open/read overhead regardless of size.
- More files means more metadata for Delta/Spark to track and plan against.

Fix: run \`OPTIMIZE\` regularly (or enable **auto-optimize** / **auto-compaction** table properties, or use Liquid Clustering) to compact small files into fewer, larger ones — Databricks generally targets roughly 1 GB files by default for \`OPTIMIZE\`.

## Caching

- **Delta cache (disk cache)**: automatically caches remote Parquet files on the local SSDs of cluster nodes after they're first read — speeds up **repeated reads of the same data** within a cluster's lifetime, with no code change needed.
- **\`.cache()\` / \`.persist()\`** (Spark DataFrame cache, in memory): explicitly caches a DataFrame's *computed* result — useful when the **same intermediate DataFrame** is reused multiple times in a session (e.g. referenced in several downstream queries), avoiding recomputation. **Not useful** for a DataFrame that's only used once — the exam tests recognizing when a scenario's DataFrame is used exactly once downstream, in which case \`.cache()\` adds overhead without any benefit.

## Photon

**Photon** is Databricks' native vectorized query engine (written in C++, API-compatible with Spark SQL/DataFrame operations) that can dramatically speed up SQL and DataFrame workloads **without any code changes** — enabled as a runtime/cluster option, not something you write differently in your queries.

\`\`\`mermaid
flowchart TD
    Q["Query performance\\nproblem"] --> W{"What kind?"}
    W -- "Repeated reads of\\nsame remote files" --> DC["Delta (disk) cache\\n— automatic"]
    W -- "Same computed DataFrame\\nreused several times" --> MC["df.cache() / .persist()"]
    W -- "Filters on a coarse,\\nfrequently-used column" --> Part["Partition by that column"]
    W -- "Filters on a high-cardinality\\ncolumn, not partition-friendly" --> Z["ZORDER BY that column"]
    W -- "General SQL/DataFrame speed,\\nno code change wanted" --> Ph["Enable Photon"]
\`\`\`

## Practice check

> **Scenario:** *Queries filter on \`customer_id\`, which has millions of distinct values. The table was partitioned by \`customer_id\`, and this created an enormous number of tiny directories and files, hurting performance.*
>
> **Reasoning:** \`customer_id\` is far too high-cardinality to be a good **partition** column. The fix is to **Z-ORDER BY customer_id** instead (or adopt Liquid Clustering on that column) — Z-Ordering co-locates related values within files without creating a separate directory per distinct value the way partitioning does.

> 💡 **Exam tip:** "millions of distinct values, created too many small files/directories" always signals **partitioning was the wrong choice** for that column — the fix is Z-ORDER or Liquid Clustering, never "partition by it anyway with a workaround."
`,
  },
  {
    id: 'TRO-liquid-clustering-predictive-optimization',
    domain: 'TRO',
    order: 3,
    title: 'Liquid Clustering and Predictive Optimization',
    summary:
      'The modern, automatic replacement for manually choosing partition columns and running OPTIMIZE/ZORDER by hand.',
    contentMd: `
## The problem with manual layout decisions

Choosing partition columns and Z-Order columns by hand requires **predicting query patterns in advance**, and getting it wrong (as in the \`customer_id\`-partitioning example in the Performance Tuning topic) can actively hurt performance rather than help it. Query patterns also **change over time** as new use cases are added, but a table's physical partitioning scheme is expensive to change after the fact (it typically requires rewriting the whole table).

## Liquid Clustering

**Liquid Clustering** is Delta Lake's modern alternative to choosing between partitioning and \`ZORDER BY\` manually. Instead of a fixed physical partition scheme, it maintains a flexible, incrementally-updatable clustering of the data based on one or more chosen clustering keys:

\`\`\`sql
CREATE TABLE catalog.schema.events (
  id BIGINT, event_date DATE, customer_id STRING, payload STRING
)
CLUSTER BY (event_date, customer_id);
\`\`\`

Key benefits tested on the exam:

- **No fixed partition directory structure** — avoids the small-file explosion that high-cardinality partition columns cause, while still supporting efficient file skipping for queries filtering on the clustering keys.
- **Clustering keys can be changed** without rewriting the whole table from scratch, unlike a traditional \`PARTITIONED BY\` scheme.
- **Incremental clustering**: as new data is written, Databricks incrementally re-clusters just the new/affected files rather than requiring a full-table \`OPTIMIZE ZORDER\` pass every time.
- Works well for **high-cardinality columns** (like \`customer_id\`) that would have been a poor choice for traditional partitioning — this is the main reason it's the modern recommended default over manually picking partition + Z-Order columns.

### Automatic Liquid Clustering

Databricks can also **automatically determine clustering keys** for a Unity Catalog-managed table by observing actual query patterns over time (which columns are most often used in filters/joins) — rather than a human guessing up front which columns will be filtered on most. This directly answers "how does Automatic Liquid Clustering determine which columns to use as clustering keys": it's **driven by observed query history**, not a static, manually-declared choice.

## Predictive Optimization

**Predictive optimization** lets Unity Catalog **automatically run maintenance operations** — \`OPTIMIZE\`, \`VACUUM\`, and \`ANALYZE\` (statistics collection) — on tables, on Databricks' own schedule, **without a human scheduling a maintenance job**.

Benefits tested (a common "choose TWO" question):

- ✅ **Removes the operational burden** of scheduling and monitoring maintenance jobs yourself.
- ✅ **Runs maintenance more efficiently** than a fixed cron schedule, since Databricks can decide *when* a table actually needs \`OPTIMIZE\`/\`VACUUM\`/\`ANALYZE\` based on its actual write pattern, rather than running it on every table on the same blind schedule regardless of need.
- ❌ It does **not** change query results or table schema — it's purely a maintenance/performance mechanism, not a data transformation feature.

### Two scope limits worth remembering

- **Managed tables only.** Predictive Optimization only acts on Unity Catalog **managed** tables — Databricks doesn't own the storage lifecycle of an **external** table, so it never runs automatic maintenance against one. If a team enables Predictive Optimization and notices some tables are optimized automatically while others (the external ones) are not, this is why — not a partitioning or Liquid Clustering requirement.
- **Doesn't include \`ZORDER\`.** The automatic \`OPTIMIZE\` runs performed by Predictive Optimization do **not** apply a \`ZORDER BY\` — if a table relies on Z-Ordering for file skipping, that still needs to be run explicitly (or the table should move to Liquid Clustering, which Predictive Optimization *does* maintain incrementally).

\`\`\`mermaid
flowchart LR
    W["Ongoing writes"] --> T["Managed Delta table\\n(Liquid Clustering enabled)"]
    T -->|"observed query patterns"| ALC["Automatic Liquid Clustering\\nchooses/adjusts keys"]
    T -->|"Unity Catalog monitors\\nwrite pattern"| PO["Predictive Optimization\\nruns OPTIMIZE / VACUUM / ANALYZE\\nautomatically, on its own schedule"]
\`\`\`

## Practice check

> **Scenario:** *A team is deciding the optimal data layout strategy (partitioning, Z-Ordering, or Liquid Clustering) for a growing managed Delta table in Unity Catalog whose query filter patterns are expected to evolve over time.*
>
> **Reasoning:** **Liquid Clustering** is the best fit — it avoids the small-file risk of poor partition-column choices, supports changing the clustering keys later without a full table rewrite, and (with Automatic Liquid Clustering) can adapt to observed query patterns as they evolve, which neither static partitioning nor a one-time \`ZORDER BY\` choice can do as gracefully.

> 💡 **Exam tip:** if a question is choosing a layout strategy for a table with **high-cardinality filter columns** or **query patterns that will change over time**, **Liquid Clustering** is almost always the intended answer over classic partitioning + \`ZORDER\`. "Automatic maintenance with no scheduled job to manage" points to **Predictive Optimization**.
`,
  },
  {
    id: 'TRO-memory-errors-oom',
    domain: 'TRO',
    order: 4,
    title: 'Memory errors: driver OOM, collect(), and toPandas()',
    summary:
      'Why bringing too much data to the driver crashes the job, and how to fix it without adding more memory blindly.',
    contentMd: `
## Why the driver, specifically, runs out of memory

Spark distributes computation across **executors**, each handling a partition of the data — this is what lets Spark scale to datasets far larger than any single machine's memory. But certain operations **collect all the distributed data back onto the single driver process**, which has a fixed, comparatively small amount of memory:

\`\`\`python
df.collect()      # pulls EVERY row of the DataFrame into driver memory, as a Python list
df.toPandas()      # pulls EVERY row into driver memory, as a single pandas DataFrame
\`\`\`

If the DataFrame is large, either call can easily exceed the driver's available memory, causing a **driver OOM (out-of-memory) error** — this is fundamentally different from an *executor* OOM (which is about a single partition being too large for one executor, addressed by increasing partitions or executor memory).

## Fixing a driver OOM from collect() / toPandas()

The exam tests recognizing that the fix is **not** "give the driver more memory" as the primary answer (though it can help at the margin) — the structural fix is to **avoid pulling the full dataset to the driver in the first place**:

- Use **aggregations, filters, or \`.limit(n)\`** to reduce the result size *before* calling \`.collect()\`/\`.toPandas()\`, if only a summary or a sample is actually needed.
- If the full dataset genuinely needs to be processed as pandas, use **Pandas API on Spark** (\`pyspark.pandas\`) or **\`mapInPandas\`/\`applyInPandas\`**, which keep the computation **distributed** across executors instead of materializing everything on the driver at once.
- If the result truly must land as a single file/object, **write it to storage** (e.g. as a Delta table or a single Parquet/CSV file) directly from the distributed DataFrame, rather than collecting it into driver memory first and writing it out from there.

\`\`\`mermaid
flowchart TD
    D["df.collect() or df.toPandas()\\non a large DataFrame"] --> P{"Does the full result\\nreally need to land\\non the driver?"}
    P -- "No, just a summary/sample" --> F["Aggregate / filter / .limit()\\nBEFORE collecting"]
    P -- "Yes, need full data as pandas" --> Dist["Use pyspark.pandas\\nor mapInPandas (stays distributed)"]
    P -- "Just need to persist it" --> W["Write directly from the\\ndistributed DataFrame\\n(no collect needed)"]
\`\`\`

## Executor Lost vs. driver OOM

- **"Executor Lost"** errors, especially repeated at cluster startup, more often point to **executor-side** memory pressure or interruption (e.g. spot instance reclamation, or a single skewed partition too large for one executor) — see the Spark UI Diagnostics topic for the skew angle.
- **\`java.lang.OutOfMemoryError\` immediately after a \`collect()\`/\`toPandas()\` call** is squarely a **driver** memory problem, caused by the *shape of the code* (pulling everything to one process), not by the cluster being undersized in general.

## Practice check

> **Scenario:** *A data engineer runs \`df.collect()\` on a large Spark DataFrame and the job fails with a driver OOM error.*
>
> **Reasoning:** the most likely cause is that \`collect()\` is pulling the **entire** (large) DataFrame into the driver's memory as a Python object — a single-process operation that doesn't benefit from the cluster's distributed executors at all. The fix is to avoid collecting the full result (aggregate/filter/limit first, or keep the computation distributed with \`pyspark.pandas\`/\`mapInPandas\`), not simply to resize the cluster.

> 💡 **Exam tip:** any question mentioning \`collect()\`, \`toPandas()\`, or "driver OOM" together is testing whether you know these calls **centralize distributed data onto one process** — the fix is almost always to **reduce what's collected**, not to add more driver memory as the first move.
`,
  },
  {
    id: 'TRO-system-tables',
    domain: 'TRO',
    order: 5,
    title: 'Observability with Unity Catalog system tables',
    summary:
      'Querying query history, billable usage, and audit logs directly in SQL — no external monitoring tooling needed.',
    contentMd: `
Unity Catalog exposes several of the platform's own operational records as regular, queryable **system tables** under the \`system\` catalog — so cost, performance, and security investigations can be done with plain SQL instead of exporting logs to an external tool.

## The system tables to know

| System table | Contains | Typical use |
| --- | --- | --- |
| \`system.query.history\` | Every SQL query run (SQL text, user, warehouse, duration, bytes/rows) | "Top 50 longest-running queries in the last 30 days," slow-query investigations |
| \`system.billing.usage\` | Granular billable usage records (DBUs consumed, bucketed by time, job/cluster/warehouse metadata) | Chargeback/cost-allocation dashboards by job, cluster, or team |
| \`system.access.audit\` | Audit log of account/workspace actions: logins, permission changes, external location creation, and more | "Who changed this permission," "who created this external location," general security investigations |
| \`system.access.table_lineage\` / \`system.access.column_lineage\` | Automatically captured upstream/downstream data-flow relationships, at table or column granularity | Impact analysis before a breaking schema change — "what depends on this column before I drop it" |
| \`information_schema.tables\` / \`information_schema.columns\` | The **current structure** of catalogs/schemas/tables/columns (not activity) | Programmatically discovering schema — not a substitute for lineage or audit history |

## Picking the right one

The exam tests distinguishing these precisely, since several sound similar:

- **"Longest-running queries," "SQL text and duration"** → \`system.query.history\` (query **performance**, not cost or security).
- **"DBUs consumed per job/cluster," "chargeback," "cost by team"** → \`system.billing.usage\` (**cost**, not performance or security).
- **"Who did what," "permission changes," "who created X"** → \`system.access.audit\` (**security/activity**, a chronological log of actions taken).
- **"What depends on this table/column," "impact analysis before a schema change"** → \`system.access.table_lineage\` (table-level) or \`system.access.column_lineage\` (column-level, more precise — avoids false positives from \`table_lineage\` when only a specific column's consumers matter).
- **"What does this table's schema currently look like"** → \`information_schema\` — this describes **current structure**, not any kind of history or activity.

\`\`\`mermaid
flowchart TD
    Q["Investigation need"] --> T{"What kind?"}
    T -- "Query performance" --> QH["system.query.history"]
    T -- "Cost / DBU chargeback" --> BU["system.billing.usage"]
    T -- "Who did what, security" --> AU["system.access.audit"]
    T -- "What depends on this\\ntable/column" --> LN["system.access.table_lineage /\\ncolumn_lineage"]
    T -- "Current schema structure" --> IS["information_schema"]
\`\`\`

## Practice check

> **Scenario:** *A FinOps team needs a workspace-wide report of the top 50 longest-running SQL queries from the last 30 days, including SQL text, user, warehouse, and duration.*
>
> **Reasoning:** \`system.query.history\` is built exactly for this — it stores per-query execution records with SQL text, duration, user, and warehouse, queryable directly with SQL. \`system.billing.usage\` would answer a cost question, not a performance one, and \`system.access.audit\` covers security events, not query runtimes.

> 💡 **Exam tip:** map the *kind* of question to the *category* of system table — performance → query.history, cost → billing.usage, security/activity → access.audit, dependencies → lineage tables. Don't default to \`information_schema\` for anything except "what does the schema look like right now."
`,
  },
  {
    id: 'TRO-instance-types-physical-plan',
    domain: 'TRO',
    order: 6,
    title: 'Choosing instance types and reading the physical query plan',
    summary:
      'Matching VM families to workload shape, and confirming whether a join actually used broadcast from the execution plan.',
    contentMd: `
## Instance type families

Cloud VM families are optimized for different resource profiles, and a workload's bottleneck (not just "make it bigger") should drive the choice:

| Family | Optimized for | Good fit when the bottleneck is... |
| --- | --- | --- |
| **Compute-optimized** | High CPU-to-memory ratio | CPU-bound work: heavy \`OPTIMIZE\`/\`ZORDER\` compaction, complex UDFs, intensive serialization |
| **Memory-optimized** | High memory-to-CPU ratio | Large shuffles/joins across many wide columns and billions of rows, where the goal is to keep intermediate data **in memory** and avoid disk spill |
| **Storage-optimized** | Fast local (NVMe) disk | Workloads that lean heavily on the Delta/disk cache for repeated reads of the same large datasets |
| **GPU-optimized** | Attached GPUs | Deep learning training/inference — essentially never the answer for a plain ETL/ SQL workload |

If a scenario describes a large-scale join across many wide tables where **executors repeatedly spill to disk** during the shuffle, the diagnosis is insufficient memory for the shuffle, and the fix is **memory-optimized** instances — not compute-optimized (which would help a CPU-bound compaction job instead) and not GPU (irrelevant to ETL).

## Reading the physical plan to confirm join strategy

\`EXPLAIN\` (or the Spark UI's query details) shows the actual **physical plan** Spark chose — the most direct evidence of whether a broadcast join happened, rather than inferring it indirectly from symptoms like spill or skewed task durations:

\`\`\`sql
EXPLAIN SELECT * FROM large_fact f JOIN small_dim d ON f.id = d.id;
\`\`\`

- If the plan shows a **\`BroadcastExchange\`** feeding a **\`BroadcastHashJoin\`**, Spark broadcast the small side — no large-table shuffle occurred.
- If the plan instead shows plain **\`Exchange\`** operators on **both** sides feeding a **\`SortMergeJoin\`**, Spark shuffled both tables — broadcast did **not** happen, even if the small table looks "obviously small" to a human reading the query.

This distinction matters because symptoms like high spill or uneven task duration are **downstream effects**, not direct proof of the join strategy — the physical plan is the authoritative source. Once a \`SortMergeJoin\` is confirmed for a join that should have broadcast, the fix is to either raise \`spark.sql.autoBroadcastJoinThreshold\` above the small table's actual size, or add an explicit \`broadcast()\` hint — not to jump straight to "add more executor memory," which treats a symptom (spill) without addressing the root cause (no broadcast).

\`\`\`mermaid
flowchart TD
    Plan["EXPLAIN physical plan"] --> Check{"BroadcastExchange present?"}
    Check -- "Yes, feeding BroadcastHashJoin" --> OK["Broadcast join confirmed\\n— no large-table shuffle"]
    Check -- "No, Exchange on both sides\\nfeeding SortMergeJoin" --> Shuffle["Shuffle-based join\\n— raise autoBroadcastJoinThreshold\\nor add broadcast() hint"]
\`\`\`

## Practice check

> **Scenario:** *A query joins a very large \`orders\` table with a much smaller \`customers\` table. In the Spark UI, most runtime is spent in shuffle-heavy stages with skewed tasks and heavy spill. Which observation most directly shows that a broadcast join is not being used?*
>
> **Reasoning:** the direct evidence is in the **physical plan**: \`Exchange\` operators on the join path with **no** \`BroadcastExchange\` feeding a broadcast join node. Spill metrics and task-duration variance are consequences that *suggest* a shuffle-heavy join happened, but the plan itself is what actually confirms which join strategy Spark chose.

> 💡 **Exam tip:** "spill and skew" symptoms alone don't prove a join wasn't broadcast — always point to the **physical plan** (\`BroadcastExchange\` vs. plain \`Exchange\`) as the direct evidence when a question asks "which observation most directly shows..."
`,
  },
];
