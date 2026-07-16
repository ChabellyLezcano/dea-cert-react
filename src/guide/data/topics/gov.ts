import type { RawStudyTopic } from '../../../types/guide.types';

export const govTopics: RawStudyTopic[] = [
  {
    id: 'GOV-unity-catalog-namespace',
    domain: 'GOV',
    order: 1,
    title: 'Unity Catalog: the three-level namespace and access control',
    summary:
      'catalog.schema.table, how privileges are granted, revoked, and inherited, and how UC differs from the legacy Hive metastore.',
    contentMd: `
**Unity Catalog** (UC) is Databricks' centralized governance layer for data and AI assets, spanning every workspace attached to the same metastore.

## The three-level namespace

Every table (and view, volume, function, model) is addressed as:

\`\`\`
catalog.schema.table
\`\`\`

- **Metastore**: the top-level container for a region/account — usually one per region, shared across workspaces.
- **Catalog**: the first level of the namespace — typically maps to a business unit or environment (\`prod\`, \`dev\`, \`marketing\`).
- **Schema** (a.k.a. database): groups related tables within a catalog, same as a traditional database schema.
- **Table / View / Volume / Function / Model**: the actual data/AI assets.

This replaces the old **two-level** \`schema.table\` (Hive metastore) namespace, and — critically — UC governance is **workspace-independent**: the same catalog can be attached to multiple workspaces with **consistent permissions**, instead of each workspace having its own separate, unmanaged Hive metastore.

## Privileges: granting, and the inheritance chain

UC uses standard SQL **\`GRANT\`/\`REVOKE\`** semantics, at every level of the namespace, and the same commands are available through **Catalog Explorer** (the UI) as well as SQL:

\`\`\`sql
GRANT SELECT ON TABLE main.sales.orders TO \`analysts\`;
GRANT USE CATALOG ON CATALOG main TO \`analysts\`;
GRANT USE SCHEMA ON SCHEMA main.sales TO \`analysts\`;
REVOKE SELECT ON TABLE main.sales.orders FROM \`contractor@example.com\`;
\`\`\`

Common privileges: \`USE CATALOG\`, \`USE SCHEMA\`, \`SELECT\`, \`MODIFY\`, \`CREATE TABLE\`, \`CREATE FUNCTION\`, \`ALL PRIVILEGES\`. Privileges are typically granted to **groups**, not individual users, to keep management scalable — granting/revoking membership in a group is far easier to audit and maintain than tracking dozens of individual per-user grants across hundreds of tables.

**The three-part access chain**: to query a single table, a principal needs **all three** of:

1. \`USE CATALOG\` on the catalog,
2. \`USE SCHEMA\` on the schema,
3. \`SELECT\` on the table itself.

Missing **any one** of the three blocks access — this is why "a user can see the schema exists in Catalog Explorer but querying any table inside it fails" almost always means they're missing \`USE SCHEMA\` (or \`USE CATALOG\` on the parent catalog), **not** necessarily \`SELECT\` on the table.

### GRANT MODIFY vs. SELECT vs. ALL PRIVILEGES

- \`GRANT SELECT\` → read-only query access.
- \`GRANT MODIFY\` → **write** access: \`INSERT\`, \`UPDATE\`, \`DELETE\`, \`MERGE\` — but **not** the ability to drop the table or change its schema/ownership.
- \`GRANT ALL PRIVILEGES\` → the broadest grant, encompassing read, write, and management operations — the direct answer to "grant full permissions on a table to a team."

### Revoking group privileges before reassigning

When a scenario requires that a group **retain no existing privileges** on an object before a fresh set is granted (to avoid accumulating stale, forgotten grants over time), the correct sequence is an explicit \`REVOKE\` of prior grants **before** issuing the new \`GRANT\` statements — simply granting new privileges on top of old ones does not remove anything the group already had.

## Compute requirements for Unity Catalog

Not every compute configuration can enforce Unity Catalog's fine-grained governance (row filters, column masks) equally. **Shared access mode clusters** and **serverless compute** (SQL warehouses, serverless notebooks/jobs) are the compute types that support the **full range** of Unity Catalog governance features, including row-level and column-level security — this is the answer whenever a scenario asks which **TWO** compute types a team should use to read governed tables with full enforcement of fine-grained access controls.

## Managed vs. external tables

- **Managed tables**: Unity Catalog owns the underlying files' lifecycle — dropping the table **deletes the data too** (both metadata and files removed). Stored in the catalog/schema's managed storage location.
- **External tables**: point at a storage location you specify explicitly; dropping the table only removes the **metadata registration** — the underlying data files are **left untouched** in cloud storage, since Unity Catalog never owned their lifecycle to begin with. (See the dedicated Managed vs. External Tables topic for migrating between the two.)

\`\`\`mermaid
flowchart TD
    MS["Metastore (per region)"] --> C1["Catalog: prod"]
    MS --> C2["Catalog: dev"]
    C1 --> S1["Schema: sales"]
    C1 --> S2["Schema: marketing"]
    S1 --> T1["Table: orders"]
    S1 --> T2["Table: customers"]
    G["USE CATALOG + USE SCHEMA + SELECT\\n— ALL THREE required"] -.-> T1
\`\`\`

## Practice check

> **Scenario:** *A data engineering team needs to ensure that \`hr_group\` retains no existing privileges on \`main.hr_schema\` before granting a new, deliberately narrower set of privileges.*
>
> **Reasoning:** issue explicit \`REVOKE\` statements for the group's current privileges on \`main.hr_schema\` first, then issue the new \`GRANT\` statements. Skipping the revoke step would leave the old (broader) privileges intact **alongside** the new ones, since grants are additive, not a replacement.

> 💡 **Exam tip:** "a user can see the schema exists but querying any table in it fails" → missing \`USE SCHEMA\` or \`USE CATALOG\`, not necessarily \`SELECT\`. Any UC governance scenario mentioning **row filters or column masks being enforced** on a cluster → the compute must be **shared access mode or serverless**.
`,
  },
  {
    id: 'GOV-lineage-audit-row-column-security',
    domain: 'GOV',
    order: 2,
    title: 'Data lineage, audit logs, and row/column-level security',
    summary:
      'Automatic lineage tracking, who-did-what auditing, and restricting access within a table (not just to it).',
    contentMd: `
## Data lineage

Unity Catalog **automatically captures lineage** for tables, columns, notebooks, Jobs, and dashboards that read/write through it — no manual tagging required. Lineage answers two directions:

- **Upstream**: "what tables/notebooks fed into this table?"
- **Downstream**: "what depends on this table? What breaks if I change its schema?"

Lineage is visible in the Catalog Explorer UI as a graph, and is especially useful before making a breaking schema change — check downstream lineage first to see who else is affected. If a question describes *"a feature that illustrates the relationship between different data assets — tables, queries, notebooks, dashboards — enabling teams to understand data origin and impact,"* that is a direct description of **data lineage**.

## Audit logs

Every action against Unity Catalog-governed data (queries, grants/revokes, table creation/deletion) is recorded in **audit logs**, which capture **who** did **what**, to **which object**, and **when**. Audit logs are the basis for compliance reporting and for investigating unexpected data access — a distinctly different feature from lineage: lineage shows *data flow relationships*, audit logs show *a chronological record of actions taken by principals*.

## Row-level and column-level security

Beyond table-level \`GRANT\`/\`REVOKE\`, Unity Catalog supports restricting access to **parts** of a table:

- **Column masking**: apply a SQL user-defined function that redacts or transforms a column's value depending on who's querying (e.g. show only the last 4 digits of a credit card number to non-privileged roles, the full value to privileged ones).
- **Row filters**: apply a SQL function that filters which **rows** a query is allowed to see, based on the querying user/group (e.g. a sales rep can only see rows for their own region; a finance team member only sees their own accounts).

Both are implemented as SQL functions attached to the table, evaluated per-query based on the caller's identity — the underlying data isn't duplicated or physically split; the **same physical table** serves different logical views depending on who's asking.

\`\`\`sql
-- Column mask function
CREATE FUNCTION mask_ssn(ssn STRING) RETURNS STRING
  RETURN CASE WHEN is_account_group_member('privileged_group') THEN ssn ELSE '***-**-' || RIGHT(ssn, 4) END;

ALTER TABLE main.hr.employees ALTER COLUMN ssn SET MASK mask_ssn;

-- Row filter function
CREATE FUNCTION region_filter(region STRING) RETURNS BOOLEAN
  RETURN region = current_user_region() OR is_account_group_member('finance_admins');

ALTER TABLE main.finance.transactions SET ROW FILTER region_filter ON (region);
\`\`\`

\`is_account_group_member('group_name')\` is the standard function for checking group membership **inside** a masking/filtering function, letting the same function branch its behavior based on who's calling — this is the mechanism behind "show the full credit card to \`fraud_analysts\`, masked to everyone else," implemented as a single function attached once to the column, rather than maintaining separate views per group.

## CREATE POLICY: applying masks/filters at scale via tags

Attaching a mask/filter function to **one column on one table** at a time doesn't scale when the same sensitivity rule (e.g. "mask anything tagged \`confidential_info\`") needs to apply across **hundreds of tables and columns**. \`CREATE POLICY\` defines the rule **once**, targeting a **tag** rather than a specific object:

\`\`\`sql
CREATE POLICY banking_policy ON SCHEMA bank.safebox
  COLUMN MASK bank.safebox.mask_card
  TO finance_team
  FOR TABLES
  MATCH COLUMNS hasTagValue('confidential_info', 'true') AS card_column
  ON COLUMN card_column;
\`\`\`

This is the mechanism behind **Attribute-Based Access Control (ABAC)**: tag columns/tables once (e.g. \`pii = credit_card\`, \`classification = confidential\`), define **one** catalog/schema-level policy referencing that tag, and it automatically applies to **every current and future** object carrying that tag — no per-table maintenance required as new tables are added.

\`\`\`mermaid
flowchart LR
    Q["User query"] --> T["Table"]
    T --> RF{"Row filter\\nfunction"}
    RF -->|"only rows this user\\nis allowed to see"| CM{"Column mask\\nfunction"}
    CM -->|"sensitive columns\\nredacted per-user"| R["Result set"]
    Tag["Tag: pii=credit_card"] -.->|"CREATE POLICY targets\\nthe TAG, not one table"| CM
\`\`\`

## Practice check

> **Scenario:** *A data engineer wants to apply row filters and column masks for every column tagged \`confidential_info\` across many tables in a catalog, without configuring each table individually.*
>
> **Reasoning:** this is the signature use case for **ABAC via \`CREATE POLICY\`**: define the masking/filtering rule once against the **tag**, and it automatically covers every column carrying that tag — now and for any table added later — rather than manually attaching a mask function to each column on each table.

> 💡 **Exam tip:** "different users querying the same table should see different rows/values depending on who they are, without maintaining separate copies of the table" → **row filters and column masks**. "The same rule should apply automatically across many tables, present and future, based on a tag" → **ABAC / \`CREATE POLICY\`**, not per-object masks.
`,
  },
  {
    id: 'GOV-managed-external-tables',
    domain: 'GOV',
    order: 3,
    title: 'Managed vs. external tables: ownership, deletion, and migration',
    summary:
      'What DROP TABLE actually deletes, and how to convert an external table to a managed one with minimal disruption.',
    contentMd: `
## What DROP TABLE actually deletes

This distinction is one of the most consistently tested facts in the Governance domain:

- **Managed table**: Unity Catalog owns the data files' lifecycle. \`DROP TABLE\` deletes **both the metadata registration AND the underlying data files**.
- **External table**: the data lives at a storage location the table merely **points to**; Unity Catalog never owned that storage location. \`DROP TABLE\` deletes **only the metadata registration** — the underlying files are **left behind**, untouched, in cloud storage.

\`\`\`sql
DROP TABLE main.sales.orders_managed;   -- metadata AND data files deleted
DROP TABLE main.sales.orders_external;  -- ONLY the catalog entry deleted; files remain in storage
\`\`\`

If a question asks *"why does dropping this table only delete metadata, keeping the data files intact"* → it's describing an **external** table. If it asks *"why does dropping this table delete both metadata and data files"* → it's describing a **managed** table.

## Migrating an external table to managed: ALTER TABLE ... SET MANAGED

Teams sometimes create a table as **external** early on (e.g. pointing at data that already existed in storage before Unity Catalog was adopted), then later want Databricks to **fully manage its lifecycle** — for consistent governance, predictive optimization eligibility, and simpler cleanup semantics. \`ALTER TABLE ... SET MANAGED\` converts it **in place**:

\`\`\`sql
ALTER TABLE infra_catalog.ops_db.device_logs SET MANAGED;
\`\`\`

Key advantages of doing this conversion, tested as a "which are advantages" question:

- ✅ **Unity Catalog now owns the storage lifecycle** — future \`DROP TABLE\` calls clean up the data too, avoiding orphaned files left behind by ad hoc external tables.
- ✅ **Eligible for Predictive Optimization** (automatic \`OPTIMIZE\`/\`VACUUM\`/\`ANALYZE\` — see the Troubleshooting & Optimization domain), which only runs against **managed** tables.
- ✅ **Minimizes downtime and tolerates concurrent writes**: \`SET MANAGED\` runs as a **two-phase** process — it copies the data files and transaction log to the new managed storage location **while readers and writers keep operating** against the table, then does a final sync of any commits made during the copy. This is genuinely faster and safer than a manual "create a new managed table with CTAS, copy data, drop the old one" migration, but it is **not** a zero-copy, metadata-only operation — the underlying files *are* physically copied to the managed location.
- ✅ **Preserves configuration**: table name, permissions, tags, and views stay intact — nothing needs to be reconfigured after the conversion.
- ✅ **Reversible**: \`ALTER TABLE ... UNSET MANAGED\` can roll the table back to external if needed, and the original external location's files are retained (not deleted) for roughly **14 days** after conversion as a safety margin — they are not deleted immediately, but also not kept forever.

## What still needs care after conversion

- **A streaming query writing to the table during conversion** may see it fail with an error like \`DELTA_STREAMING_INTERRUPTED_BY_MANAGED_TABLE_CONVERSION\` — this is a deliberate safety interruption, not data loss. The fix is simply to **restart the stream**: because Unity Catalog transparently redirects path-based reads/writes to the new managed location, the stream resumes from its **last committed checkpoint offset** against the now-managed table, with no manual offset repair needed (\`REPAIR TABLE\` is unrelated — it recovers missing Hive-style partitions, not streaming checkpoints).

\`\`\`mermaid
flowchart LR
    Ext["External table\\n(points at existing storage)"] -->|"ALTER TABLE ... SET MANAGED\\n(two-phase copy, minimal downtime)"| Man["Managed table\\n(files copied to UC-managed location)"]
    Man -->|"DROP TABLE"| Gone["Metadata AND files deleted\\n(UNDROP available briefly)"]
    Man -.->|"ALTER TABLE ... UNSET MANAGED"| Ext
    Ext -.->|"DROP TABLE (before conversion)"| MetaOnly["Only metadata deleted,\\nfiles remain"]
\`\`\`

## Practice check

> **Scenario:** *A team is migrating a large, high-traffic external table to a managed table with minimal disruption, and is deciding between \`ALTER TABLE ... SET MANAGED\` and manually recreating the table with CTAS and copying the data over.*
>
> **Reasoning:** \`ALTER TABLE ... SET MANAGED\` copies the data via a **two-phase process that keeps the table available to readers and writers throughout** — this is what "minimal disruption" is testing for, versus a manual CTAS-based migration, which would require redirecting every reader/writer to a brand-new table object and risks a window where writes are lost or duplicated during the cutover.

> 💡 **Exam tip:** "only the metadata is deleted, data files remain" → **external table**. "Both metadata and data files are deleted" → **managed table**. "Convert with minimal downtime, tolerating concurrent reads/writes" → \`ALTER TABLE ... SET MANAGED\` (it still physically copies the files — the benefit is *availability during* the copy, not the absence of a copy).
`,
  },
  {
    id: 'GOV-principals-least-privilege',
    domain: 'GOV',
    order: 4,
    title: 'Principals, service principals, and least privilege',
    summary:
      'Users, groups, and service principals as Unity Catalog principals, and designing minimal-necessary access.',
    contentMd: `
## Principals in Unity Catalog

A **principal** is any identity that can be granted privileges: a **user**, a **group**, or a **service principal** (a non-human identity used by an automated process, such as a CI/CD pipeline or a scheduled Job running under a dedicated identity rather than a personal account).

\`\`\`sql
-- Granting a service principal read-only access by its Application ID
GRANT SELECT ON TABLE enterprise.reporting.transactions
  TO \`fe7bcf95-1234-5678-9abc-def012345678\`;
\`\`\`

Using a **service principal** (rather than a personal user account) for a scheduled Job or an automated pipeline is the recommended pattern — it decouples the pipeline's access from any individual employee's account (which might be deactivated when they leave the company, breaking the pipeline), and its permissions are auditable and manageable independently of personnel changes.

## The principle of least privilege

Grant **only** the privileges a principal actually needs to do its job — nothing broader "just in case." This shows up in exam scenarios as choosing the **narrowest** grant that satisfies a stated requirement:

- *"A marketing data scientist requires **read-only** access to the customer insights table"* → \`GRANT SELECT\` only — **not** \`MODIFY\` or \`ALL PRIVILEGES\`, even if it would also technically work; the requirement explicitly says read-only.
- *"A finance analyst requires read-only access to all **existing and future** tables in a schema"* → grant \`SELECT\` at the **schema** level (which, combined with \`USE SCHEMA\`/\`USE CATALOG\`, automatically covers tables created later in that schema too) rather than granting \`SELECT\` on each current table individually, which wouldn't automatically extend to new tables added afterward.

\`\`\`sql
GRANT USE CATALOG ON CATALOG enterprise TO \`finance_analysts\`;
GRANT USE SCHEMA ON SCHEMA enterprise.reporting TO \`finance_analysts\`;
GRANT SELECT ON SCHEMA enterprise.reporting TO \`finance_analysts\`;
-- SELECT granted at the SCHEMA level covers every table in it, including ones created later
\`\`\`

## Where permissions are managed

Unity Catalog permissions (\`GRANT\`/\`REVOKE\`) can be set from **Catalog Explorer** (the UI), from **SQL** (\`GRANT\`/\`REVOKE\` statements run in a notebook or SQL editor), or declaratively via **Databricks Asset Bundles** (a job's \`permissions\` block — see the CI/CD domain). All three ultimately configure the same underlying Unity Catalog privilege model — there is no separate, disconnected permission system per interface.

## Changing table ownership

The **owner** of a securable object (a table, schema, or catalog) has implicit full control over it and is the identity billed/attributed for certain operations. Ownership can be transferred (e.g. from an individual user to a group, so the object doesn't become orphaned if that person leaves) through **Catalog Explorer**'s object details page, or via the \`ALTER TABLE ... OWNER TO\` SQL statement — both are valid, UI-driven and SQL-driven paths to the same change.

## Admin role hierarchy

Unity Catalog and workspace administration are split across a few distinct roles, and "who can do X by default" is tested directly:

- **Metastore Admin** — has \`CREATE CATALOG\` at the metastore level by default; the role responsible for creating new top-level catalogs in a metastore (a metastore is normally one per region, shared across workspaces).
- **Account Admin** — manages account-level configuration (workspaces, billing, identity) but has **no implicit data access** by default — being an Account Admin does not by itself grant the ability to read table data.
- **Workspace Admin** — scoped to a single **workspace** (managing workspace settings, cluster policies, etc.), not the metastore — cannot create catalogs, since catalogs live at the metastore level, above any single workspace.
- **Catalog Owner** — has full control over one already-existing catalog (grant/revoke, create schemas within it) but didn't necessarily create it — ownership can be transferred to any principal after creation.

## Effective permissions come from multiple sources

A principal's actual access is the **union** of every path that grants it: direct grants to the user, grants to any group the user belongs to, and ownership. This means **revoking a privilege from one group does not necessarily remove a user's access** if they're also a member of a *different* group that independently grants the same privilege — a common "why does this user still have access after I revoked it" troubleshooting scenario. \`USE SCHEMA\` never implicitly grants \`SELECT\` on the schema's tables (they're independent privileges), so that's never the explanation for unexpectedly-retained access.

## Querying through a view: whose permissions count?

When a user queries a **view** from a **SQL warehouse**, Unity Catalog checks the **view owner's** permissions on the underlying base table(s) — the querying user only needs \`SELECT\` on the **view** itself (plus \`USE CATALOG\`/\`USE SCHEMA\` to reach it), not direct access to the base table. This is what makes views a legitimate way to expose a curated subset of a sensitive table to a broader audience than the base table's own grants would allow — the view's owner effectively "vouches for" the query on their behalf.

\`\`\`mermaid
flowchart TD
    Req["Access requirement"] --> Scope{"How broad?"}
    Scope -- "Read-only, one table" --> T1["GRANT SELECT ON TABLE"]
    Scope -- "Read-only, whole schema\\nincl. future tables" --> T2["GRANT SELECT ON SCHEMA\\n+ USE CATALOG + USE SCHEMA"]
    Scope -- "Automated pipeline,\\nnot a personal account" --> SP["Use a service principal\\nas the grantee"]
\`\`\`

## Practice check

> **Scenario:** *A finance data analyst requires read-only access to all existing and future tables within the schema \`enterprise.reporting\`, following the principle of least privilege.*
>
> **Reasoning:** grant \`USE CATALOG\` on the catalog, \`USE SCHEMA\` on \`enterprise.reporting\`, and \`SELECT\` at the **schema level** (not per-table) — this automatically extends to tables created in that schema later, satisfying "future tables" without needing to remember to grant access again each time a new table appears, while still being the narrowest grant that satisfies the stated read-only requirement.

> 💡 **Exam tip:** whenever a scenario says "read-only," the answer never includes \`MODIFY\` or \`ALL PRIVILEGES\`, even if broader access would also "work." Whenever it says "existing **and future**" objects, grant at the **schema or catalog level**, not per-object.
`,
  },
  {
    id: 'GOV-delta-sharing',
    domain: 'GOV',
    order: 5,
    title: 'Delta Sharing: sharing data outside your Databricks account',
    summary:
      'Live, read-only, no-copy data sharing with external organizations and BI tools — the opposite direction from Lakehouse Federation.',
    contentMd: `
**Delta Sharing** is Databricks' open protocol for sharing Delta tables with **external** recipients — other organizations, partner teams, or BI tools — without copying the data and without requiring the recipient to have a Databricks workspace at all.

## Why it exists

The alternative to Delta Sharing is usually something worse: exporting CSVs and emailing/SFTPing them on a schedule (slow, error-prone, and always stale by the time the recipient gets it), or replicating tables into the partner's own environment (duplicated storage, drift between copies, ongoing sync pipelines to maintain). Delta Sharing instead gives the recipient **live, read-only** access to the current state of the table directly — every query sees the latest data, with no copy step in between.

## Two sharing protocols

- **Open Sharing protocol**: the recipient does **not** need a Databricks workspace or Unity Catalog at all. They connect with any Delta Sharing client — Tableau, Power BI, pandas, Spark, the Python \`delta-sharing\` library — using a credential file the provider issues them. This is the answer whenever a scenario says the partner "does not have a Databricks workspace" or uses a specific external BI tool directly.
- **Databricks-to-Databricks sharing**: both the provider and the recipient have Unity Catalog-enabled Databricks workspaces; the shared tables show up as a recipient-side object governed by the recipient's own Unity Catalog, with a smoother, more integrated experience than Open Sharing — but it requires Unity Catalog on **both** sides.

## Delta Sharing vs. Lakehouse Federation: opposite directions

These two are the most common pair of distractors for each other on the exam, because both involve "another data system," but the direction of data access is reversed:

| | Direction | Use when |
| --- | --- | --- |
| **Delta Sharing** | You are the **provider**, sharing your Delta tables **out** to others | An external partner/tool needs read access to *your* data |
| **Lakehouse Federation** | You are the **consumer**, querying someone else's external database **in place** | *You* need to query an external operational database (e.g. PostgreSQL) from within Databricks, without copying it in |

## Practice check

> **Scenario:** *A marketing agency wants to share campaign performance data with a partner that uses Tableau for analytics but does not have a Databricks workspace. The partner requires direct, read-only access from Tableau, without the agency copying data out.*
>
> **Reasoning:** since the recipient has **no Databricks workspace**, the **Open Sharing** protocol of Delta Sharing is required — Databricks-to-Databricks sharing would need Unity Catalog on both sides, which the partner doesn't have. Tableau (and other BI tools) can connect to an Open Share directly using a Delta Sharing client.

> 💡 **Exam tip:** "share data we own with an external party, read-only, no copy" → **Delta Sharing**. "Query an external party's data source from within Databricks, no copy" → **Lakehouse Federation**. Mixing these two up (direction confusion) is the single most common trap in this pair.
`,
  },
  {
    id: 'GOV-dynamic-views-storage-credentials',
    domain: 'GOV',
    order: 6,
    title: 'Dynamic views, storage credentials, and external locations',
    summary:
      'Combining row/column security in one view object, and the Unity Catalog objects that govern cloud storage authentication.',
    contentMd: `
## Dynamic views

Row filters and column masks (see the earlier Governance topic) attach **directly to a base table** and apply automatically no matter how the table is queried. A **dynamic view** is a different pattern: a **view** definition that embeds row-filtering and column-masking logic **together, in one object**, which users query **instead of** the base table:

\`\`\`sql
CREATE VIEW gold.regional_sales_view AS
SELECT
  order_id,
  region,
  CASE WHEN is_account_group_member('finance_managers') THEN profit_margin ELSE NULL END AS profit_margin
FROM gold.regional_sales
WHERE is_account_group_member('admin_users')
   OR (is_account_group_member('regional_managers') AND region = current_user_region());
\`\`\`

Use a dynamic view (rather than table-attached row filters/column masks) when a requirement specifically calls for **combining filtering and masking together in a single governed object** that users query in place of the base table — table-attached row filters and column masks are usually the more modern, direct-on-the-table approach, but "single view combining both concerns" is the dynamic-view pattern's signature phrase.

## Storage credentials and external locations

Two Unity Catalog objects sit between a cloud storage account and any external/managed table built on top of it:

- **Storage credential**: defines **how** Unity Catalog authenticates to cloud storage — an IAM role, a managed identity, or a service principal, depending on the cloud. A single storage credential can be **reused** across multiple external locations in the same storage account, so the authentication mechanism is defined once, not per-location.
- **External location**: governs access to **one specific path** in cloud storage, referencing a storage credential for the "how." External tables and volumes are built on top of external locations.

\`\`\`sql
CREATE STORAGE CREDENTIAL finance_iam_role
  WITH (AWS_IAM_ROLE = 'arn:aws:iam::123456789:role/finance-role');

CREATE EXTERNAL LOCATION finance_raw_data
  URL 's3://finance-bucket/raw/'
  WITH (STORAGE CREDENTIAL finance_iam_role);
\`\`\`

### Privileges: letting someone use a credential without controlling it

Granting **\`CREATE EXTERNAL LOCATION\`** on a storage credential lets a principal create **new** external locations using that credential, without giving them control over the credential itself (they can't edit or delete it). Granting **\`CREATE EXTERNAL TABLE\`** on an **existing** external location lets a principal create tables whose files live inside that already-defined path, without needing to create new locations or manage credentials at all — the narrower, more common grant for a data engineer who just needs to register tables against storage that's already been set up.

\`\`\`mermaid
flowchart TD
    SC["Storage Credential\\n(HOW to authenticate)"] -->|"reused by"| EL1["External Location A"]
    SC -->|"reused by"| EL2["External Location B"]
    EL1 --> ET["External Table\\n(CREATE EXTERNAL TABLE\\non the location)"]
    EL1 --> Vol["Volume"]
\`\`\`

## Practice check

> **Scenario:** *A team needs: regional managers to only see orders for their own region, non-managers to not see the \`profit_margin\` column, users to query a single governed object instead of the base table, with filtering and masking implemented together in one layer.*
>
> **Reasoning:** the requirement to combine row filtering **and** column masking **in a single queried object** (not the base table) is the signature description of a **dynamic view** — table-attached row filters and column masks are applied separately and directly on the base table, not bundled into one alternate object users query instead.

> 💡 **Exam tip:** "combine filtering and masking in one view object, queried instead of the base table" → **dynamic view**. "Reuse the same cloud authentication across multiple storage paths" → **storage credential**. "Let someone register tables against storage that's already configured, without giving them credential control" → \`CREATE EXTERNAL TABLE\` privilege on the **external location**.
`,
  },
];
