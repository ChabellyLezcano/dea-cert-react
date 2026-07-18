import type { RawStudyTopic } from '@/types/guide.types';

export const ingTopics: RawStudyTopic[] = [
  {
    id: 'ING-auto-loader',
    domain: 'ING',
    order: 1,
    title: 'Auto Loader: incremental, scalable file ingestion',
    summary:
      'How Auto Loader discovers new files, tracks state, infers schema, and handles schema drift — in depth.',
    contentMd: `
**Auto Loader** (\`cloudFiles\` format) incrementally and efficiently ingests new data files as they arrive in cloud storage, without you having to re-scan the entire directory every run. It is the default recommended tool for file-based ingestion at any meaningful scale.

## How it discovers new files

Auto Loader supports two file-discovery modes:

- **Directory listing** (default): lists the target directory to find new files. Simple, no extra cloud setup, but listing cost and latency grow as the directory grows — fine for moderate volumes.
- **File notification**: subscribes to cloud-native event notifications (S3 → SQS via S3 event notifications, ADLS → Event Grid, GCS → Pub/Sub) so it's told about new files instead of listing the directory. Scales to **millions of files** with low latency, at the cost of extra cloud permissions to create/manage the notification queue (which Auto Loader can set up automatically if granted permission).

\`\`\`python
df = (spark.readStream
    .format("cloudFiles")
    .option("cloudFiles.format", "json")
    .option("cloudFiles.useNotifications", "true")   # file notification mode
    .option("cloudFiles.schemaLocation", "/mnt/schemas/orders")
    .load("/mnt/raw/orders"))
\`\`\`

## Checkpointing and exactly-once processing

Auto Loader tracks which files it has already processed in a **checkpoint location** (RocksDB-backed). This is what makes it:

- **Incremental**: only new files since the last run are processed — the whole directory is never rescanned from scratch on every run.
- **Exactly-once**: even if a run fails partway through and is retried, files aren't double-counted, because the checkpoint only advances after a file's data is durably committed downstream.
- **Stateful across restarts**: point a new stream at the same checkpoint location and it resumes exactly where it left off — this is why the checkpoint location must be **unique per stream** and never shared between two different pipelines.

## Schema inference and evolution

Auto Loader can **infer the schema** from a sample of existing files and **evolve** it automatically as new columns appear, controlled by \`cloudFiles.schemaEvolutionMode\`:

| Mode | Behavior |
| --- | --- |
| \`addNewColumns\` (**default**) | New columns are added to the tracked schema; the **stream restarts** (fails once, then resumes) to pick up the new schema on the next micro-batch |
| \`rescue\` | Unexpected/new columns are captured in a special \`_rescued_data\` column (as JSON text) instead of failing the stream — nothing is ever dropped, but new columns don't become first-class typed columns automatically |
| \`failOnNewColumns\` | The stream **fails and does not restart automatically** — a human must update the target schema explicitly before the stream can resume |
| \`none\` | Schema evolution is disabled entirely; new columns are silently ignored (dropped) |

\`\`\`python
(spark.readStream
    .format("cloudFiles")
    .option("cloudFiles.format", "json")
    .schema(expected_schema)
    .option("cloudFiles.schemaEvolutionMode", "failOnNewColumns")
    .load("/mnt/raw/orders"))
\`\`\`

With an **explicit \`.schema(...)\`** supplied (as above) *and* \`failOnNewColumns\`, any file containing a column not in \`expected_schema\` causes the stream to throw an \`UnknownFieldException\` and **stop** — it will not silently resume; it requires the schema (or the mode) to be updated and the stream restarted manually. This combination is the correct answer whenever a scenario needs to be **alerted immediately** to any unexpected new field rather than having it silently added or rescued.

The **rescued data column** (\`_rescued_data\`) also activates automatically any time a record doesn't match the expected type for a column (e.g. a string arrives where a number was expected) — not just for brand-new columns — so it doubles as a general safety net for malformed records, independent of which schema evolution mode is chosen for genuinely new columns.

The **schema location** (\`cloudFiles.schemaLocation\`) is where the inferred/evolved schema is persisted between runs — a separate path from the checkpoint location, though the two are often colocated under the same parent directory for tidiness.

### Column type inference

By default, Auto Loader infers all columns of semi-structured formats like JSON/CSV as **STRING**, to be maximally safe against surprising type changes. Setting \`cloudFiles.inferColumnTypes\` to \`true\` tells it to instead infer richer types (integers, dates, etc.) from the sampled data — useful when you want typed columns immediately without a manual \`CAST\` step downstream, at the cost of being more sensitive to sample data that doesn't represent the full range of real values.

### Other Auto Loader options worth knowing

| Option | Purpose |
| --- | --- |
| \`cloudFiles.allowOverwrites\` | By default, Auto Loader ingests each file path **exactly once** and ignores it if the same path is overwritten later. Setting this to \`true\` makes Auto Loader also watch file **modification time**, so a re-uploaded file (e.g. a corrected version at the same path/filename) is re-ingested — the fix for "files are occasionally re-uploaded under the same name to apply corrections." |
| \`pathGlobFilter\` (no \`cloudFiles.\` prefix) | Filters which files are read using a glob pattern, e.g. \`"*.jpg"\` to ingest only JPEGs from a folder that also contains PNGs/GIFs. |
| \`cloudFiles.schemaHints\` | Forces specific columns to a chosen type (e.g. \`"zip_code STRING"\` to preserve leading zeros) while the rest of the schema is still inferred automatically — narrower than disabling \`inferColumnTypes\` entirely, which would affect every column. |

## Typical pattern: Auto Loader into a Bronze Delta table

\`\`\`python
df = (spark.readStream
    .format("cloudFiles")
    .option("cloudFiles.format", "json")
    .option("cloudFiles.schemaLocation", "/mnt/schemas/orders")
    .load("/mnt/raw/orders"))

(df.writeStream
    .format("delta")
    .option("checkpointLocation", "/mnt/checkpoints/orders")
    .trigger(availableNow=True)
    .toTable("bronze.orders"))
\`\`\`

\`trigger(availableNow=True)\` processes all currently-available files and then **stops** — the standard choice for scheduled, batch-style ingestion of a streaming source inside a Lakeflow Job, instead of leaving the stream running continuously between scheduled runs.

\`\`\`mermaid
flowchart LR
    A["New files land\\nin cloud storage"] -->|"listing / notification"| B["Auto Loader\\n(cloudFiles source)"]
    B --> C{"Schema known?"}
    C -- "No" --> D["Infer from sample\\n+ write schemaLocation"]
    C -- "Yes" --> E["Read using tracked schema"]
    D --> E
    E --> F["checkpointLocation\\nrecords processed files"]
    E --> G["Bronze Delta table"]
    E -.->|"unexpected field / type"| R["_rescued_data column"]
\`\`\`

## Practice check

> **Scenario:** *An Auto Loader stream is configured with \`.schema(expected_schema)\` and \`cloudFiles.schemaEvolutionMode = "failOnNewColumns"\`. A new file arrives containing a column not present in \`expected_schema\`. What happens?*
>
> **Reasoning:** the stream **fails and does not automatically resume**. Unlike \`addNewColumns\` (which restarts itself), \`failOnNewColumns\` requires manual intervention — someone must update the schema (or switch modes) and restart the stream. This is intentional: it's the mode to pick when the team wants to be alerted rather than have the schema silently change.

> 💡 **Exam tip:** "process only new files since the last run, exactly once, with automatic schema handling" is the textbook description of **Auto Loader**. If the question also says "millions of files" or "very large directory," the extra clue pointing to **file notification mode** is usually present too. If it says "must never fail on schema changes but must capture anything unexpected," that's \`schemaEvolutionMode = "rescue"\`.
`,
  },
  {
    id: 'ING-copy-into-vs-autoloader',
    domain: 'ING',
    order: 2,
    title: 'COPY INTO vs. Auto Loader: choosing the right ingestion tool',
    summary:
      'Both load new files idempotently — the difference is scale, bad-record handling, and streaming vs. one-shot semantics.',
    contentMd: `
Both **\`COPY INTO\`** and **Auto Loader** solve the same core problem — load only the *new* files from a location into a Delta table — but they trade off differently, and the exam tests picking the right one for a described scenario.

## COPY INTO

\`COPY INTO\` is a plain SQL command, tracked by the Delta transaction log itself (no separate checkpoint file needed):

\`\`\`sql
COPY INTO catalog.schema.orders
FROM '/mnt/raw/orders'
FILEFORMAT = JSON
COPY_OPTIONS ('mergeSchema' = 'true');
\`\`\`

- **Idempotent and simple** — safe to re-run on a schedule; already-loaded files are automatically skipped based on file-tracking metadata Delta maintains internally.
- Best for **thousands** of files, not millions — it lists the source directory each run, so listing cost/time grows with directory size.
- Purely **batch**: each run is a one-off SQL statement, not a continuously-tracked stream — there is no notion of "still running" between invocations.
- A good fit for **ad hoc or low-frequency** loads, or when the team wants ingestion expressed as plain SQL inside a SQL-only workflow (e.g. a Lakeflow Job SQL task, no PySpark required).

### Handling partially/badly ingested files

If some files fail during a \`COPY INTO\` run (e.g. malformed rows, unexpected types), the failure is scoped to those specific files/records — Databricks tracks per-file ingestion status, so a **re-run of the same \`COPY INTO\` statement retries only the files that previously failed or were never successfully loaded**, without re-loading files that already succeeded. This is the key idempotency guarantee to remember: \`COPY INTO\` is safe to blindly re-run after a partial failure without manual bookkeeping of what succeeded.

## Auto Loader

- Scales to **millions of files** via file notification mode.
- Native **Structured Streaming** source — supports both continuous processing and the batch-like \`trigger(availableNow=True)\`.
- Richer schema evolution controls (see the Auto Loader topic) and the \`_rescued_data\` safety net for malformed/unexpected records.
- Slightly more setup: checkpoint + schema locations, and optionally a cloud notification queue.

## Decision table

| Signal in the question | Prefer |
| --- | --- |
| "Millions of files", "high file volume" | Auto Loader (file notification mode) |
| "Simple SQL-based load", "one-off backfill", "safe to just re-run the same statement" | COPY INTO |
| "Needs automatic schema evolution" | Auto Loader |
| "Already using Structured Streaming elsewhere in the pipeline" | Auto Loader (keeps everything in the same streaming model) |
| "Small/moderate number of files, run occasionally" | Either works; COPY INTO is simpler to reason about and operate |
| "Needs a rescued-data safety net for malformed records" | Auto Loader |

\`\`\`mermaid
flowchart TD
    Q{"How many files,\\nand how often?"} -- "Thousands, occasional/ad hoc" --> CI["COPY INTO\\n(plain SQL, idempotent)"]
    Q -- "Millions, continuous arrival" --> AL["Auto Loader\\n(cloudFiles, notification mode)"]
    Q -- "Need rich schema evolution\\n/ rescued data" --> AL
    Q -- "Team wants pure SQL,\\nno checkpoint management" --> CI
\`\`\`

## Practice check

> **Scenario:** *A team is loading CSV files from cloud storage into a Delta table with \`COPY INTO\`. Some files were only partially ingested due to a transient failure. What happens on the next scheduled run?*
>
> **Reasoning:** \`COPY INTO\` re-runs are **idempotent at the file level** — the next run automatically retries the files that failed or weren't fully loaded, without re-processing files that already succeeded, and without any manual tracking needed by the engineer.

> 💡 **Exam tip:** don't over-index on "streaming vs. batch" as the deciding factor — Auto Loader with \`trigger(availableNow=True)\` behaves like a batch job too. The deciding factor tested most often is **file volume/scale** and **schema evolution/rescue needs**, not the streaming label.
`,
  },
  {
    id: 'ING-lakeflow-connect',
    domain: 'ING',
    order: 3,
    title: 'Lakeflow Connect: managed ingestion connectors',
    summary:
      'Low-code, fully-managed ingestion from SaaS applications and databases directly into Unity Catalog.',
    contentMd: `
**Lakeflow Connect** provides **managed ingestion connectors** for popular enterprise data sources (e.g. Salesforce, Workday, SQL Server, PostgreSQL, Snowflake, ServiceNow) that land data directly into Unity Catalog-governed Delta tables — without writing and operating custom JDBC/Auto Loader pipelines yourself.

## Why it exists

Building a reliable, incremental connector to a SaaS application or an operational database by hand is real engineering work: authentication, pagination/rate limits, detecting only-changed records (CDC), schema drift in the source, and retry/error handling all have to be built and maintained. Lakeflow Connect packages this as a **low-code, fully-managed** experience: configure the source connection and target table once, and Databricks operates the ongoing incremental sync.

## What counts as a "managed ingestion connector"

The exam tests recognizing which sources are (and are not) part of the Lakeflow Connect managed set — treat this as a checklist to keep current knowledge of, since Databricks expands the list over time:

- ✅ **Managed connectors**: purpose-built integrations for specific named SaaS applications and databases (Salesforce, Workday, ServiceNow, SQL Server, PostgreSQL, and similar), where Databricks handles the connection details, incremental/CDC extraction, and schema mapping for you.
- ❌ **Not a managed connector**: a **generic JDBC read** you write yourself against an arbitrary/unsupported database — that's a custom pipeline (see the Hybrid Connectivity topic in the Platform domain), not Lakeflow Connect.
- ❌ **Not a managed connector**: **Auto Loader** — Auto Loader ingests *files* from cloud storage; it is a different ingestion mechanism from a managed application/database connector, even though both ultimately land data in Delta tables.
- ❌ **Not a managed connector**: manually uploading a file through the **file upload UI** — that's a one-off manual action, not an ongoing managed sync.

## Change Data Capture (CDC) for databases

For database sources (e.g. PostgreSQL, SQL Server), Lakeflow Connect performs **incremental, change-data-capture-based** extraction: after an initial full snapshot, only **changed records** (inserts/updates/deletes since the last sync) are pulled on each subsequent run, rather than re-extracting the entire source table every time. This is the answer whenever a scenario specifies **"only records that have changed should be ingested to avoid unnecessary load"** on a periodic sync from an external database.

## When to prefer Lakeflow Connect over Auto Loader / COPY INTO / hand-written JDBC

| Signal in the question | Prefer |
| --- | --- |
| Source is a **named supported SaaS app or database** (Salesforce, Workday, SQL Server, PostgreSQL, Snowflake...) | Lakeflow Connect |
| Source is **files already landing in cloud storage** | Auto Loader / COPY INTO |
| Source is an **unsupported/custom system**, or fine-grained control over the extraction logic is required | Hand-written JDBC read (see the Platform domain's Hybrid Connectivity topic) |
| Team wants to **minimize the amount of pipeline code they build and operate** for a supported source | Lakeflow Connect |

\`\`\`mermaid
flowchart LR
    SF["Salesforce"] --> LC["Lakeflow Connect\\n(managed, CDC-based)"]
    SQL["SQL Server / PostgreSQL"] --> LC
    LC --> UC["Unity Catalog\\nDelta table"]
    Files["Files in cloud storage"] --> AL["Auto Loader / COPY INTO"] --> UC
    Custom["Unsupported source"] --> JDBC["Hand-written JDBC read"] --> UC
\`\`\`

## Practice check

> **Scenario:** *A team needs to sync sales data from Snowflake into Databricks every 6 hours. Only records that have changed should be ingested to avoid unnecessary load on the source system.*
>
> **Reasoning:** a named, supported enterprise source (Snowflake) with a requirement for **change-only extraction** is the signature use case for **Lakeflow Connect** — it performs CDC-based incremental sync out of the box, instead of the team building and maintaining that change-detection logic themselves with raw JDBC.

> 💡 **Exam tip:** if the source in the scenario is a **named, well-known enterprise application or database**, and the question emphasizes "low-code," "fully managed," or "minimal pipeline maintenance," the answer is **Lakeflow Connect** — don't reach for Auto Loader (files) or a custom JDBC pipeline (unsupported/custom sources) when a managed connector is explicitly available for that source.
`,
  },
  {
    id: 'ING-structured-streaming-fundamentals',
    domain: 'ING',
    order: 4,
    title: 'Structured Streaming fundamentals: triggers, output modes, and checkpoints',
    summary:
      'The readStream/writeStream model underneath Auto Loader — trigger types, output modes, and what each guarantees.',
    contentMd: `
Auto Loader is built on top of **Structured Streaming**, and several exam questions test the underlying streaming API directly — reading a \`readStream\`/\`writeStream\` code block and predicting its behavior.

## The basic shape

\`\`\`python
streaming_df = (spark.readStream
    .format("cloudFiles")
    .option("cloudFiles.format", "json")
    .load(source_location))

query = (streaming_df
    .writeStream
    .format("delta")
    .outputMode("append")
    .option("checkpointLocation", checkpoint_location)
    .trigger(processingTime="1 minute")
    .toTable("bronze.events"))
\`\`\`

A **query** (the object returned by \`.start()\` or \`.toTable()\`) runs asynchronously in the background; \`query.awaitTermination()\` blocks the calling code until it stops.

## Trigger types

| Trigger | Behavior |
| --- | --- |
| \`.trigger(processingTime="1 minute")\` | Runs a **micro-batch every N** time units, for as long as the stream keeps running — the classic "near-real-time" configuration |
| \`.trigger(availableNow=True)\` | Processes everything currently available, in one or more micro-batches, then **stops** — behaves like a batch job; the standard choice inside a scheduled Lakeflow Job |
| \`.trigger(once=True)\` | Legacy predecessor to \`availableNow\` — processes all available data in a **single** micro-batch, then stops (largely superseded by \`availableNow\`, which can split the backlog into multiple smaller batches for better resource use) |
| \`.trigger(continuous="1 second")\` | Experimental low-latency continuous processing mode, distinct from the default micro-batch engine — very rarely the right exam answer unless sub-second latency is explicitly demanded |
| *(no \`.trigger()\` specified)* | Defaults to running a new micro-batch **as soon as the previous one finishes** — effectively continuous micro-batching at maximum speed |

For **"update downstream Gold tables every 15 minutes to meet an SLA,"** the answer is \`trigger(processingTime="15 minutes")\` on a continuously-running stream — not \`availableNow\` (which would need external scheduling to repeat) and not the no-trigger default (which would run far more often than needed and waste compute).

For **"the lowest possible latency for streaming IoT sensor data,"** the answer leans toward the shortest practical \`processingTime\` (or, in specialized cases, \`continuous\` mode) — the key discriminator tested is recognizing that \`availableNow\`/\`once\` are **not** low-latency choices, since they run once and stop rather than continuously watching for new data.

## Output modes

| Mode | Meaning | Typical use |
| --- | --- | --- |
| \`append\` | Only new rows since the last trigger are written to the sink | The default for simple ingestion — most Bronze/Silver streams |
| \`update\` | Only rows that changed since the last trigger are written (updated in place) | Streaming aggregations where only the changed groups need to be output |
| \`complete\` | The **entire** result table is rewritten every trigger | Small aggregated result sets, e.g. a running total or a small summary table |

Given a query performing a stateful aggregation (e.g. a running \`groupBy().count()\`), \`outputMode("append")\` is only valid once the aggregation is **finalized** for a given group (typically requiring a watermark) — this is why a plain running count usually needs \`update\` or \`complete\`, not \`append\`, and the exam tests recognizing this mismatch when a code block combines an aggregation with \`append\` mode incorrectly.

## Checkpointing (recap, streaming-specific view)

The \`checkpointLocation\` stores both **progress** (which offsets/files have been processed) and, for stateful queries, the **operator state** (e.g. partial aggregation results) — this is why checkpoint locations must never be shared across two different streaming queries, and why deleting/moving a checkpoint effectively resets the stream to reprocess from scratch.

## Read-side vs. write-side schema evolution

It's easy to conflate two different "schema evolution" knobs that operate at different points in the pipeline:

- **\`cloudFiles.schemaEvolutionMode\`** (a **read**-side Auto Loader option) controls how the *source* schema is tracked and evolved as new files arrive.
- **\`.option("mergeSchema", "true")\`** on the **\`writeStream\`** (a Delta **sink**-side option) controls whether the *target Delta table's* schema is allowed to evolve to accept a DataFrame with new columns.

If a stream fails with an \`AnalysisException\` because the upstream source added a column and the goal is for the **target Delta table** to evolve automatically so appends can continue, the fix is \`mergeSchema = "true"\` on the write side — \`cloudFiles.schemaEvolutionMode\` alone (a read-side setting) does not by itself make the *sink* accept the wider schema on \`append\`.

## Reading a table as a streaming source

Any Delta table can itself be read as a streaming source — useful for chaining Bronze → Silver → Gold as a sequence of streams:

\`\`\`python
bronze_stream = spark.readStream.table("bronze.orders")
# or equivalently:
bronze_stream = spark.readStream.format("delta").table("bronze.orders")
\`\`\`

This only streams **newly appended** rows by default; a table that has had rows **updated or deleted** (not just appended) cannot be read as a simple append-only stream without extra configuration (\`.option("ignoreChanges", "true")\` or Change Data Feed), since Structured Streaming's default contract assumes an append-only source.

\`\`\`mermaid
flowchart LR
    S["Source\\n(cloudFiles / table)"] --> T{"Trigger"}
    T -->|"processingTime"| MB1["Micro-batch\\nevery N time units\\n(keeps running)"]
    T -->|"availableNow"| MB2["Process backlog,\\nthen STOP"]
    MB1 --> O{"Output mode"}
    MB2 --> O
    O -->|"append"| Sink["Sink table\\n(new rows only)"]
    O -->|"complete"| Sink2["Sink table\\n(fully rewritten)"]
\`\`\`

## Practice check

> **Scenario:** *A team wants to update downstream Gold tables every 15 minutes to meet a company SLA, running as a long-lived stream rather than a separately-scheduled job.*
>
> **Reasoning:** \`.trigger(processingTime="15 minutes")\` is the direct match — it keeps the stream alive and fires a micro-batch on that fixed cadence, unlike \`availableNow\` (one-shot, needs external scheduling to repeat) or the no-trigger default (fires as fast as possible, wasteful for a 15-minute SLA).

> 💡 **Exam tip:** \`availableNow=True\` and \`once=True\` both **stop** the stream after clearing the backlog — neither is a "keep running and re-check periodically" trigger. If a question wants ongoing, scheduled-cadence processing without an external job scheduler, it needs \`processingTime\`.
`,
  },
  {
    id: 'ING-volumes-file-upload',
    domain: 'ING',
    order: 5,
    title: 'Unity Catalog Volumes and the file upload UI',
    summary:
      'Governed, non-tabular file storage inside Unity Catalog, and the simplest manual ingestion path.',
    contentMd: `
Not everything ingested into Databricks is (or starts as) a table. **Volumes** are a Unity Catalog object for governing access to **non-tabular files** — arbitrary files that live in cloud storage but should still be organized, permissioned, and discoverable through Unity Catalog the same way tables are.

## What a Volume is

A Volume sits at the same namespace level as a table, addressed as \`catalog.schema.volume_name\`, and is backed by a directory in cloud storage:

- **Managed volumes**: Unity Catalog manages the storage location for you (similar to managed tables).
- **External volumes**: point at a storage location you specify explicitly (similar to external tables).

Typical uses: staging raw files before ingestion, storing ML model artifacts/checkpoints, storing unstructured files (images, PDFs, logs) that will never become a table row-for-row, or serving as the **landing zone** that Auto Loader or \`COPY INTO\` subsequently reads from.

\`\`\`sql
CREATE VOLUME IF NOT EXISTS analytics.events.source_files;

-- Files placed under this path are governed by Unity Catalog permissions,
-- the same GRANT/REVOKE model used for tables:
GRANT READ VOLUME ON VOLUME analytics.events.source_files TO \`data_engineers\`;
\`\`\`

Once a file is uploaded into a Unity Catalog Volume, it can be referenced by its **volume path** (\`/Volumes/analytics/events/source_files/...\`) from any Spark read, exactly like any other cloud storage path — this is commonly the target that a Lakeflow Job ingestion task then points Auto Loader at.

## The file upload UI

For small, one-off, manual ingestion — a single CSV a business user wants explored, a small reference/lookup file — Databricks provides a **file upload UI** directly in the workspace: drag a file in, and Databricks will:

- Store the file (into a Volume, or directly stage it),
- **Automatically detect** the file type and a reasonable schema,
- Offer to create a new Unity Catalog-managed table from it in a couple of clicks.

This is explicitly a **manual, one-off** path — it is *not* a Lakeflow Connect managed connector, *not* Auto Loader, and *not* meant for recurring/scheduled ingestion. If a scenario describes an engineer repeatedly re-uploading a file on a schedule, that's a sign the file upload UI is the *wrong* tool and an automated pipeline (Auto Loader/COPY INTO/Lakeflow Job) should replace it.

## Decision table

| Signal in the question | Tool |
| --- | --- |
| "Business user wants to quickly explore a single CSV they have on their laptop" | File upload UI |
| "Store arbitrary non-tabular files (images, model artifacts) under Unity Catalog governance" | Volume |
| "Staging area that an automated pipeline reads from on a schedule" | Volume (as the landing zone) + Auto Loader/COPY INTO reading from it |
| "Recurring, automated ingestion" | Auto Loader / COPY INTO / Lakeflow Connect — never the file upload UI |

## Practice check

> **Scenario:** *A data engineer uses the file upload UI in Databricks to ingest a CSV file into a new Unity Catalog-managed table. The UI automatically detects the file's schema.*
>
> **Reasoning:** this describes the **file upload UI**'s intended, one-off use case exactly — automatic type/schema detection and one-click table creation for a single manually-provided file. It is not evidence of, or a substitute for, an ongoing ingestion pipeline.

> 💡 **Exam tip:** governance-flavored questions about storing or accessing **non-tabular files** inside Unity Catalog point to **Volumes**. Questions about a **single, manual, ad hoc** file load point to the **file upload UI**. Anything recurring/scheduled points away from both, toward Auto Loader, COPY INTO, or Lakeflow Connect.
`,
  },
  {
    id: 'ING-kafka-watermarking',
    domain: 'ING',
    order: 6,
    title: 'Ingesting from Kafka, and bounding state with watermarks',
    summary:
      'Reading a Kafka topic with Structured Streaming, and preventing stateful streaming queries from growing memory unbounded.',
    contentMd: `
Alongside \`cloudFiles\` (files), **Kafka** is the other streaming source the exam expects you to read and write correctly.

## Reading from Kafka

\`\`\`python
events_stream = (spark.readStream
    .format("kafka")
    .option("kafka.bootstrap.servers", "broker1:9092,broker2:9092")
    .option("subscribe", "vehicle_telemetry")
    .option("startingOffsets", "latest")
    .load())
\`\`\`

Every piece of this is exact syntax the exam tests directly:

- **\`.format("kafka")\`** — there is no \`.kafka(...)\` shortcut method, and Auto Loader's \`cloudFiles\` format does **not** support Kafka (\`cloudFiles\` is exclusively for files in cloud object storage).
- **\`kafka.bootstrap.servers\`** — the broker addresses (note the \`kafka.\` prefix on this specific option).
- **\`subscribe\`** — the topic name (not \`topic\`).
- **\`startingOffsets\`** — \`"latest"\` starts consuming only new events arriving after the stream starts; \`"earliest"\` replays the entire retained history of the topic. A requirement like "process only new events, not historical ones" always maps to \`"latest"\`.
- **\`.load()\`** takes no positional arguments — connection details are always options, not arguments.

## Watermarking: bounding state in stateful streaming

A stateful streaming aggregation (e.g. a windowed \`groupBy\`) has to keep some in-memory state per group/window so it can update the result as more matching data arrives. Without a limit, a query that accepts **late-arriving data indefinitely** keeps that state growing forever — the classic cause of a streaming job that slowly consumes more and more memory over time.

\`\`\`python
from pyspark.sql import functions as F

clicks_per_hour = (events
    .withWatermark("event_time", "2 hours")
    .groupBy(F.window("event_time", "1 hour"), "device_id")
    .agg(F.count("*").alias("click_count")))
\`\`\`

\`.withWatermark("event_time", "2 hours")\` tells Spark: "once we've seen data up to time T, don't expect data with an event time older than T minus 2 hours." Once that threshold passes for a given window, Spark **evicts its state** for that window — bounding memory growth. Late data older than the watermark is dropped rather than kept forever.

This is unrelated to (and not solved by) any of these commonly-confused settings:

- **\`.trigger(...)\`** only controls *when* a micro-batch runs, not how long state is retained.
- **\`.checkpoint(...)\`** persists state/progress to disk for fault tolerance — it doesn't limit how much state accumulates.
- **\`spark.sql.shuffle.partitions\`** changes how many partitions the shuffle uses, not the lateness/retention policy.

## Stream-to-stream joins with a time bound

The same watermarking idea applies to **joining two streams** (e.g. ad impressions with clicks that may arrive up to a couple of hours later): without a watermark on the join's event-time columns, Spark must keep every unmatched row from both sides forever, waiting for a possible future match — again unbounded growth. A watermark on the join keys tells Spark it's safe to give up waiting and evict old unmatched state past the threshold.

\`\`\`mermaid
flowchart LR
    E["Events\\n(event_time column)"] --> WM["withWatermark(\\n  'event_time', '2 hours')"]
    WM --> AGG["groupBy(window(...))\\n.agg(...)"]
    AGG --> S["State store"]
    WM -.->|"once event_time advances\\npast the 2h threshold"| Evict["Old window state evicted\\n(bounded memory)"]
\`\`\`

## Practice check

> **Scenario:** *A stateful aggregation over 10-minute event-time windows slows down over time, with growing memory usage, because late data is accepted indefinitely.*
>
> **Reasoning:** add \`.withWatermark("event_time", "<threshold>")\` before the \`groupBy(window(...))\` — this bounds how long Spark waits for late data per window and lets it evict old state once that threshold passes. Changing the trigger, checkpoint location, or shuffle partition count does not address unbounded state growth.

> 💡 **Exam tip:** \`startingOffsets = "latest"\` → only new events. \`"earliest"\` → full topic history. Any question about a streaming aggregation whose memory/duration grows over time because of late data is a **watermarking** question, not a trigger or checkpoint question.
`,
  },
  {
    id: 'ING-notebooks-tooling',
    domain: 'ING',
    order: 7,
    title: 'Notebook tooling: magic commands, parameters, and Databricks Connect',
    summary:
      'Reusing code across notebooks, installing scoped libraries, parameterizing runs, and developing from a local IDE.',
    contentMd: `
Several exam questions are less about data pipelines and more about the day-to-day mechanics of working in Databricks notebooks — worth knowing precisely.

## Magic commands

| Command | Purpose |
| --- | --- |
| \`%run ./other_notebook\` | Executes another notebook and brings its **variables, classes, and functions** into the current notebook's scope — the way to reuse shared setup/helper code across notebooks. Different from \`dbutils.notebook.run(...)\`, which runs the target notebook as an **isolated** job and does *not* expose its variables back to the caller. |
| \`%pip install some-package\` | Installs a Python package scoped to the **current notebook session only** — doesn't affect other notebooks/users on the same cluster. |
| \`%sh <command>\` | Runs a shell command on the **driver** node (e.g. \`%sh pwd\`). |
| \`%fs <command>\` | Shorthand for \`dbutils.fs\` — browse/manage files (e.g. list a DBFS path) without writing \`dbutils.fs.ls(...)\` directly. |
| \`%sql\`, \`%python\`, \`%scala\`, \`%r\` | Overrides the language of a single cell, regardless of the notebook's default language — e.g. \`%scala\` to define one helper function in Scala from an otherwise-Python notebook. |

\`%run\` and \`%pip\` are the pair to reach for when a requirement is "reuse variables/functions from another notebook" **and** "install a library scoped to just this session" — a common two-part exam scenario.

## Parameterizing notebooks

\`\`\`python
dbutils.widgets.text("source_path", "", "Source path")
dbutils.widgets.text("target_table_name", "", "Target table")

source_path = dbutils.widgets.get("source_path")
target_table_name = dbutils.widgets.get("target_table_name")
\`\`\`

**\`dbutils.widgets\`** is the standard way to declare a notebook's input parameters — when the notebook runs as a Databricks Jobs task, these widgets automatically map to the task's configured parameters, so the same reusable notebook can run with different inputs (e.g. \`source_path\`) for different tables/datasets without editing code. Plain Python \`sys.argv\` does not apply in the Databricks notebook execution context.

## Debugging interactively

Databricks notebooks include a built-in **Python interactive debugger**: set breakpoints, step through code line by line, and inspect variable values without littering the code with \`print()\` statements. This is distinct from cluster-level monitoring tools (Ganglia/metrics, which show CPU/memory, not variable state) and the Spark UI (which shows distributed execution details, not local Python variable values).

## Databricks Connect

**Databricks Connect** lets you write and run Spark code from a **local IDE** (VS Code, PyCharm, IntelliJ) against a **remote Databricks cluster**, without using the notebook UI at all — it creates a \`SparkSession\` in your local process that transparently executes against the remote cluster. This is the answer whenever a scenario describes a developer wanting to "iterate faster from their IDE" or "execute Spark code against remote compute without notebooks."

Don't confuse it with:

- **Databricks CLI**: automates workspace/job/bundle operations from the command line — not an interactive Spark connection.
- **Git folders (Repos)**: syncs notebook *source code* with Git — doesn't execute anything.
- **\`dbutils\`**: a runtime utility library available *inside* Databricks execution environments (notebooks, jobs) — not a bridge from an external IDE.

\`\`\`mermaid
flowchart LR
    IDE["Local IDE\\n(VS Code / PyCharm)"] -->|"Databricks Connect\\n(remote SparkSession)"| CL["Remote Databricks cluster"]
    NB["Databricks notebook"] -->|"%run"| NB2["Shares variables/functions"]
    NB -->|"dbutils.notebook.run()"| NB3["Isolated job run\\n(no shared scope)"]
\`\`\`

## Practice check

> **Scenario:** *A junior data engineer develops PySpark code locally in VS Code and wants to execute it against remote Databricks compute without using notebooks, to iterate faster.*
>
> **Reasoning:** **Databricks Connect** is built exactly for this — a local \`SparkSession\` that runs against a remote cluster, keeping the fast local edit/run loop of an IDE while still using Databricks compute.

> 💡 **Exam tip:** "reuse variables/functions from another notebook in the current scope" → \`%run\`. "Run a notebook as an isolated, parameterized unit without inheriting its variables" → \`dbutils.notebook.run()\`. "Code locally in an IDE against remote compute" → **Databricks Connect**.
`,
  },
];
