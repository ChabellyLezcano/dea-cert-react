import type { RawStudyTopic } from '../../../types/guide.types';

export const traTopics: RawStudyTopic[] = [
  {
    id: 'TRA-delta-lake-fundamentals',
    domain: 'TRA',
    order: 1,
    title: 'Delta Lake fundamentals: ACID, time travel, and VACUUM',
    summary:
      'The transaction log is the whole story: how it enables ACID writes, time travel, and safe cleanup.',
    contentMd: `
Delta Lake is a storage layer on top of Parquet files that adds a **transaction log** (\`_delta_log\`). Nearly every Delta feature is a direct consequence of that log existing.

## The transaction log

Every write to a Delta table appends a new JSON commit file to \`_delta_log\`, describing which Parquet files were added/removed. Readers reconstruct "what does this table look like right now" by replaying the log — this is what gives Delta:

- **ACID transactions**: a write either fully commits a new log entry or it doesn't happen at all — no reader ever sees a half-written table, even under concurrent writers.
- **Time travel**: every past commit is still described in the log, so you can query the table **as of** an earlier version or timestamp.

\`\`\`sql
SELECT * FROM catalog.schema.orders VERSION AS OF 12;
SELECT * FROM catalog.schema.orders TIMESTAMP AS OF '2026-06-01';

DESCRIBE HISTORY catalog.schema.orders; -- full audit trail: version, operation, user, timestamp
\`\`\`

- **Schema enforcement**: writes that don't match the table's schema are rejected by default, preventing silently corrupted tables. This can be relaxed intentionally with \`mergeSchema\` where evolution is desired.
- **Optimistic concurrency control**: multiple writers can attempt commits concurrently; Delta detects conflicts at commit time and retries/fails safely instead of corrupting data — there is no row-level locking, so throughput stays high under normal (non-conflicting) concurrent writes.

## VACUUM

\`VACUUM\` physically deletes the underlying Parquet data files that are **no longer referenced by the current table version** and are older than a retention threshold (default **7 days / 168 hours**):

\`\`\`sql
VACUUM catalog.schema.orders RETAIN 168 HOURS; -- default: 7 days
\`\`\`

- Time travel to a version **older than the retention window can no longer be run** after \`VACUUM\` removes the underlying files for that version — a "file not found" error on an old \`VERSION AS OF\` query is the signature symptom.
- Lowering the retention window (e.g. \`RETAIN 0 HOURS\`) is possible but disables safety checks meant to protect concurrent readers/writers — Databricks requires explicitly disabling a safety flag (\`spark.databricks.delta.retentionDurationCheck.enabled = false\`) to go below the recommended minimum, precisely so this isn't done by accident.
- \`VACUUM\` only **removes** files; it does **not** rewrite/compact the remaining ones — that's what \`OPTIMIZE\` is for. Running \`VACUUM\` alone never fixes a small-file problem.
- If an engineer runs \`VACUUM\` and notices only *some* stale files were removed, the most common explanation is that the **rest are still within the retention window** (default 7 days) — not a bug; they will be eligible for deletion once they age past the threshold on a future run.

## OPTIMIZE and Z-ORDER

\`OPTIMIZE\` compacts many small files into fewer, larger ones (better read performance, fewer file-open overheads). \`ZORDER BY\` additionally co-locates related data within those files by the given columns, so filters on those columns can skip more files:

\`\`\`sql
OPTIMIZE catalog.schema.orders ZORDER BY (customer_id);
\`\`\`

(See the Troubleshooting & Optimization domain for **Liquid Clustering**, the modern replacement for manual partitioning + \`ZORDER\`.)

\`\`\`mermaid
flowchart LR
    W["Write"] --> L["_delta_log commit\\n(JSON)"]
    L --> R["Readers replay log\\nto see current state"]
    L -.->|"older commits still referenced"| TT["Time travel\\n(VERSION / TIMESTAMP AS OF)"]
    subgraph Maintenance
        O["OPTIMIZE (+ ZORDER)"] --> S["Fewer, larger,\\nco-located files"]
        V["VACUUM"] --> D["Delete unreferenced\\nfiles past retention"]
    end
\`\`\`

## Practice check

> **Scenario:** *A data engineer wants to review all changes made to a Delta table in the last 30 days, including transaction timestamps, operation types, and the user responsible for each change.*
>
> **Reasoning:** this is exactly what \`DESCRIBE HISTORY\` provides out of the box — no custom audit logging needed, since every write to a Delta table is already recorded in the transaction log with this metadata.

> 💡 **Exam tip:** if a question says time travel to an old version suddenly fails with "file not found," the cause is almost always **\`VACUUM\` having removed files past the retention period** — not corruption, and not a bug in Delta itself.
`,
  },
  {
    id: 'TRA-medallion-architecture',
    domain: 'TRA',
    order: 2,
    title: 'Medallion architecture: Bronze, Silver, Gold',
    summary:
      'A progressive-refinement pattern for organizing pipelines — what changes (and what doesn\u2019t) at each layer.',
    contentMd: `
The **medallion architecture** organizes tables into three layers of increasing quality/refinement. It's a naming and design *convention*, not a Databricks feature you enable — but the exam treats it as the standard mental model for pipeline design questions.

## Bronze — raw, as-is

- Data landed **exactly as received** from the source (JSON, CSV, Parquet…), with minimal or no transformation.
- Often includes ingestion metadata: source file name, load timestamp, and (with Auto Loader) a \`_rescued_data\` column for anything that didn't match the expected schema.
- Purpose: an **immutable historical record** you can always reprocess from, even if downstream logic changes or has a bug — this is the layer you'd replay from if a Silver transformation turns out to have had a mistake.

## Silver — cleaned and conformed

- Bronze data is **validated, deduplicated, and conformed** to a consistent schema/types across sources.
- Business keys and joins across sources typically happen here (e.g. reconciling a "customer" concept that appears slightly differently across three source systems).
- Still fairly granular (close to source-level detail), but now trustworthy enough for cross-team use — this is where **data-quality enforcement** (constraints, expectations — see the Lakeflow Declarative Pipelines topic) is most commonly applied.

## Gold — business-level aggregates

- Data shaped for **specific consumption**: dashboards, ML feature tables, reporting marts.
- Typically aggregated, denormalized, and organized around business entities (e.g. \`daily_revenue_by_region\`).
- Read by BI tools and downstream applications — Gold is the layer end users actually query; it should rarely need a join against another Gold table at query time if it was modeled well.

## Why layer instead of transforming in one step?

- **Reprocessing**: a bug in a Silver transformation can be fixed and *replayed from Bronze* without re-ingesting from the original source (which might not even be re-fetchable, e.g. a webhook payload that was only sent once).
- **Isolation of concerns**: ingestion logic (Bronze), data-quality/conforming logic (Silver), and business logic (Gold) evolve independently and can be owned by different teams.
- **Incremental processing**: each layer can be its own Structured Streaming or Lakeflow Declarative Pipelines flow, only processing what changed upstream, rather than recomputing everything from source on every run.

\`\`\`mermaid
flowchart LR
    SRC["Source systems\\n(APIs, DBs, files)"] --> B["Bronze\\nraw, as-is"]
    B --> S["Silver\\ncleaned, conformed,\\ndeduplicated"]
    S --> G["Gold\\naggregated,\\nbusiness-level"]
    G --> BI["BI tools / dashboards"]
    G --> ML["ML feature tables"]
\`\`\`

## Practice check

> **Scenario:** *A team uses the Silver layer to join customer data with external lookup tables and apply filters, but a colleague suggests this business-facing filtering logic belongs elsewhere.*
>
> **Reasoning:** general-purpose conforming/joining across sources is appropriate for Silver, but **filtering meant for a specific business consumption pattern** (a particular report's definition of "active customer," for example) is better placed in **Gold**, so that Silver stays a general-purpose, reusable layer rather than being shaped around one downstream use case.

> 💡 **Exam tip:** "where should deduplication / cross-source conforming happen" → **Silver**. "Where should the aggregate table that BI tools query live" → **Gold**. "Where does the immutable, replayable historical record live" → **Bronze**.
`,
  },
  {
    id: 'TRA-merge-into-scd',
    domain: 'TRA',
    order: 3,
    title: 'MERGE INTO and Slowly Changing Dimensions (SCD Type 1 & 2)',
    summary: 'Upserting changes into a table, and preserving history with SCD Type 2.',
    contentMd: `
\`MERGE INTO\` is Delta's upsert statement: match incoming rows against an existing table on a key, and decide what happens on match / no-match.

## Basic MERGE (SCD Type 1 — overwrite)

**SCD Type 1** simply overwrites the old value with the new one — no history is kept.

\`\`\`sql
MERGE INTO target t
USING source s
ON t.customer_id = s.customer_id
WHEN MATCHED THEN
  UPDATE SET t.email = s.email, t.updated_at = s.updated_at
WHEN NOT MATCHED THEN
  INSERT (customer_id, email, updated_at) VALUES (s.customer_id, s.email, s.updated_at)
\`\`\`

Use Type 1 when you only care about the **current** value of an attribute (e.g. a corrected typo) and don't need to know what it used to be. \`MERGE\` also supports \`WHEN NOT MATCHED BY SOURCE\`, which lets you handle rows present in the **target** but missing from the **source** (e.g. soft-deleting records that no longer exist upstream).

## SCD Type 2 — preserve history

**SCD Type 2** keeps every historical version of a row as a separate record, with validity windows (\`effective_date\` / \`end_date\`) and a flag for the current row. This needs a two-step MERGE pattern:

1. **Close out** the old current row for any key whose attributes changed (set \`end_date\` and \`is_current = false\`).
2. **Insert** a new row with the updated attributes, \`is_current = true\`, and no \`end_date\`.

\`\`\`sql
MERGE INTO dim_customer t
USING (
  SELECT s.customer_id, s.email, s.address, current_timestamp() AS effective_date
  FROM staged_updates s
) s
ON t.customer_id = s.customer_id AND t.is_current = true
WHEN MATCHED AND (t.email <> s.email OR t.address <> s.address) THEN
  UPDATE SET t.end_date = s.effective_date, t.is_current = false
WHEN NOT MATCHED THEN
  INSERT (customer_id, email, address, effective_date, end_date, is_current)
  VALUES (s.customer_id, s.email, s.address, s.effective_date, NULL, true)
\`\`\`

A second \`MERGE\` (or \`INSERT\`) is then needed to add the fresh "new current" row for keys that were closed out, since a single \`MERGE\` statement can't both update an existing row **and** insert a brand-new row for the *same* matched key in one pass.

## Why this matters for analytics

SCD Type 2 dimension tables let you answer **point-in-time** questions correctly — "what was this customer's address when they placed this order?" — by joining facts to the dimension row that was valid **at that time**, instead of always getting today's value.

\`\`\`mermaid
flowchart TD
    A["Incoming change\\n(customer_id=42, new address)"] --> B{"Row exists\\nwith is_current=true?"}
    B -- "No" --> C["INSERT new current row"]
    B -- "Yes, attributes changed" --> D["UPDATE old row:\\nend_date = now, is_current = false"]
    D --> E["INSERT new row:\\neffective_date = now, is_current = true"]
    B -- "Yes, unchanged" --> F["No-op"]
\`\`\`

## Practice check

> **Scenario:** *A junior data engineer usually uses \`INSERT INTO\` to write data into a Delta table, but a senior engineer suggests using another approach for a nightly load that both updates existing customer records and inserts new ones.*
>
> **Reasoning:** \`INSERT INTO\` cannot conditionally update existing rows — it only appends. Whenever a load needs to **update matching rows and insert new ones in a single operation**, \`MERGE INTO\` is the correct tool; plain \`INSERT INTO\` would either fail on a primary-key conflict or create duplicate rows depending on the table's constraints.

> 💡 **Exam tip:** "we need to know what a customer's address was at the time of a historical order" is the signature phrase for **SCD Type 2**. "We just want the latest value, history doesn't matter" is **SCD Type 1**.
`,
  },
  {
    id: 'TRA-dataframe-joins-aggregations',
    domain: 'TRA',
    order: 4,
    title: 'PySpark DataFrame transformations: joins, aggregations, and grouping',
    summary:
      'The core DataFrame API for combining and summarizing data — join types, groupBy/agg, and common gotchas.',
    contentMd: `
A large share of Transformation-domain questions show a PySpark code block and ask what it produces, or ask which method call fills a blank. Reading these precisely — especially join types and null handling — is the single highest-leverage skill for this domain.

## Join types

\`\`\`python
df1.join(df2, on="product_id", how="inner")   # default is "inner" if how= is omitted
\`\`\`

| \`how=\` | Keeps |
| --- | --- |
| \`inner\` (default) | Only rows with a match in **both** DataFrames |
| \`left\` / \`left_outer\` | All rows from the **left** DataFrame; unmatched right-side columns are \`NULL\` |
| \`right\` / \`right_outer\` | All rows from the **right** DataFrame; unmatched left-side columns are \`NULL\` |
| \`full\` / \`outer\` / \`full_outer\` | All rows from **both** sides; unmatched columns on either side are \`NULL\` |
| \`left_semi\` | Only rows from the **left** DataFrame that have a match in the right — **none of the right DataFrame's columns are included** in the output |
| \`left_anti\` | Only rows from the **left** DataFrame that have **no** match in the right — the "what's missing" join |

\`left_semi\` and \`left_anti\` are the two that trip people up: they filter the left side based on whether a match exists, but never actually add columns from the right side. If a question asks for "products that have never been reviewed" (products with **no** matching row in a reviews table), that's \`left_anti\`. If it asks for "products that include a column indicating available colors" by joining against a colors lookup **without duplicating rows for every color** (existence check only), that's typically \`left_semi\`.

### Two students/doctors/teachers-style questions

A recurring exam pattern: two DataFrames share a key column (e.g. \`doctor_id\`, \`teacher_id\`, \`student_id\`) and the question asks for a specific combination result — practice mapping the **plain-English description to the join type** rather than the domain (doctors vs teachers is just flavor text):

- "Include all students with their course, showing NULL where a student has no matching enrollment" → \`left\` join, \`students\` on the left.
- "Only students who have never enrolled in any course" → \`left_anti\`.
- "A DataFrame that includes only matching pairs from both sides" → \`inner\` (the default).

## groupBy / agg

\`\`\`python
from pyspark.sql import functions as F

result_df = (df
    .groupBy("customer_id")
    .agg(
        F.max("amount").alias("max_amount"),
        F.min("amount").alias("min_amount"),
    ))
\`\`\`

- \`groupBy(...)\` alone returns a \`GroupedData\` object — it is **not** a DataFrame and can't be displayed/collected directly; it must be followed by an aggregation (\`.agg()\`, \`.count()\`, \`.sum()\`, etc.) to produce a result DataFrame.
- Multiple aggregate expressions are combined inside a single \`.agg(...)\` call, each aliased to a clear output column name — omitting \`.alias(...)\` produces an auto-generated, hard-to-read column name like \`max(amount)\`.

## Uniqueness and deduplication

\`\`\`python
df.dropDuplicates(["user_id", "product_id"])       # unique combination of these columns
df.dropDuplicates()                                 # unique across ALL columns
df.distinct()                                        # equivalent to dropDuplicates() with no columns
\`\`\`

For "uniqueness at the \`product_id\` level" (one row per product, regardless of duplicate visit events), \`dropDuplicates(["product_id"])\` is the direct answer — \`distinct()\` would only dedupe rows that are **entirely** identical across every column, which is a different (usually wrong) result when other columns like \`timestamp\` vary between the "duplicate" rows.

## Creating relational objects without tables

\`\`\`python
df.createOrReplaceTempView("session_view")   # SQL-queryable, scoped to THIS SparkSession only
\`\`\`

When a scenario says the result "will only be used in the current session, and doesn't need to persist," a **temporary view** (not a permanent table, and not a global temp view — see the Views topic) is the answer — it avoids leaving a permanent object behind in the catalog for a throwaway analysis.

## Exploring a DataFrame quickly

\`\`\`python
df.summary()   # count, mean, stddev, min, 25%, 50%, 75%, max for numeric/string columns
df.describe()  # similar, narrower set of statistics (no percentiles)
\`\`\`

\`df.summary()\` is the broader, more detailed profiling call — the answer when a question wants percentile/quartile information in addition to basic count/mean/stddev.

\`\`\`mermaid
flowchart LR
    L["Left DF"] --> J{"Join type"}
    R["Right DF"] --> J
    J -->|"inner"| I["Matched rows only"]
    J -->|"left"| Lo["All left + matched right\\n(NULL if unmatched)"]
    J -->|"left_semi"| Ls["Left rows WITH a match\\n(no right columns)"]
    J -->|"left_anti"| La["Left rows WITHOUT a match\\n(no right columns)"]
\`\`\`

## Practice check

> **Scenario:** *A data analyst has two DataFrames, \`products_df\` and \`reviews_df\`, both with a \`product_id\` column, and needs a DataFrame containing every product regardless of whether it has any reviews, with review columns present when they exist and \`NULL\` otherwise.*
>
> **Reasoning:** "every row from one side, matched columns from the other where they exist, \`NULL\` otherwise" is the definition of a **left outer join** with \`products_df\` as the left side: \`products_df.join(reviews_df, "product_id", "left")\`.

> 💡 **Exam tip:** whenever a join scenario says "only from the left, and don't include any columns from the right" — that's **not** an inner or left join, it's \`left_semi\` (match exists) or \`left_anti\` (match doesn't exist). Missing this distinction is one of the most common ways to lose points in this domain.
`,
  },
  {
    id: 'TRA-data-cleaning-casting',
    domain: 'TRA',
    order: 5,
    title: 'Data cleaning: casting, null handling, and string/date parsing',
    summary: 'CAST vs. TRY_CAST, dropna/fillna/COALESCE, and turning messy strings into structured columns.',
    contentMd: `
Data-quality validation questions in this domain almost all revolve around **what happens to a value that doesn't fit the target type**, and how to handle **missing** values deliberately rather than by accident.

## CAST vs. TRY_CAST

\`\`\`sql
SELECT CAST('100$' AS INT);      -- ERRORS (or returns NULL, in ANSI-off mode) — '100$' isn't a valid integer
SELECT TRY_CAST('100$' AS INT);  -- Always returns NULL on failure — never errors

SELECT COALESCE(TRY_CAST('100$' AS INT), 0);  -- Falls back to 0 when the cast fails
\`\`\`

- Plain \`CAST\`, with Databricks' default **ANSI SQL mode enabled**, **throws an error** (\`NumberFormatException\`) when a value cannot be converted — this stops the whole query/job, which is desirable when malformed data should be caught loudly rather than silently swallowed.
- \`TRY_CAST\` **never errors** — a value that can't be converted simply becomes \`NULL\`, letting the rest of the query continue. This is the tool for **validating incoming data without failing the whole pipeline** on a single bad row.
- Wrapping \`TRY_CAST\` in \`COALESCE(..., default_value)\` is the standard pattern for **substituting a sentinel default** (e.g. \`0\`, or a placeholder string) instead of leaving a \`NULL\` behind.

The Python-style function call syntax \`INT("100$")\` (rather than \`CAST(... AS INT)\`) is **not valid Spark SQL** — a question showing that syntax and asking what it does is testing whether you recognize it as invalid/an error, not a real casting mechanism.

## Handling nulls in PySpark

\`\`\`python
df.dropna()                                   # drops rows with ANY null value, in any column
df.dropna(subset=["order_id", "amount"])       # drops rows with a null in EITHER of these specific columns
df.na.fill({"source": "unknown"})              # fills nulls in the "source" column with "unknown" — leaves other columns' nulls untouched
df.fillna(0, subset=["amount"])                # fills nulls in "amount" with 0
\`\`\`

- \`dropna(subset=[...])\` only considers the **listed** columns when deciding whether to drop a row — nulls in other, unlisted columns don't cause a row to be dropped.
- \`na.fill({...})\` with a **dictionary** fills a **different** value **per named column**, and only touches the columns explicitly listed in the dictionary — this is the pattern to recognize when a question shows a fill call and asks "what happens to nulls in columns NOT mentioned" (answer: they're left as \`NULL\`, unchanged).

## String and date parsing

\`\`\`python
from pyspark.sql import functions as F

# "2026-01" -> month column containing 1
df.withColumn("month", F.split(F.col("date_str"), "-")[1].cast("int"))

# "City ZipCode" e.g. "Paris 75015" -> two columns
df = (df
    .withColumn("city", F.split(F.col("location"), " ")[0])
    .withColumn("zip_code", F.split(F.col("location"), " ")[1]))
\`\`\`

\`F.split(column, pattern)\` returns an **array** column — a specific element is then accessed by index (\`[0]\`, \`[1]\`, ...), and the result is often \`.cast(...)\` to the desired type since split output is always string.

## Accessing nested STRUCT columns

\`\`\`sql
-- schema: details STRUCT<name: STRING, category: STRING, pricing: STRUCT<base_price: DOUBLE, ...>>
SELECT details.name, details.pricing.base_price
FROM catalog.schema.products;
\`\`\`

Dot notation drills into nested \`STRUCT\` fields at any depth — this is the standard way semi-structured JSON-derived columns (a common Bronze-layer shape) are queried directly in SQL without flattening the table first.

\`\`\`mermaid
flowchart TD
    V["Incoming value"] --> C{"CAST or TRY_CAST?"}
    C -- "CAST, doesn't fit" --> Err["Query/job FAILS\\n(ANSI mode, default)"]
    C -- "TRY_CAST, doesn't fit" --> Null["Returns NULL,\\nquery continues"]
    Null --> Co{"Wrapped in COALESCE?"}
    Co -- "Yes" --> Def["Falls back to default value"]
    Co -- "No" --> Keep["Stays NULL"]
\`\`\`

## Practice check

> **Scenario:** *A data engineer validates incoming transaction data with \`SELECT CAST('100$' AS INT);\` and needs to understand the resulting behavior, versus rewriting it to never fail the query while defaulting bad values to zero.*
>
> **Reasoning:** the plain \`CAST\` **throws an error** under Databricks' default ANSI SQL behavior (a hard stop). To validate without failing and default bad values to \`0\`, the rewrite is \`SELECT COALESCE(TRY_CAST('100$' AS INT), 0);\` — \`TRY_CAST\` alone would leave it as \`NULL\` rather than \`0\`, so \`COALESCE\` is still required to get the zero default.

> 💡 **Exam tip:** \`CAST\` = fails loudly on bad data (ANSI mode). \`TRY_CAST\` = quietly becomes \`NULL\` on bad data. \`COALESCE(TRY_CAST(...), default)\` = quietly becomes a **chosen default** on bad data. Know which failure behavior each one produces, since exam questions frequently swap these three to test the distinction.
`,
  },
  {
    id: 'TRA-lakeflow-declarative-pipelines',
    domain: 'TRA',
    order: 6,
    title: 'Lakeflow Declarative Pipelines: data quality expectations',
    summary:
      'Formerly Delta Live Tables — declaring tables and enforcing data quality with expect / expect_or_drop / expect_or_fail.',
    contentMd: `
**Lakeflow Declarative Pipelines** (formerly known as **Delta Live Tables / DLT**) let you declare the **desired end state** of a table (its query) and have Databricks manage the incremental execution, dependency ordering, and infrastructure — rather than hand-writing and scheduling each transformation step yourself.

## Declaring a table

\`\`\`python
import dlt  # the decorator namespace is commonly imported as "dlt" (also available as "dp")

@dlt.table(
    comment="Cleaned silver-layer transactions"
)
def silver_transactions():
    return (
        dlt.read_stream("bronze_transactions")
        .filter("amount IS NOT NULL")
    )
\`\`\`

\`dlt.read_stream(...)\` reads another table **within the same pipeline** incrementally; \`dlt.read(...)\` reads it as a full batch snapshot on every run. Using \`read_stream\` between Bronze and Silver tables in the same pipeline is what makes the whole pipeline incremental end-to-end, rather than recomputing Silver from scratch on every run.

## Data quality expectations

Expectations declare a **data quality constraint** and what should happen to rows that violate it:

\`\`\`python
@dlt.table
@dlt.expect_or_drop("recent_transaction", "transaction_date >= '2020-01-01'")
def silver_transactions():
    return dlt.read_stream("bronze_transactions")
\`\`\`

| Decorator | Behavior on a violating row |
| --- | --- |
| \`@dlt.expect(name, condition)\` | Row is **kept**; the violation is only recorded in pipeline metrics for monitoring |
| \`@dlt.expect_or_drop(name, condition)\` | Row is **silently dropped** from the output table; the drop is recorded in metrics |
| \`@dlt.expect_or_fail(name, condition)\` | The **entire pipeline run fails** the moment a violating row is encountered |

Choosing between these is a direct trade-off between **data completeness** and **strictness**: \`expect\` is for "track it but don't act," \`expect_or_drop\` is for "this bad data should never reach the table but shouldn't stop the whole run," and \`expect_or_fail\` is for "this condition being violated means something is seriously wrong upstream and a human must be alerted immediately" (e.g. a primary key suddenly being null across an entire batch).

Multiple expectations can be combined with a **dictionary** of \`{name: condition}\` pairs:

- \`@dlt.expect_all({...})\` — keeps every row (valid or not), same as applying \`expect\` to each condition, just written once.
- \`@dlt.expect_all_or_drop({...})\` — drops any row violating **any** of the listed conditions.
- \`@dlt.expect_all_or_fail({...})\` — fails the pipeline on the first violation of **any** listed condition.

Use \`expect_all\` (not \`_or_drop\`/\`_or_fail\`) when the requirement is "invalid records should still be written to the target, while metrics about violations are captured" — it's the *bulk* version of plain \`expect\`, not of the dropping/failing variants.

## Declarative CDC: AUTO CDC INTO (replacing manual MERGE for SCD)

Instead of hand-writing the two-step \`MERGE\` pattern shown earlier for SCD Type 2, modern Lakeflow Declarative Pipelines SQL provides a **declarative CDC** statement that implements the whole upsert-with-history pattern from a CDC source in one definition:

\`\`\`sql
CREATE OR REFRESH STREAMING TABLE dim_customers;

CREATE FLOW customer_flow AS
AUTO CDC INTO dim_customers
FROM STREAM(customers_bronze_cdc)
KEYS (customer_id)
SEQUENCE BY operation_timestamp
STORED AS SCD TYPE 2;
\`\`\`

- **\`KEYS (...)\`** — the business key(s) used to match incoming changes against existing rows (like the \`ON\` clause of a \`MERGE\`).
- **\`SEQUENCE BY ...\`** — the column that orders changes, so out-of-order CDC events are applied correctly.
- **\`STORED AS SCD TYPE 1\`** — overwrites each key's row in place, keeping only the latest version (no history).
- **\`STORED AS SCD TYPE 2\`** — automatically preserves every historical version with validity windows, without you writing the two-step close-out-then-insert \`MERGE\` logic by hand.

This has superseded the older \`APPLY CHANGES INTO\` syntax. If a question explicitly says to avoid a manual \`MERGE\` and use the "built-in declarative CDC pattern," \`AUTO CDC INTO ... STORED AS SCD TYPE 2\` is the expected answer — a hand-written \`MERGE\` (correct as a general technique, see the MERGE INTO topic) is the wrong answer specifically when the question asks for the declarative pipelines-native mechanism.

## Pipeline execution modes

| Mode | Behavior |
| --- | --- |
| **Triggered** | Processes all currently-available data (like \`trigger(availableNow=True)\`), then stops compute — the default choice for periodic batch-style data (e.g. arriving every few hours) where near-real-time latency isn't required, since it minimizes cost by not paying for idle compute between runs. |
| **Continuous** | Keeps the pipeline's cluster running permanently, processing new data as it arrives — for genuinely low-latency streaming needs, at the cost of 24/7 compute billing. |
| **Development mode** | Keeps the cluster "warm" between pipeline updates during active development, so each edit-run-debug iteration doesn't pay cluster startup time — the fix when a team's iterative development cycle feels slow because "each update starts compute, runs, and then terminates." Switched to **production mode** for the deployed/scheduled pipeline. |

## @dp.temporary_view

\`@dp.temporary_view\` (or \`@dlt.view\`) defines a **logical, pipeline-scoped view**: its result is computed on demand when queried, nothing is persisted physically, and it's only usable **within the same pipeline's graph** — not queryable from outside the pipeline, and not the same thing as a standard Spark session temp view (which is scoped to a notebook session, not a pipeline).

## CONSTRAINT syntax (SQL declarative pipelines / plain tables)

The same concepts are expressible in SQL, both inside a Lakeflow Declarative Pipeline and as a plain Delta table constraint:

\`\`\`sql
-- Inside a declarative pipeline definition:
CREATE OR REFRESH STREAMING TABLE silver_transactions (
  CONSTRAINT valid_id EXPECT (transaction_id IS NOT NULL) ON VIOLATION DROP ROW
)
AS SELECT * FROM STREAM(bronze_transactions);

-- On an existing plain Delta table (enforced at write time, not a pipeline expectation):
ALTER TABLE transactions
  ADD CONSTRAINT transaction_id_not_null CHECK (transaction_id IS NOT NULL);
ALTER TABLE transactions
  ADD CONSTRAINT transaction_date_not_null CHECK (transaction_date IS NOT NULL);
\`\`\`

A plain Delta \`CHECK\` constraint (added via \`ALTER TABLE ... ADD CONSTRAINT\`) behaves like \`expect_or_fail\`: any write that would violate it is **rejected outright** — there is no "drop the row and continue" option for a table-level \`CHECK\` constraint the way there is for a pipeline expectation.

## Streaming tables vs. materialized views

Lakeflow Declarative Pipelines can declare two kinds of managed relational objects, chosen with the return type of the transformation:

- **Streaming table**: processes each input row incrementally, exactly once — appropriate for Bronze/Silver ingestion-style flows.
- **Materialized view**: recomputed (fully or incrementally, where possible) to always reflect the *current* result of its defining query — appropriate for Gold-layer aggregates that need to always be fully up to date relative to their inputs, even when an input row was updated or deleted (which a pure streaming table can't naturally reflect).

\`\`\`mermaid
flowchart LR
    B["bronze_transactions\\n(streaming table)"] -->|"dlt.read_stream"| S["silver_transactions\\n(streaming table)"]
    S -->|"expectations enforced"| G["gold_daily_summary\\n(materialized view)"]
    S -.->|"expect_or_drop violation"| Dropped["Row dropped,\\nmetrics recorded"]
    S -.->|"expect_or_fail violation"| Failed["Pipeline run FAILS"]
\`\`\`

## Practice check

> **Scenario:** *A data engineer defines \`@dlt.expect_or_drop("recent_transaction", "transaction_date >= '2020-01-01'")\` on a Silver table. A batch arrives where 5% of rows have a \`transaction_date\` before 2020.*
>
> **Reasoning:** those 5% of rows are **silently excluded** from the output table — the pipeline run itself **succeeds**, and the drop counts are visible in the pipeline's data quality metrics/event log for monitoring. Nothing fails; nothing needs manual intervention unless the team is watching the metrics and decides the drop rate is unacceptable.

> 💡 **Exam tip:** map the verb in the question directly to the decorator: "should be recorded but kept" → \`expect\`. "Should never appear in the output, but the pipeline should keep running" → \`expect_or_drop\`. "Should stop everything immediately" → \`expect_or_fail\`.
`,
  },
  {
    id: 'TRA-window-functions',
    domain: 'TRA',
    order: 7,
    title: 'Window functions: row_number, RANK, LEAD/LAG, and running totals',
    summary:
      'Ranking, deduplicating on "latest per key", and cumulative aggregations without collapsing rows.',
    contentMd: `
Window functions compute a value **per row** using a calculation that spans a related group of rows (a "window") — without collapsing the result into one row per group the way \`groupBy\` does. This is the single highest-yield PySpark/SQL skill gap for this domain: dedup-to-latest, ranking, and running totals all rely on it.

## The anatomy of a window

\`\`\`python
from pyspark.sql import Window
from pyspark.sql import functions as F

w = Window.partitionBy("store_id").orderBy("transaction_date")
\`\`\`

- **\`partitionBy(...)\`** — like \`groupBy\`, but doesn't collapse rows: it defines which rows are "in the same group" for the calculation (e.g. keep each store's running total independent of other stores).
- **\`orderBy(...)\`** — defines the sequence within each partition, required for ranking functions and running totals to make sense.
- **\`.rowsBetween(...)\`** — optionally narrows the "frame" of rows considered at each row, e.g. \`Window.unboundedPreceding\` to \`Window.currentRow\` for a running total from the start of the partition up to the current row.

There is no \`Window.groupBy(...)\` — partitioning a window always uses \`partitionBy\`.

## Ranking and "latest per key"

\`\`\`python
w = Window.partitionBy("package_id").orderBy(F.col("update_time").desc())

latest_status = (df
    .withColumn("rn", F.row_number().over(w))
    .filter("rn = 1"))
\`\`\`

\`row_number()\` assigns a unique, sequential rank (1, 2, 3...) within each partition, based on the \`orderBy\`. Ordering **descending** by a timestamp and filtering \`rn = 1\` is the standard pattern for "keep only the most recent record per key" — a very common Silver-layer deduplication requirement that \`dropDuplicates()\` **cannot** express, since \`dropDuplicates\` has no way to prefer one duplicate over another based on a timestamp; it just keeps an arbitrary first-seen row.

To instead keep the **oldest** (first) row per key, order **ascending** and filter \`rn = 1\` — mixing this up (descending when the requirement wants "oldest," or vice versa) is one of the most common ways to get this pattern backwards.

\`RANK()\` differs from \`row_number()\` in how it handles ties: rows with equal \`orderBy\` values get the **same** rank, and the next rank skips accordingly (1, 1, 3 — not 1, 1, 2). Use \`row_number()\` when you need a strict, tie-broken unique sequence (like deduplication); use \`RANK()\` when ties should genuinely share a rank (e.g. a leaderboard where equal scores tie).

## LEAD and LAG

\`LEAD(col)\` and \`LAG(col)\` look at a **future** or **past** row within the same partition/order, without a self-join:

\`\`\`sql
SELECT store_id, report_date, daily_revenue,
  LAG(daily_revenue) OVER (PARTITION BY store_id ORDER BY report_date) AS previous_day_revenue
FROM sales
\`\`\`

\`LEAD\` reads ahead (e.g. "what was the *next* value"), \`LAG\` reads behind (e.g. "what was the *previous* value") — useful for day-over-day comparisons without a manual self-join.

## Running totals

\`\`\`sql
SELECT store_id, report_date, daily_revenue,
  SUM(daily_revenue) OVER (
    PARTITION BY store_id
    ORDER BY report_date
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS ytd_revenue
FROM sales
\`\`\`

\`PARTITION BY store_id\` keeps each store's accumulation independent; \`ORDER BY report_date\` defines the accumulation sequence; the frame \`UNBOUNDED PRECEDING\` to \`CURRENT ROW\` sums every row from the start of the partition up to (and including) the current row — a classic year-to-date running total. Getting the \`PARTITION BY\`/\`ORDER BY\` backwards (partitioning by date instead of by store, for instance) would mix totals across stores instead of keeping them independent.

\`\`\`mermaid
flowchart LR
    D["DataFrame"] --> P["Window.partitionBy(key)\\n.orderBy(sequence_col)"]
    P --> RN["row_number()\\n→ dedup / latest-per-key"]
    P --> RK["RANK()\\n→ ranking with ties"]
    P --> LL["LEAD() / LAG()\\n→ next/previous row"]
    P --> RT["SUM() OVER (... ROWS BETWEEN\\nUNBOUNDED PRECEDING AND CURRENT ROW)\\n→ running total"]
\`\`\`

## Practice check

> **Scenario:** *A Silver table tracks delivery package status changes with duplicates due to retries. The requirement is to show only the latest status event per package, but only for packages whose latest status is "Delivered."*
>
> **Reasoning:** create \`row_number()\` partitioned by \`package_id\`, ordered by \`update_time DESC\` — this ranks the most recent event as 1 per package. Then filter \`WHERE rn = 1 AND status = 'Delivered'\`, combining "the latest row" with the business condition in one pass. \`dropDuplicates(["package_id"])\` cannot express "latest by timestamp," since it has no ordering concept.

> 💡 **Exam tip:** any scenario about keeping "the most recent," "the latest," or "the first" record **per key** — when plain \`dropDuplicates\` isn't enough because *which* duplicate to keep matters — is a \`row_number()\` + window + filter question, not a \`groupBy\`/\`dropDuplicates\` question.
`,
  },
  {
    id: 'TRA-higher-order-json-functions',
    domain: 'TRA',
    order: 8,
    title: 'Higher-order array functions and JSON parsing',
    summary:
      'FILTER and TRANSFORM on arrays, exploding nested structures, and turning JSON strings into structured columns.',
    contentMd: `
Semi-structured data (nested arrays, JSON-as-a-string columns) needs a different toolkit than flat columns — this shows up constantly in Bronze-to-Silver transformations.

## Higher-order functions on arrays

Spark SQL's higher-order functions apply a lambda expression to each element of an **array** column, without exploding it into separate rows:

\`\`\`sql
-- Keep only ACTIVE items in the array, still one row per order
SELECT order_id,
  FILTER(items, i -> i.status = 'ACTIVE') AS active_items
FROM orders;

-- Given faculties.students: ARRAY<STRUCT<total_courses: INT, ...>>
SELECT faculty_id,
  FILTER(students, i -> i.total_courses < 3) AS few_courses_students
FROM faculties;
\`\`\`

- **\`FILTER(array, lambda)\`** — returns a new array containing only the elements matching the predicate. The array shrinks; the **row count stays the same** (one row per order, still).
- **\`TRANSFORM(array, lambda)\`** — applies a mapping to every element, returning a same-length array of transformed values (e.g. doubling every number in an array). It does **not** filter anything out.

If a requirement says "preserve one row per order, without exploding the array" while removing some elements, that's \`FILTER\` — not \`EXPLODE\` (which changes the grain to one row per array element) and not \`TRANSFORM\` (which doesn't remove elements).

## explode(), posexplode(), and flatten()

\`\`\`python
from pyspark.sql import functions as F

# One row per array element (grain change: order -> item)
df.select("order_id", F.explode("items_purchased").alias("item"))

# Same, but also keeps the element's position in the array
df.select("order_id", F.posexplode("items_purchased"))

# Merges an ARRAY<ARRAY<T>> into a single ARRAY<T> — still one row, no grain change
df.select("order_id", F.flatten("nested_array_column"))
\`\`\`

\`explode()\` is the tool when the requirement genuinely wants **one row per array element** — e.g. "each row represents a single unit of product sold" from a Bronze table with a nested array of purchased items. \`flatten()\` only merges nested arrays into a flat array; it never produces additional rows.

## Parsing JSON stored as a STRING column

A Bronze column holding raw JSON **text** (not yet a typed \`STRUCT\`) needs an explicit parsing step before its fields can be queried directly:

\`\`\`sql
-- Extract one field at a time from a JSON string (JSONPath syntax)
SELECT get_json_object(payload, '$.device_id') AS device_id,
       get_json_object(payload, '$.temperature') AS temperature
FROM bronze_iot;

-- Databricks SQL's colon shorthand, equivalent for simple top-level fields
SELECT payload:device_id AS device_id, payload:temperature AS temperature
FROM bronze_iot;
\`\`\`

\`\`\`python
from pyspark.sql import functions as F

# Parse the whole JSON string into a typed struct column in one shot,
# given a known schema
logs_df.withColumn("parsed_data", F.from_json("raw_payload", log_schema))

# The reverse: struct -> JSON string
logs_df.withColumn("raw_payload", F.to_json("parsed_data"))
\`\`\`

- **\`get_json_object(col, '$.path')\`** and the **\`:\`** colon operator — extract **one field at a time** from a JSON string, without needing a predefined schema.
- **\`from_json(col, schema)\`** — parses the **entire** JSON string into a typed \`STRUCT\` column in one call, given a schema (or a DDL string) — the right tool when you need several fields at once, or nested structure, rather than pulling fields out one at a time.
- **\`schema_of_json(json_string)\`** — infers a schema **from a sample JSON string**, returned as a \`STRUCT<...>\` type definition — useful for getting a starting schema to pass into \`from_json\` when you don't want to write it by hand.
- **\`to_json(col)\`** — the reverse of \`from_json\`: serializes a struct back into a JSON string.

Once a column is already a typed \`STRUCT\` (not a JSON string), none of the above are needed — plain **dot notation** reaches into nested fields directly: \`SELECT details.pricing.base_price FROM products\`.

\`\`\`mermaid
flowchart TD
    Payload["payload column"] --> T{"Already a STRUCT,\\nor still a JSON string?"}
    T -- "STRUCT" --> Dot["Dot notation:\\ndetails.pricing.base_price"]
    T -- "JSON string, one field" --> GJO["get_json_object() / :"]
    T -- "JSON string, many fields\\nat once" --> FJ["from_json(col, schema)"]
    Arr["ARRAY<STRUCT<...>> column"] --> F1{"Keep row grain,\\nor explode to one row per item?"}
    F1 -- "Keep grain, remove some elements" --> FIL["FILTER(array, lambda)"]
    F1 -- "One row per element" --> EXP["explode() / posexplode()"]
\`\`\`

## Practice check

> **Scenario:** *An IoT Bronze table has a \`payload\` STRING column containing JSON like \`{"device_id":"A1","temperature":22.5}\`. Two queries need to extract \`device_id\` and \`temperature\` as columns for a Silver table.*
>
> **Reasoning:** since \`payload\` is a JSON **string** (not yet a struct), the correct tools are \`get_json_object(payload, '$.device_id')\` or the equivalent \`payload:device_id\` colon syntax — plain dot notation (\`payload.device_id\`) only works on an already-typed \`STRUCT\`, and would fail here.

> 💡 **Exam tip:** "keep the same number of rows, just trim an array's contents" → \`FILTER\`. "One row per array element" → \`explode\`. "A column is JSON **text**, not yet structured" → \`get_json_object\`/\`:\` (one field) or \`from_json\` (many fields at once, needs a schema).
`,
  },
  {
    id: 'TRA-sql-udfs-ctas',
    domain: 'TRA',
    order: 9,
    title: 'SQL user-defined functions and CTAS',
    summary:
      'Writing reusable SQL functions, and understanding what CREATE TABLE AS SELECT does and doesn\\u2019t let you control.',
    contentMd: `
## SQL user-defined functions

\`\`\`sql
CREATE OR REPLACE FUNCTION format_name(fname STRING, lname STRING)
RETURNS STRING
RETURN INITCAP(fname) || ' ' || INITCAP(lname);
\`\`\`

The exact syntax matters on the exam — every one of these pieces is required:

- **\`CREATE [OR REPLACE] FUNCTION name(param TYPE, ...)\`** — every parameter needs an explicit type. There is no separate \`CREATE UDF\` command.
- **\`RETURNS TYPE\`** — the return type is mandatory and must be declared with \`RETURNS\`, not inferred.
- **\`RETURN expression\`** — a single expression (not a \`SELECT\` statement, and not wrapped in a string like \`AS 'SELECT ...'\`).

A named function like this can then be called anywhere a built-in SQL function could be: \`SELECT format_name(first, last) FROM employees\`. This is distinct from the **masking/filtering** functions used with \`SET MASK\`/\`SET ROW FILTER\` (see the Governance domain) — those are the same \`CREATE FUNCTION\` mechanism, just applied to a specific governance purpose.

## Named parameters in Databricks SQL

\`\`\`sql
SELECT * FROM products WHERE product_id = :pid;
\`\`\`

A **named parameter** uses a colon prefix (\`:pid\`) — this lets a saved query accept a runtime input value (e.g. from a dashboard filter or a parameterized query call) without string-concatenating SQL. \`$pid\` and unprefixed \`pid\` are not valid parameter syntax in Databricks SQL; \`\${var.pid}\` is unrelated bundle-variable syntax (see the CI/CD domain), not a SQL query parameter.

## CTAS: CREATE TABLE AS SELECT

\`\`\`sql
CREATE TABLE gold.daily_summary AS
SELECT report_date, SUM(revenue) AS total_revenue
FROM silver.sales
GROUP BY report_date;
\`\`\`

Three facts about CTAS the exam tests directly:

- The table is **populated with data at creation time** — CTAS both creates the table and inserts the query's results in the same statement, unlike a plain \`CREATE TABLE\` (which only defines an empty schema).
- The **schema is always inferred automatically** from the \`SELECT\` query's output — CTAS does **not** support manually declaring column names/types column-by-column the way a plain \`CREATE TABLE (col1 TYPE, ...)\` does. If a requirement needs explicit, manually-declared types, CTAS is the wrong tool.
- CTAS defaults to creating a **managed** Delta table; to instead register an external table over existing files in a specific format, use \`CREATE TABLE ... USING <format> ... LOCATION ...\` (e.g. \`USING CSV\` with \`OPTIONS\` for header/delimiter), which does **not** populate data automatically the way CTAS does — it just registers the table against existing files.

## Practice check

> **Scenario:** *A team wants a SQL user-defined function that accepts a first and last name, capitalizes each value, and returns the formatted full name.*
>
> **Reasoning:** \`CREATE OR REPLACE FUNCTION format_name(fname STRING, lname STRING) RETURNS STRING RETURN INITCAP(fname) || ' ' || INITCAP(lname);\` — typed parameters, an explicit \`RETURNS\` type, and a single \`RETURN\` expression are all required; a version using \`AS 'SELECT ...'\` or omitting parameter types is invalid syntax.

> 💡 **Exam tip:** "which of the following is NOT true about CTAS" questions almost always hinge on the **schema-inference-only** rule — CTAS never lets you hand-declare column types in the same statement.
`,
  },
];
