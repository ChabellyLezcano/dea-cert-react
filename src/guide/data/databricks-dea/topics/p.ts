import type { RawStudyTopic } from '@/types/guide.types';

export const pTopics: RawStudyTopic[] = [
  {
    id: 'P-control-data-plane',
    domain: 'P',
    order: 1,
    title: 'Platform architecture: control plane vs. data plane',
    summary: 'What Databricks manages for you, what runs in your cloud account, and why that split matters.',
    contentMd: `
Databricks splits its architecture into two halves that live in **different places** and are owned by **different parties**. Almost every "where does X run" or "where is X hosted" exam question comes back to this split, so it is worth internalizing completely rather than memorizing a table.

## Control plane

The control plane is hosted **in Databricks' own cloud account** (AWS/Azure/GCP, depending on your deployment) and includes:

- The web application: notebooks UI, workspace browser, job scheduler UI, Catalog Explorer.
- The **cluster manager**, which decides when to launch/resize/terminate VMs in the data plane on your behalf.
- Databricks SQL's query history, query optimizer front-end, and dashboards metadata.
- Unity Catalog's **metadata** service — the catalog/schema/table registry itself, permissions, lineage graph, audit log storage.
- Workflow/Jobs orchestration state — the DAG definitions, schedules, and run history bookkeeping.
- Secrets storage (Databricks-managed secret scopes).

No customer **data** ever needs to reside in the control plane for normal operation — it only stores metadata *about* your data (table names, schemas, permissions, query text), not the data itself.

## Data plane

The data plane is where your **actual data and compute** live:

- **Classic compute**: VMs that make up clusters and classic SQL warehouses run **inside your own cloud account** — you can see them in your AWS/Azure/GCP console, and you pay your cloud provider for them directly (plus Databricks Units to Databricks).
- **Serverless compute** (serverless SQL warehouses, serverless notebooks/jobs): Databricks manages the compute layer inside a Databricks-managed, network-isolated environment — you don't see the VMs in your own cloud account, but your **data still stays in your own cloud storage** (S3/ADLS/GCS). Serverless removes infrastructure management, not data residency.
- Cluster-local (ephemeral) storage and the object storage your tables actually point at.
- The Spark driver and executor **processes** that execute your notebook cells, SQL queries, and Job tasks.

## Why this split matters for the exam

- **Notebook code and Spark jobs execute in the data plane.** The control plane only sends the job/notebook *definition* over the network and receives results/logs back. If a question asks "where does the code in this notebook actually run," the answer is the data plane, regardless of whether the notebook itself is *edited* through the control-plane UI.
- Classic compute needs **network connectivity configured between the two clouds** (VPC peering, PrivateLink/Private Service Connect, customer-managed VPC) because the control plane must reach into your data plane to submit work, monitor cluster health, and stream results/logs back — this is the basis of questions about "secure connectivity between the control plane and customer VPC."
- If a scenario says a **data analyst is worried about where confidential notebook code and its results are stored**, the answer is: the **notebook source and results are stored in the control plane** (as part of the workspace), while the **data the code processes stays in the data plane** (your cloud storage) — these are two different things that get tested as a pair.
- **Serverless compute** still keeps your data in your cloud storage, but the *compute* itself runs in a Databricks-managed environment rather than in resources visible inside your own account — this is what removes the need to size, patch, and manage cluster infrastructure at all, and is the correct answer whenever a question asks for "reduced operational overhead" or "no infrastructure to manage."

\`\`\`mermaid
flowchart LR
    subgraph CP["Control plane (Databricks account)"]
        UI["Workspace UI / REST API"]
        SCH["Job scheduler"]
        UC["Unity Catalog metastore\\n(metadata only)"]
        NB["Notebook source + results"]
    end
    subgraph DP["Data plane"]
        CL["Clusters / SQL Warehouses\\n(classic: your account,\\nserverless: Databricks-managed)"]
        ST["Cloud storage (S3 / ADLS / GCS)\\nalways in YOUR account"]
    end
    UI -- "submit job / notebook" --> SCH
    SCH -- "launch & manage" --> CL
    CL -- "read / write" --> ST
    UC -. "governs access to" .-> ST
\`\`\`

## Practice check

> **Scenario:** *A data engineer schedules a notebook as a Databricks Job to process confidential customer data. They are concerned about where the notebook's source code and the data it processes are physically stored.*
>
> **Reasoning:** the notebook **source code and its results/output** live in the **control plane** (as part of the workspace). The **data it reads and writes** lives in the **data plane** — in your own cloud storage account, never copied into Databricks' control plane. These are two separate answers to two separate halves of the same question — a very common trap is picking only one.

> 💡 **Exam tip:** if a question describes something that touches *your data at rest*, the answer almost always involves the **data plane**. If it describes *scheduling, metadata, notebook source, or the UI*, it's the **control plane**. Unity Catalog is a control-plane *metadata* service, but the data it governs stays in the data plane — don't let "Unity Catalog" alone push you toward "control plane" if the question is really asking about the underlying files.
`,
  },
  {
    id: 'P-compute-clusters',
    domain: 'P',
    order: 2,
    title: 'Compute: all-purpose vs. job clusters, pools, warehouses, and cost controls',
    summary:
      'Choosing and configuring the right compute for interactive work, scheduled jobs, and SQL — and how to keep the bill down.',
    contentMd: `
The exam expects you to know **which compute type fits which workload** and **how to control its cost**, not just that clusters exist.

## Cluster types

| Type | Typical use | Lifecycle |
| --- | --- | --- |
| **All-purpose cluster** | Interactive notebook development, fast iteration and debugging, ad-hoc exploration | Started manually, can be shared by several users, auto-terminates after idle time |
| **Job cluster** | Running a scheduled Job/task | Created automatically when the job starts, **terminated automatically** when it finishes |
| **SQL warehouse** (classic or serverless) | Databricks SQL queries, BI tool connections (Power BI, Tableau) | Auto-scales per query concurrency; serverless removes all infra management |
| **Instance pools** | Not a cluster type by itself — a pool of *idle, pre-warmed* VMs that clusters can attach to | Reduces cluster start-up time; clusters "check out" instances instead of provisioning new ones |

**Job clusters are the recommended default for production Jobs**: they're cheaper (no idle time billed after the run), and they isolate each run's compute from unrelated workloads — an all-purpose cluster shared between analysts and a nightly ETL job is a classic anti-pattern the exam calls out (noisy-neighbor resource contention, unpredictable job start times).

**For fast iteration and debugging during development**, the correct answer is an **all-purpose cluster** — it stays up between runs so you aren't waiting minutes for a fresh cluster to spin up every time you re-run a cell.

## Cost controls

- **Autotermination**: shuts an idle **all-purpose** cluster down after N minutes of inactivity. This is the single most common cost-saving setting to check when a workspace bill looks too high, and the fix for "a cluster with autotermination set to 6 hours is running an incremental job that only needs a few minutes" is to **lower the autotermination timeout**, not to change compute type.
- **Autoscaling**: adds/removes worker nodes within a configured min/max range based on load. Fixes the classic "a job cluster is fixed at 15 workers but the workload varies a lot day to day" scenario — a fixed-size cluster sized for the *peak* wastes money the rest of the time; autoscaling (or right-sizing based on the *typical* load) is the answer.
- **Spot instances**: use spare cloud capacity at a steep discount, at the cost of the instance being reclaimed (interrupted) by the cloud provider with little notice. Best suited for **fault-tolerant, interruption-tolerant workloads** — e.g. worker nodes of a job that can lose a few executors and just re-run those tasks. **Not** appropriate for the cluster driver, or for latency-sensitive/interactive workloads where an interruption would be disruptive.
- **SQL warehouse Auto Stop**: automatically stops a SQL warehouse after a period of no queries, so you don't pay for an idle warehouse sitting around between BI dashboard refreshes — the benefit tested is exactly this: **cost savings from not paying for idle compute**, analogous to autotermination for all-purpose clusters but specific to warehouses.
- **Increasing a SQL warehouse's cluster size** (T-shirt size, e.g. Small → Large) increases the **number of clusters/nodes available to handle concurrent queries faster and handle more simultaneous users** — it's about throughput/concurrency and per-query speed, not about storage.

## Cluster policies

A **cluster policy** is a set of rules (JSON) that constrains what configurations users are allowed to create — e.g. capping the max number of workers, forcing a specific instance type, or hiding the "single user" vs "shared" access-mode toggle. Policies exist so that:

- Admins can control cost (max cluster size, mandatory autotermination limits).
- Non-admin users get a simplified cluster-creation UI with safe defaults.
- Compliance requirements (e.g. mandatory instance types, required tags for cost allocation) are enforced automatically instead of relying on every user remembering to set them.

## Access modes

- **Single user**: full language support (Python, SQL, Scala, R), assigned to one user or service principal — required for some features and certain library installs.
- **Shared**: multiple users can attach simultaneously; enforces Unity Catalog data governance per-user on the same cluster, but has some feature/language restrictions depending on the runtime.

## SQL warehouse tiers

Databricks SQL warehouses come in three tiers, and the exam expects you to pick the right one for a described scenario:

| Tier | Runs in | Advanced features (Predictive I/O, Python UDFs, AI Functions) | Startup |
| --- | --- | --- | --- |
| **Standard / Classic** | Your cloud VPC | No | Slower (minutes) |
| **Pro** | Your cloud VPC (custom network, hybrid/on-prem connectivity possible) | Yes | Slower (minutes) |
| **Serverless** | Databricks-managed environment | Yes | Near-instant, auto-scales per concurrency |

If a scenario needs **both** advanced SQL features (AI Functions, Predictive I/O) **and** connectivity to a custom/on-premises network, **Pro** is the answer — Serverless has the advanced features but doesn't run inside your own VPC. If a scenario only needs the fastest startup, highest concurrency, and zero infrastructure management (no custom network requirement), **Serverless** is the answer.

## Cluster configuration changes require a restart

Init scripts, environment variables, and library installs configured on a cluster are only applied **when the cluster (re)starts** — its runtime environment is built once at startup. If a data engineer adds an environment variable via an init script and then just **detaches/reattaches** a notebook, re-runs cells, or opens a new notebook session, the old environment is still in effect. The cluster itself must be **restarted** for the new configuration to take hold.

\`\`\`mermaid
flowchart TD
    A["Workload"] --> B{"Interactive or scheduled?"}
    B -- "Interactive dev / debugging" --> C["All-purpose cluster\\n(shared, autoterminate)"]
    B -- "Scheduled Job" --> D["Job cluster\\n(ephemeral, per-run)"]
    B -- "SQL / BI tool" --> E["SQL Warehouse\\n(Auto Stop enabled)"]
    C --> F{"Need fast startup\\nacross many runs?"}
    D --> F
    F -- "Yes" --> G["Attach to an Instance Pool"]
    F -- "No" --> H["Provision on demand"]
\`\`\`

## Practice check

> **Scenario:** *A job cluster is configured with a fixed size of 15 workers, but the workload typically needs far fewer during most of the day and only spikes to 15 during a short nightly window. Cloud costs are unexpectedly high.*
>
> **Reasoning:** a fixed-size cluster is billed for 15 workers **the entire time it runs**, even during the hours the workload only needs 2-3. The fix is **autoscaling** (set a min/max range so the cluster shrinks outside the peak window), not simply "use a smaller fixed cluster" (which would be too slow during the peak) or "switch to all-purpose" (irrelevant to the cost driver here).

> 💡 **Exam tip:** "minimize cost for a nightly scheduled pipeline" → **job cluster**, not all-purpose. "Fast iteration while writing/debugging code" → **all-purpose cluster**. "Idle SQL warehouse burning money between dashboard refreshes" → **Auto Stop**. "Fixed-size cluster wastes money outside peak hours" → **autoscaling**. "Fault-tolerant worker nodes at a discount" → **spot instances**.
`,
  },
  {
    id: 'P-delta-lakehouse-foundation',
    domain: 'P',
    order: 3,
    title: 'Delta Lake and the Lakehouse: one platform for warehousing, BI, and ML',
    summary:
      'The open storage format underneath everything, and why it replaces separate BI/analytics/ML platforms.',
    contentMd: `
Several platform-level exam questions test **Delta Lake as a concept** (not the deep mechanics covered in the Transformation domain) and **why the "Lakehouse" pattern exists** at all.

## The problem the Lakehouse solves

Before the Lakehouse pattern, organizations commonly ran **separate systems**: a data warehouse for BI reporting, a data lake for large-scale/ML workloads, and sometimes a third real-time system — each with its own copy of data, its own access controls, and its own pipelines keeping them in sync. This causes:

- **Data duplication** and the storage/compute cost of maintaining multiple copies.
- **Governance fragmentation** — permissions have to be defined and kept consistent separately in each system.
- **Staleness** — data in the BI warehouse lags behind the lake because of the sync pipelines between them.

The **Lakehouse** architecture stores all data once, in open formats, in your own cloud storage, and layers **warehousing-grade features** (ACID transactions, fast BI query performance, governance) directly on top — Databricks SQL is the warehousing engine in this picture, running against the *same* Delta tables that ML/ETL workloads use, so there's no separate copy to keep in sync.

## Delta Lake: native capabilities checklist

Delta Lake is the open-source storage format that makes the Lakehouse possible. The exam likes to ask "which of the following are native capabilities of a Delta table" (often "choose TWO") — know this list cold:

- ✅ **ACID transactions** (via the transaction log)
- ✅ **Time travel** (query a previous version/timestamp)
- ✅ **Schema enforcement** (rejects writes that don't match the table schema)
- ✅ **Schema evolution** (can be explicitly enabled to allow compatible changes)
- ✅ **Unified batch and streaming** (the same table can be a streaming source *and* sink)
- ✅ **DESCRIBE HISTORY** (built-in audit trail of every operation on the table)
- ❌ Row-level locking (Delta uses optimistic concurrency control, not row locks)
- ❌ Being a proprietary/closed format (Delta Lake is open-source)

## Physical anatomy, in platform terms

- **Data files**: stored as **Parquet** — a columnar, open, widely-supported format.
- **Transaction log** (\`_delta_log\`): a sequence of **JSON** commit files (periodically checkpointed to Parquet for fast replay) describing every change ever made to the table.

\`\`\`sql
DESCRIBE HISTORY catalog.schema.orders;
-- Returns: version, timestamp, operation (WRITE, MERGE, DELETE, OPTIMIZE...),
-- operationParameters, and the user who ran it — a full audit trail out of the box.
\`\`\`

## Cloning, restoring, and undropping tables

Beyond time-travel *queries*, Delta Lake provides DDL commands that act on table state directly:

\`\`\`sql
-- DEEP CLONE: copies both metadata AND the underlying data files.
-- The result is a fully independent table that survives even if the
-- source table is dropped or VACUUMed.
CREATE TABLE backup.transactions_snapshot DEEP CLONE prod.finance.transactions;

-- SHALLOW CLONE: copies only the transaction log (metadata), pointing at
-- the SAME underlying files as the source — much faster and cheaper, but
-- the clone breaks if the source's files are later VACUUMed.
CREATE TABLE dev.transactions_test SHALLOW CLONE prod.finance.transactions;

-- RESTORE: reverts a table in place to an earlier version or timestamp
-- (unlike a time-travel SELECT, this actually changes the current table).
RESTORE TABLE finance.transactions TO VERSION AS OF 2;
RESTORE TABLE finance.transactions TO TIMESTAMP AS OF '2026-06-01 10:12:00';
\`\`\`

Choosing between the two clone types comes down to **independence vs. cost**: if the copy must remain valid even after the source is dropped or vacuumed, use \`DEEP CLONE\`. If it's a cheap, throwaway copy for testing that can tolerate depending on the source's files, \`SHALLOW CLONE\` is faster and uses far less storage. \`CREATE TABLE ... LIKE\` copies only the **schema**, with no data at all — not a clone.

**\`RESTORE\`** is how you actually undo a bad write (e.g. an accidental \`DELETE\` without a \`WHERE\` clause) rather than just reading an old version — after \`RESTORE\`, the table's **current** version reflects the restored state, and this itself is recorded as a new commit in the transaction log (nothing is lost; you can always \`RESTORE\` forward again if needed).

## UNDROP: recovering an accidentally dropped managed table

Dropping a **managed** Unity Catalog table doesn't destroy its data files instantly. The metadata is removed from the catalog right away, but the files are retained for a **recovery window** during which \`UNDROP TABLE\` can bring the table back — only after that window passes are the files physically deleted by background maintenance.

\`\`\`sql
UNDROP TABLE finance.gold.monthly_sales;
\`\`\`

This is the safety net behind "a script accidentally ran \`DROP TABLE\` on a managed table — what happens to the data?" questions: the data is **not** gone immediately, and **not** kept forever either — it's recoverable for a limited window, then cleaned up.

## Databricks SQL as the warehousing layer

**Databricks SQL** is the component that provides the data-warehousing experience (SQL editor, dashboards, alerts, BI-tool connectivity) directly against Delta tables in Unity Catalog — it is the answer whenever a question asks "which of the following provides a data warehousing solution in the Databricks Intelligence Platform."

\`\`\`mermaid
flowchart TB
    subgraph Old["Before: separate systems"]
        DW["Data warehouse\\n(BI)"] -.->|"sync pipeline"| DL["Data lake\\n(ML / big data)"]
    end
    subgraph New["Lakehouse: one copy, open format"]
        Delta["Delta Lake tables\\n(Parquet + transaction log)"]
        Delta --> SQL["Databricks SQL\\n(warehousing / BI)"]
        Delta --> ML["ML / data science"]
        Delta --> ETL["ETL / streaming"]
    end
\`\`\`

## Practice check

> **Scenario:** *A retail company currently maintains separate platforms for BI reporting, real-time analytics, and machine learning, leading to duplicated data, inconsistent governance, and stale reports.*
>
> **Reasoning:** this is the textbook description of the problem the **Lakehouse** architecture solves — a single copy of governed Delta tables serves BI (via Databricks SQL), ML, and streaming/real-time workloads at once, eliminating the sync pipelines and duplicate governance definitions.

> 💡 **Exam tip:** "which TWO are native capabilities of a Delta table" questions often mix in a plausible-sounding **distractor** like "row-level locking" or "automatic data deduplication" — Delta does neither natively; deduplication requires you to write \`MERGE\`/window-function logic yourself.
`,
  },
  {
    id: 'P-hybrid-connectivity',
    domain: 'P',
    order: 4,
    title: 'Connecting to external and on-premises systems',
    summary:
      'How Databricks reaches databases and services outside its own cloud account — and where that connectivity actually runs.',
    contentMd: `
A recurring platform scenario: *"a data architect needs Databricks to securely query an on-premises database"* or *"schedule a job that reads from an on-prem PostgreSQL database inside a corporate data center."* These test whether you understand that this connectivity happens **from the data plane**, and what options exist.

## Why this is a data-plane question

Since Spark clusters (classic compute) run inside **your** cloud account, connecting them to an on-premises database is fundamentally a **network connectivity problem between your cloud VPC/VNet and your corporate data center** — solved the same way any cloud workload reaches on-prem systems:

- **VPN or Direct Connect / ExpressRoute** between the cloud VPC and the corporate network, so the cluster's driver/executors can open a JDBC connection to the on-prem database directly.
- Once connectivity exists, the read itself is a normal **JDBC** read from Spark:

\`\`\`python
df = (spark.read
    .format("jdbc")
    .option("url", "jdbc:postgresql://onprem-host:5432/salesdb")
    .option("dbtable", "public.accounts")
    .option("user", dbutils.secrets.get("scope", "db-user"))
    .option("password", dbutils.secrets.get("scope", "db-password"))
    .load())
\`\`\`

Credentials should always come from a **Databricks secret scope** (\`dbutils.secrets.get\`), never hardcoded in a notebook — a secret scope keeps them out of notebook source/version control and out of plaintext logs.

## Managed ingestion as an alternative

For common enterprise sources (Salesforce, SQL Server, PostgreSQL, Workday, and others), **Lakeflow Connect** managed connectors provide a lower-code alternative to hand-written JDBC + Auto Loader/COPY INTO pipelines — see the dedicated Lakeflow Connect topic in the Ingestion domain for when to prefer a managed connector over building the connection yourself.

## Lakehouse Federation

For **querying** external databases **without first copying the data in**, Databricks supports **Lakehouse Federation** — registering an external database (e.g. a production PostgreSQL or MySQL instance) as a **foreign catalog** in Unity Catalog, so it can be queried with normal SQL/Unity Catalog governance applied, without an ETL step. This is the answer when a scenario needs **live, governed, ad-hoc query access to an external system** rather than an ongoing ingestion pipeline landing a copy into Delta.

\`\`\`mermaid
flowchart LR
    subgraph OnPrem["On-premises / external"]
        DB["PostgreSQL / SQL Server / etc."]
    end
    subgraph Cloud["Cloud VPC (data plane)"]
        VPN["VPN / Direct Connect"]
        CL["Spark cluster"]
    end
    DB <-->|"secure network link"| VPN
    VPN <--> CL
    CL -->|"JDBC read, or\\nLakeflow Connect,\\nor Lakehouse Federation"| Delta["Delta table\\n(if ingesting)"]
\`\`\`

## Practice check

> **Scenario:** *A data architect designs a hybrid platform that must securely connect to on-premises databases, queried using SQL from within Databricks, without duplicating the data into Delta tables.*
>
> **Reasoning:** since the requirement is **querying without duplicating the data**, the answer is **Lakehouse Federation** (foreign catalogs), not Auto Loader/COPY INTO/Lakeflow Connect — those all *ingest a copy*. The secure network path (VPN/Direct Connect) is still required underneath either way, since the query still has to reach the on-prem system physically.

> 💡 **Exam tip:** "connect to and query an external system live, with governance, no copy" → **Lakehouse Federation**. "Regularly land a copy of the data into Delta" → **Lakeflow Connect** (managed source) or **Auto Loader/COPY INTO** (files) or plain **JDBC read** (custom/unsupported source).
`,
  },
  {
    id: 'P-databricksiq-marketplace-partner-connect',
    domain: 'P',
    order: 5,
    title: 'DatabricksIQ, Marketplace, and Partner Connect',
    summary:
      'The AI intelligence layer, the third-party data catalog, and the guided BI-tool connection experience.',
    contentMd: `
Three platform components are easy to confuse because they all involve "connecting to something outside your own pipelines" — but each solves a different problem.

## DatabricksIQ

**DatabricksIQ** is the platform's data intelligence engine: it combines generative AI with **Unity Catalog signals** (lineage, table/column popularity, join patterns, query history) to power features like natural-language search, AI-generated table/column descriptions, and smarter SQL autocomplete that understands your organization's own schemas and terminology.

DatabricksIQ is **not** a compute engine — don't confuse it with:

- **Photon**: the high-performance **execution** engine (vectorized, written in C++) that speeds up SQL/DataFrame workloads. Photon runs queries faster; it has no semantic/AI layer.
- **MLflow**: manages the ML model lifecycle (tracking, registry, deployment) — unrelated to search/autocomplete intelligence.

## Databricks Marketplace

**Databricks Marketplace** is an open catalog for discovering and acquiring **third-party data products**: datasets, notebooks, ML models, and applications published by data providers. It's the answer when a scenario wants to **enrich internal data with external datasets** (e.g. weather, demographics, financial indices) from **verified providers**, without building custom ingestion pipelines for each one.

## Partner Connect

**Partner Connect** is a guided, in-workspace experience for connecting a Databricks SQL warehouse to **partner BI/ingestion tools** (e.g. Tableau, Power BI, Fivetran) in just a few clicks — it handles gathering connection details and, for some partners, generates a ready-to-import connection file, removing the manual work of copying JDBC URLs, tokens, and warehouse IDs by hand.

## Telling them apart

| Signal in the question | Feature |
| --- | --- |
| "Natural-language search," "AI-generated descriptions," "smarter autocomplete aware of our schemas" | **DatabricksIQ** |
| "Browse/acquire third-party datasets from verified providers" | **Databricks Marketplace** |
| "Simplified, guided setup connecting a BI tool to a SQL warehouse" | **Partner Connect** |
| "High-performance vectorized SQL execution engine" (not AI/semantic) | **Photon** (the distractor in DatabricksIQ questions) |

\`\`\`mermaid
flowchart LR
    UC["Unity Catalog signals\\n(lineage, popularity, query history)"] --> IQ["DatabricksIQ"]
    IQ --> Search["Natural-language search /\\nAI descriptions / autocomplete"]
    MP["Databricks Marketplace"] --> Ext["Third-party datasets,\\nmodels, notebooks"]
    PC["Partner Connect"] --> BI["Tableau / Power BI /\\ningestion partner tools"]
\`\`\`

## Practice check

> **Scenario:** *A team notices that Databricks Search and SQL Editor autocomplete understand company-specific terminology and schemas, combining generative AI with Unity Catalog signals such as lineage and popularity. What is the name of the underlying engine?*
>
> **Reasoning:** this is **DatabricksIQ** by definition — it's specifically the combination of generative AI *with* Unity Catalog governance signals that makes it context-aware about a company's own data, which a generic execution engine like Photon cannot do.

> 💡 **Exam tip:** if the question is about a high-performance **execution** engine with no mention of AI/semantics, it's **Photon**. If it mentions AI generating descriptions, natural-language search, or "understanding" schemas, it's **DatabricksIQ**.
`,
  },
];
