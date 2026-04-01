# Agentic CRM / Task System Plan

## 1. Objective

Build a fresh CRM/task management system that is **agentic-first** for **intern-level work**:

- humans define the task, process, and expected outcome
- agents execute one scoped task at a time
- each business object has structured context
- schema evolution is handled through explicit tasks
- file processing is first-class and reusable across future tasks

V1 stack:

- TypeScript
- tRPC
- Drizzle
- Better Auth
- OpenCode for agent execution

---

## 2. Core product idea

The system should combine:

1. **project-scoped structured records**
2. **task orchestration**
3. **per-record agent execution**
4. **schema versioning and migrations**
5. **persistent file/artifact processing**

This is not meant to be a general autonomous agent swarm.
It should be a controlled execution system for tasks that are:

- well scoped
- process-shaped
- auditable
- retryable
- cheap when possible

---

## 3. Naming

Use **record** as the canonical domain term in v1.

Why:

- neutral across CRM and task management
- fits structured schema + context model
- avoids overfitting to `company`
- easy to map later to CRM-specific views

Main terms:

- `Project` — top-level workspace and schema boundary
- `ProjectSchema` — required + custom field definition set for the project
- `Record` — one CRM/task object instance
- `Task` — one unit of work assigned to one record
- `AgentRun` — one OpenCode execution for one record-task pair
- `RecordEdge` — cross-project relation between records
- `PipelineDefinition` — versioned file processing logic
- `Artifact` — persistent derived file output

---

## 4. High-level architecture

### 4.1 Main entities

#### User

Authentication in v1:

- GitHub OAuth only
- implemented with Better Auth

Each user always operates inside an organization and a project scope.

#### Organization

Projects belong to organizations.

V1 org rules:

- when a user logs in for the first time, create a personal organization for them
- the initial user becomes the organization owner
- organizations can add existing users directly
- no email invitations in v1
- organization owner role should use Better Auth organization support
- v1 organization roles are only `owner` and `member`

Suggested responsibilities:

- own projects
- own memberships
- own authorization boundary

#### ProjectMembership / OrganizationMembership

Need explicit membership records for:

- organization role
- project access
- future authorization checks

V1 should keep this simple, but still explicit in the data model.

V1 role model:

- organization roles: `owner`, `member`
- project access: members of the organization can work inside project scope in v1
- all project members can create tasks, schema changes, and relation edges in v1

#### Project

Owns:

- records
- project schema
- task queue
- file processing definitions
- OpenCode execution policy

#### ProjectSchema

Defines a shared schema for all records inside one project.

Must include required system fields:

- `id`
- `name`

Can include project-specific custom fields.

Must be versioned.

#### Record

Represents one business object.

Suggested v1 shape:

```ts
type RecordEnvelope = {
  id: string
  projectId: string
  name: string
  schemaVersion: number
  status: "active" | "archived" | "processing" | "error"
  context: Record<string, unknown>
  version: number
  createdAt: Date
  updatedAt: Date
}
```

Machine note:

- `Record` should be machine-driven in v1
- the stored record state should come from a Machin actor, not ad hoc status flags
- `status` here represents machine state, not a freeform column concept

#### Task

A task is the contract for work.

In v1, a task belongs to a project and targets **all records in that project**.
The project owns a user-managed sorted task list, and each record agent processes tasks from that ordered queue.

Suggested shape:

```ts
type Task = {
  id: string
  projectId: string
  sortOrder: number
  model?: string
  schemaVersion: number
  pipelineVersion?: string
  idempotencyKey: string
  descriptionMarkdown: string
  createdAt: Date
  updatedAt: Date
}
```

Important:

- `Task` itself is the project-scoped description of work
- per-agent / per-record progress does **not** live on `Task`
- progress is tracked on `TaskRecord` and `AgentRun`
- `model` is a plain optional string override passed to OpenCode for this task

#### AgentRun

Represents one OpenCode execution attempt.

Stores:

- session reference
- selected model
- selected agent
- execution status
- tool activity summary
- result payload
- failure payload
- token/cost/latency data

#### RecordEdge

Represents a cross-project relation between two records.

This is required because projects can represent different record types,
for example:

- `companies`
- `offers`

And an offer should be able to point to one company while still living in a different project.

Suggested v1 shape:

```ts
type RecordEdge = {
  id: string
  fromProjectId: string
  fromRecordId: string
  toProjectId: string
  toRecordId: string
  relationType: string
  direction: "outbound" | "bidirectional"
  status: "active" | "inactive"
  metadata: Record<string, unknown>
  createdByTaskId?: string
  createdAt: Date
  updatedAt: Date
}
```

Machine note:

- `RecordEdge` should be machine-driven in v1
- edge lifecycle like create, activate, deactivate, supersede, or invalidate should use guarded transitions

Examples:

- `offer --belongs_to--> company`
- `invoice --issued_for--> company`
- `contact --works_for--> company`

---

## 5. Data model decisions

### 5.1 Schema model

Decision already made:

- schema is **shared per project**
- all records in a project use the same schema definition
- each project can extend required fields with custom fields

### 5.2 Record storage model

V1 should use:

- relational envelope columns for system fields
- `context` JSON/JSONB for custom project fields

Why:

- simpler than dynamic columns
- easier schema versioning
- easier agent patch application
- suitable for migration fan-out

### 5.3 Canonical storage ownership

Canonical business state should stay in **your app**, not in OpenCode.

OpenCode should be used as:

- execution runtime
- task workspace
- tool host
- optional local scratch filesystem

But not as:

- source of truth for record state
- source of truth for schema
- source of truth for persistent parsed data

### 5.4 Cross-project relation model

Decision already made:

- use **generic edges** for cross-project relations

Why:

- flexible enough for many project pairs
- avoids hardcoding foreign keys into every project schema
- supports future relation types without schema churn
- keeps linked context outside local record `context`

Recommended rule:

- relations are first-class canonical app-owned data
- relations do **not** live directly inside record `context`
- related record context is fetched through relation-aware tools

V1 guardrails:

- traversal depth: `1`
- related context access: read-only by default
- cardinality rules enforced in app logic by `relationType`

Example rule:

- `offer -> company` may allow only one active outbound edge of type `belongs_to`

### 5.5 Auth and tenancy model

Decision:

- use Better Auth with GitHub OAuth only in v1

Tenancy hierarchy:

- `Organization -> Project -> Record / Task / AgentRun / Artifact`

Required rules:

- a user always enters the system through an organization
- a user always works in the scope of a selected project
- all important data reads and writes must be filtered by organization + project access

First login flow:

1. user signs in with GitHub
2. system creates user if missing
3. system creates a default organization for that user if none exists
4. system assigns user as organization owner
5. system lands user in project creation / selection flow

Membership flow in v1:

- organization owners can add existing users to the organization
- no email invitation flow yet
- no public join links yet
- organization membership stays minimal: `owner` and `member`
- all project members can operate normal project workflows in v1

---

## 6. Agent model

### 6.1 Execution model

Do **not** build one permanently running autonomous agent per record in v1.

Instead:

- each record can conceptually “own” an agent role
- operationally, each record agent pulls from the project's sorted task queue and spawns a short execution run for the current task

So the real runtime unit is:

`one AgentRun = one record + one project-task + one selected model + one OpenCode session`

This keeps the system:

- deterministic
- retryable
- idempotent
- easier to audit

### 6.2 Responsibility boundaries

Each record-level run should only be able to:

- read its own record context
- read project schema
- read full related record context through explicit relation tools
- read allowed files/artifacts
- propose or apply patch to its own record
- complete/fail its own task

It should not be able to:

- mutate other records directly
- reorder project task queue unless explicitly allowed by UI/backend policy
- inspect unrelated records by default
- mutate linked records unless the current task description and backend permissions explicitly allow it

### 6.3 Suggested v1 agents

Keep the OpenCode side thin.

Suggested agents:

1. `record-worker`
   - normal record tasks
   - extraction
   - enrichment
   - structured patch generation

Do not create many custom agents too early.
Prefer fewer prompts + per-task model selection.

V1 simplification:

- schema adoption should be handled as a normal project task
- no special migration-only agent role is required

---

## 7. OpenCode role in the system

OpenCode should be integrated as the **agent execution layer**.

### 7.1 Why OpenCode fits

OpenCode supports:

- 75+ providers via AI SDK + Models.dev
- local and OpenAI-compatible providers
- CLI, server, and JS/TS SDK
- per-agent and per-run model selection
- remote MCP servers
- plugins and hooks
- filesystem operations in a workspace
- structured output support

Docs checked, last updated 2026-03-30:

- Providers: https://opencode.ai/docs/providers/
- Models: https://opencode.ai/docs/models/
- Agents: https://opencode.ai/docs/agents/
- SDK: https://opencode.ai/docs/sdk/
- CLI: https://opencode.ai/docs/cli/
- Custom Tools: https://opencode.ai/docs/custom-tools/
- Plugins: https://opencode.ai/docs/plugins/
- Server: https://opencode.ai/docs/server/
- MCP: https://opencode.ai/docs/mcp-servers/

Additional docs checked for MCP serving:

- `@hono/mcp` quick start / HonoHub, package `@hono/mcp`, example `StreamableHTTPTransport`, fetched 2026-04-01: https://honohub.dev/docs/hono-mcp
- `@hono/mcp` stateless/stateful patterns, fetched 2026-04-01: https://honohub.dev/docs/hono-mcp/stateless and https://honohub.dev/docs/hono-mcp/stateful
- token auth pattern for Hono MCP, fetched 2026-04-01: https://honohub.dev/docs/hono-mcp/auth/token
- MCP spec tools and resources, including `tools/call` and `resources/read`, fetched 2026-04-01: https://modelcontextprotocol.io/specification/2025-06-18/server/tools and https://modelcontextprotocol.io/specification/2025-06-18/server/resources

Short finding:

- Hono can expose an MCP server over HTTP streaming using `@hono/mcp` and `StreamableHTTPTransport`
- this fits OpenCode remote MCP configuration better than writing many project-local OpenCode custom tools
- MCP resources support both text and binary payloads, so file bytes can be exposed via `resources/read`

### 7.2 Recommended integration mode

Use:

- `opencode serve`
- `@opencode-ai/sdk`
- one app-owned Hono MCP server for business tools

Your backend should:

1. create/select a task
2. read the task model override if present
3. prepare workspace inputs
4. expose record/file/artifact/relation operations through the Hono MCP server
5. create an OpenCode session
6. send prompt + context + model override
7. capture structured output / MCP tool effects
8. persist results in your app DB/storage

### 7.2A MCP transport decision

Prefer a single app-owned MCP server built with Hono over a large set of `.opencode/tools/*` files.

Why:

- tool logic lives next to app services and DB access
- no duplicated tool contracts between app and OpenCode
- easier auth, rate limits, and audit control
- simpler deployment for multiple agent runtimes
- OpenCode can consume it through normal remote MCP config

Recommended setup:

- Hono app exposes `/mcp`
- OpenCode config registers it under `mcp.crm`
- tasks use that MCP for record, relation, file, artifact, and pipeline actions

Recommended MCP split:

- use MCP tools for actions and metadata operations
- use MCP resources for file/artifact payload reads
- prefer `resources/read` for binary or large file content
- agent or backend hydration then writes those bytes into the record workspace on disk

Suggested OpenCode config shape:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "crm": {
      "type": "remote",
      "url": "https://your-app.example.com/mcp",
      "headers": {
        "Authorization": "Bearer {env:CRM_MCP_TOKEN}"
      }
    }
  }
}
```

Recommended Hono shape:

```ts
import { Hono } from 'hono'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPTransport } from '@hono/mcp'

const app = new Hono()

app.all('/mcp', async (c) => {
  const transport = new StreamableHTTPTransport()
  const server = createCrmMcpServer(c)
  await server.connect(transport)
  return transport.handleRequest(c)
})
```

For auth, token-based bearer middleware is sufficient in v1.

### 7.3 Why not CLI-only orchestration

CLI is good for:

- manual admin workflows
- debugging
- inspecting model availability

But backend orchestration should use server + SDK because it gives:

- typed APIs
- session lifecycle access
- event streaming
- status inspection
- cleaner programmatic integration

---

## 8. Model routing strategy

### 8.1 Core rule

Model choice should be made **per task**, not per project and not hardcoded into the agent prompt.

V1 simplification:

- store model directly on `Task` as an optional string field: `model`
- when present, pass that string directly to OpenCode
- when absent, use the backend default model for the current environment

This keeps task execution explicit without introducing a separate model policy entity.

### 8.2 Runtime selection

For each task, backend should:

- read `task.model`
- if set, pass it to OpenCode
- if not set, fall back to default configured model

The chosen model string should use the normal OpenCode format:

- `provider/model-id`

Example:

- `openai/gpt-5`
- `anthropic/claude-sonnet-4-5`

### 8.3 OpenCode support used here

OpenCode supports:

- global default model
- per-agent `model`
- per-command `model`
- CLI `--model`
- SDK `session.prompt(... body.model ...)`

That makes a plain task-level `model` field practical.

---

## 8A. GUI and product workflow plan

The system needs a full GUI plan, not only backend execution design.

### 8A.1 Scope model in frontend

Frontend always works inside:

- current organization
- current project

There should be no “global mixed data” workspace in v1.

Primary app shell:

- organization switcher
- project switcher
- project navigation

### 8A.2 Main project views

Inside a project, frontend should provide at least:

1. task list view
2. record list view
3. task details page
4. record details page
5. project settings area

### 8A.3 Task list view

Task list should show:

- task title
- task id
- aggregate progress status derived from record processing
- task sort order
- created at / updated at
- total related records
- counts by processing status
- whether any agent run is currently active

The task list is user-sorted in v1.
Agents process tasks in that explicit project order.

Useful filters:

- status
- assigned pipeline version
- schema version
- active / inactive

### 8A.4 Record list view

Record list should show:

- record name
- record id
- record status
- whether an agent is currently working on it
- current queued task / latest run state
- linked relation summary

This view should make processing state visible immediately.

### 8A.5 Task details page

Each task needs its own details page with:

- title
- id
- description
- markdown viewer
- markdown editor
- description version history
- task metadata
- list of all related records
- per-record processing statuses

Task descriptions should have revision history in v1.

Per-record status list should show at least:

- waiting to be picked up
- in progress
- completed
- failed
- skipped

This page should also show aggregate progress counters.

### 8A.6 Record details page

Each record page should show:

- record envelope fields
- schema version
- full context editor with schema validation
- linked tasks
- active agent run if any
- related records via edges
- relation editor
- file list
- artifact list
- workspace/pipeline status summary

Users can fully edit record values in the UI as long as the values match the active schema.

### 8A.6A Schema management UI

The web UI should explicitly support browsing and editing the project schema model.

This should live in project scope, likely under project settings.

Schema UI should provide at least:

- current active schema version
- list of schema fields
- field type
- required / optional flag
- default value if supported
- validation/config metadata
- schema version history
- diff between schema versions

V1 schema editor should allow project members to:

- add field
- edit field definition
- remove/deprecate field
- create new schema version
- trigger or inspect migration tasks caused by schema changes

Schema field list should make relation-capable fields and record-linked usage visible where relevant.

Record editing UI must read from the active schema definition so forms and validation stay consistent.

The schema management area should also show:

- migration status for the current schema version
- affected record count
- latest schema change activity log

### 8A.7 UX for active agent work

When an agent is processing a record/task, that must be visible in both backend and frontend.

It should appear in:

- task list
- task details page
- record list
- record details page

Suggested visible states:

- `waiting`
- `claimed`
- `running`
- `awaiting_retry`
- `completed`
- `failed`

Task controls exposed in UI in v1:

- retry
- cancel
- rerun

### 8A.8 Realtime/update strategy

V1 should expose enough backend state to support polling or live updates for:

- task progress
- record processing state
- current agent run state
- latest transition timestamp

Decision for v1:

- poll every 3 seconds using React Query + tRPC

The backend state model must support this cleanly.

---

## 9. OpenCode projects and workspace topology

### 9.1 Decision

Decision already made:

- use **long-lived per-record workspaces**

### 9.2 How to interpret OpenCode “project”

OpenCode has its own project/worktree/session concepts.
We should use them, but carefully.

Recommended interpretation:

- your app project remains the business boundary
- each record gets a persistent disk workspace managed by your app/runtime
- OpenCode sessions run against that workspace when needed

This gives each record:

- reusable local helper files
- reusable Python scripts
- reusable intermediate outputs
- lower repeated setup cost

### 9.3 Important boundary

Even with long-lived per-record workspaces:

- **canonical state remains app-owned**
- OpenCode workspace is a persistent execution workspace, not the source of truth

So:

- app DB + disk-backed file storage store raw files, parsed artifacts, lineage, schema patches, task state
- record workspace stores useful local copies, helper scripts, and reusable execution assets

### 9.4 Why long-lived per-record workspace fits your use case

For 60 records with record-specific files:

- each record can keep its own file set organized locally
- helper scripts can evolve per pipeline version
- previous outputs can be materialized locally for reuse
- future tasks avoid re-downloading/re-hydrating everything

Risk:

- disk growth
- drift between workspace and canonical storage
- stale intermediates

Mitigation:

- workspace manifest
- strict artifact metadata
- canonical artifact IDs in app storage
- invalidation rules by source hash + pipeline version

---

## 10. File processing architecture

### 10.1 Problem to solve

Each record may have:

- a set of files
- record-specific parsing logic
- need to extract data into schema fields
- need to reuse processed outputs in future tasks

### 10.2 Storage layers

Use three layers.

### 10.2A V1 blob/file storage decision

Decision:

- for v1, store canonical blob files on local disk in a dedicated data directory configured via app config

Why this is acceptable in v1:

- simplest operational model
- no separate object storage dependency
- easy to inspect and debug locally
- fits single-instance or tightly controlled deployment
- aligns with long-lived per-record workspaces

Constraints:

- this is acceptable only while storage is tied to one runtime host or mounted persistent volume
- paths must be app-owned and outside transient temp dirs
- metadata still belongs in Postgres/app DB
- future move to S3-compatible storage should be possible without changing task semantics

Suggested split:

- Postgres: metadata, hashes, lineage, statuses, relations
- disk storage: raw uploaded files and large persistent artifacts
- record workspace: local execution copies and scratch outputs

Storage rule in v1:

- keep everything by default
- no automatic artifact/log retention cleanup in v1
- cleanup logic may exist for convenience, but canonical stored files/artifacts are retained

#### Layer A — source files

Canonical uploaded files.

Store on app-owned disk-backed storage in v1.

V1 file support should not be product-limited by file type.
Agents can use a broad toolset to read and manipulate files.
The effective support envelope comes from available parsers/tools, not an allowlist in the product model.

#### Layer B — persistent derived artifacts

Canonical parsed outputs.

Store on app-owned disk-backed persistent storage in v1.

Examples:

- extracted text
- normalized JSON
- parsed tables
- field candidate maps
- classification outputs
- schema patch inputs

#### Layer C — record workspace files

Persistent but non-canonical execution files on disk.

Examples:

- downloaded copies of source files
- local copies of prior artifacts
- Python helpers
- temp transforms
- debug outputs
- lightweight indexes

### 10.3 Artifact model

Suggested concept:

```ts
type Artifact = {
  id: string
  projectId: string
  recordId: string
  fileId: string
  stage: string
  sourceHash: string
  pipelineVersion: string
  format: string
  storagePath: string
  metadata: Record<string, unknown>
  createdAt: Date
}
```

Machine note:

- `Artifact` should be machine-driven in v1
- artifact lifecycle like registered, available, invalidated, or superseded should use explicit transitions

`storagePath` should be an app-controlled path, not an OpenCode workspace path.

Suggested stages:

- `text_extraction`
- `structure_normalization`
- `field_candidates`
- `record_patch_input`
- `post_validation_report`

### 10.4 Lineage and reuse

Every artifact should be keyed by:

- `record_id`
- `file_id`
- `stage`
- `source_hash`
- `pipeline_version`

This enables future tasks to decide:

- reuse existing artifact
- recompute one stage only
- full reprocess

### 10.5 Pipeline versioning

Create a versioned `PipelineDefinition`.

```ts
type PipelineDefinition = {
  id: string
  name: string
  version: string
  stages: string[]
  parserAssetVersion: string
  createdAt: Date
}
```

Machine note:

- `PipelineDefinition` can stay plain config in v1
- only the execution entity `PipelineRun` needs to be machine-driven by default
- if publish/rollout workflow becomes important later, pipeline definition promotion can also move to a machine

If processing changes later:

- bump pipeline version
- inspect which stages are invalidated
- create reprocessing tasks
- prefer artifact-stage reuse before raw re-parse

---

## 10A. Cross-project relation architecture

### 10A.1 Problem to solve

Projects can contain different record types while sharing the same system architecture.

Example:

- project `companies`
- project `offers`

Each `offer` record may need to reference one `company` record.
The offer agent should be able to fetch related company context when processing tasks.

### 10A.2 Relation storage model

Use a generic edge table.

Do not embed relations as copied fields inside record `context`.

Store relation identity separately from related record data.

Suggested keys:

- `from_project_id`
- `from_record_id`
- `to_project_id`
- `to_record_id`
- `relation_type`
- `status`

Suggested indexes:

- `(from_record_id, relation_type, status)`
- `(to_record_id, relation_type, status)`
- `(from_project_id, to_project_id, relation_type)`

### 10A.3 Relation semantics

Each edge should also carry metadata such as:

- `confidence`
- `source`
- `created_by_task_id`
- `notes`

This keeps relation creation auditable.

### 10A.4 Cardinality rules

Generic edges are flexible, but business rules still need explicit enforcement.

Examples:

- one `offer` can have at most one active `belongs_to` edge to a `company`
- one `company` can have many inbound `belongs_to` edges from `offers`

These rules should be enforced in app logic, not by the agent prompt alone.

### 10A.5 Agent access pattern

Agents should not infer or guess linked records from copied fields.

Instead they should:

1. read current record
2. query allowed edges
3. fetch related record context through explicit tools
4. use full related record context as input in v1

UI rule in v1:

- users can create, edit, and deactivate relations directly in the frontend
- relation edits should remain auditable through append-only activity logging

### 10A.6 V1 traversal policy

Keep traversal shallow in v1:

- maximum relation depth: `1`
- only declared relation types may be traversed
- returned related context is full context in v1

This avoids context blow-up and reduces permission risk.

---

## 11. Schema migration design

Schema changes must be first-class tasks.

V1 product rule:

- any project member can create schema changes through the UI

### 11.1 Flow

1. create new `ProjectSchema` version
2. create a normal project task describing the schema adoption work
3. the task description should include old schema, new schema, and adoption instructions
4. create per-record processing entries for affected records
5. each record agent picks that task from the project queue and derives new fields from:
   - existing record context
   - persistent artifacts
   - source files only if necessary
6. apply validated patch
7. mark record migrated
8. finalize project migration when all records complete

### 11.2 Migration task shape

Suggested approach in v1:

- no special migration-only task executor is needed
- schema migration is represented as a normal project task with explicit migration description
- migration-specific meaning lives in the task description and linked schema versions, not in a task type field

### 11.3 Key rule

For schema migrations, prefer:

1. existing context
2. existing artifacts
3. source files

This is the cheapest and most stable order.

---

## 12. Task model simplification

In v1, tasks should be generic project work items.

Rules:

- remove task type from the data model
- all tasks look the same in UI and backend
- task meaning comes from title, markdown description, linked schema version, linked files, and record processing state
- core task summary should be derived from per-record execution state

For system behavior, the important task-level outcomes are only:

- `todo`
- `failed`
- `done`

These should be derived summary values, not special task-type logic.

---

## 13. MCP agent tools to implement

This is the main agent tool surface exposed through the app-owned Hono MCP server.

Scope rule for all `crm_*` tools:

- every call must be scoped by `projectId`
- and then by either `recordId` or `taskId`, depending on the operation
- tools must never operate on global unscoped data
- backend must validate that the scoped project/task/record relation is valid before doing work

### 13.1 Core record tools

1. `crm_read_record`
   - read record envelope + context for `projectId + recordId`

2. `crm_read_project_schema`
   - read active schema and versions for `projectId`

3. `crm_propose_patch`
   - return a typed patch proposal for `projectId + recordId` without mutating DB
   - patch means an explicit list of field-level changes against record context/schema-backed values
   - each change should say which field changes, the new value or unset operation, and why

4. `crm_apply_patch`
   - apply a validated field-level patch to `projectId + recordId` with optimistic lock
   - this tool must only apply the explicit changes from the patch payload, not freeform mutations

5. `crm_complete_task_record`
   - mark one record's processing for `projectId + taskId + recordId` as completed with result metadata

6. `crm_fail_task_record`
   - mark one record's processing for `projectId + taskId + recordId` as failed with structured reason

### 13.1A Relation tools

7. `crm_list_relations`
   - list active edges for `projectId + recordId` by direction and relation metadata

8. `crm_get_related_record`
   - fetch one related record envelope + full context + edge metadata for `projectId + recordId`

9. `crm_get_related_records`
   - fetch multiple linked records for `projectId + recordId`

10. `crm_create_relation_edge`
    - create a cross-project relation when current task permissions explicitly allow it
    - must be scoped by project and concrete source/target record ids

11. `crm_deactivate_relation_edge`
    - deactivate or supersede an existing relation edge in scoped project context

### 13.2 File and artifact tools

12. `crm_list_record_files`
   - list canonical files for `projectId + recordId`

13. `crm_fetch_file`
   - request canonical file hydration into the record workspace for `projectId + recordId`

14. `crm_list_artifacts`
   - list reusable artifacts for `projectId + recordId` by stage/version/hash

15. `crm_get_artifact`
   - request artifact hydration into workspace or return metadata for `projectId + recordId`

16. `crm_put_artifact`
   - persist new artifact to app-owned storage for `projectId + recordId`

17. `crm_get_pipeline_definition`
   - get stage list, parser asset version, invalidation policy for `projectId`

18. `crm_register_pipeline_run`
   - log lineage for one processing attempt in `projectId + taskId + recordId` scope

### 13.2A MCP resources for file payloads

In addition to tools, the Hono MCP server should expose resources for file and artifact contents.

Recommended pattern:

- tools return metadata, ids, and hydration actions
- MCP `resources/read` returns actual text/blob content
- backend hydrator or agent writes fetched content into the record workspace

This is the preferred way to expose large or binary file payloads.

### 13.3 Workspace support tools

19. `crm_write_workspace_manifest`
   - maintain local state summary for the scoped record workspace

---


---

## 15. Workspace layout proposal

For each record, create a long-lived directory.

Suggested shape:

```txt
/agent-workspaces/
  /project_<projectId>/
    /record_<recordId>/
      workspace.json
      /source-files/
      /artifacts/
      /pipeline-assets/
      /scratch/
      /logs/
```

### Suggested semantics

- `workspace.json`
  - local manifest
  - last hydrated source hashes
  - known artifact refs
  - current pipeline version

- `source-files/`
  - local copies of canonical files

- `artifacts/`
  - local materialized copies of persistent artifacts

- `pipeline-assets/`
  - Python scripts and helper files for parsing

- `scratch/`
  - temp outputs for current run

- `logs/`
  - optional local diagnostics

Important:

- files here are useful and persistent for execution
- but app storage still owns truth and lineage

---

## 16. Parser assets and Python scripts

You explicitly want agents to be able to save files and reuse them, including Python scripts.

### 16.1 Rule

Treat parser/helper scripts as **versioned pipeline assets**, not arbitrary permanent agent memory.

### 16.2 Suggested model

Each `PipelineDefinition` points to a parser asset bundle version.

That bundle may include:

- Python scripts
- templates
- regex config
- mapping config
- test samples

### 16.3 How agents use them

At runtime, the orchestrator ensures the record workspace contains the required pipeline asset version.

Agents may:

- read existing scripts
- run them
- produce outputs
- propose updates to scripts if current task permissions allow it

But script promotion into a new canonical pipeline asset version should be explicit.

### 16.4 V1 recommendation

In v1:

- agents may use local scripts
- pipeline logic changes should still go through explicit tasks/review
- do not silently let record agents fork permanent parser logic without governance

---

## 17. Execution flow

### 17.1 Standard record task

1. background scheduler checks project task queues in sort order
2. each record agent picks the next eligible project task that is not yet done for that record
3. backend resolves record, schema, task model, pipeline version
4. backend ensures record workspace exists
5. backend hydrates missing files/artifacts into workspace
   - preferred path: fetch bytes from MCP `resources/read`
   - write hydrated content into the record workspace on disk
   - use MCP tools for metadata and hydration control
6. backend creates OpenCode session
7. backend sends prompt with:
   - task contract
   - schema
   - record envelope
   - allowed tools
   - expected structured output
8. OpenCode run executes tools / scripts / parsing
9. outputs are persisted via MCP tools
10. backend stores AgentRun metadata
11. task-record state is completed or retried

The project task itself remains the description and ordering unit.
Execution state belongs to the per-record processing entry, not to the task definition itself.

Development mode requirement:

- frontend should expose a switch to disable autopick
- when disabled, users can manually trigger task processing for development/debugging

### 17.2 Schema migration task

1. schema version bump created in app
2. create a normal project task with description like: old schema, new schema, adopt
3. create per-record processing rows for all affected records
4. each record run loads old context + available artifacts
5. the normal record worker derives new fields
6. patch is applied
7. migration status stored per record

### 17.3 File reprocess task

1. pipeline version changed
2. executor computes affected records/files/stages
3. reuse valid artifacts if allowed
4. re-run invalidated stage(s)
5. persist new artifacts and lineage
6. update record fields if downstream mappings changed

---

## 18. Structured output strategy

Use OpenCode structured output for deterministic results whenever possible.

Good fit for:

- field extraction
- patch proposals
- validation reports
- migration summaries

Suggested response families:

### Patch proposal

```ts
type PatchProposal = {
  recordId: string
  baseVersion: number
  changes: Array<{
    field: string
    op: "set" | "unset"
    value?: unknown
    reason: string
    sources: string[]
  }>
}
```

### Artifact creation result

```ts
type ArtifactResult = {
  fileId: string
  stage: string
  pipelineVersion: string
  outputFormat: string
  metadata: Record<string, unknown>
}
```

### Failure result

```ts
type TaskFailure = {
  code: string
  retryable: boolean
  message: string
  missingInputs?: string[]
}
```

---

## 19. Concurrency, locking, and idempotency

### 19.1 V1 execution rule

One active execution per record at a time.

A record can belong to multiple project tasks, but its agent processes them one by one in the project's user-managed sort order.

Why:

- avoids patch races
- avoids workspace races
- simpler tool permissions
- simpler artifact lineage

### 19.2 Required guards

- record `version` optimistic lock
- task idempotency key
- pipeline run idempotency key
- artifact uniqueness by hash/stage/version

### 19.3 Retry model

Retries should create new `AgentRun`s but preserve task linkage.

Safe retries should reuse:

- workspace files
- prior artifacts
- prior downloaded source files

But must not duplicate:

- schema patch application
- artifact registration
- task completion

---

## 19A. State machines and lifecycle control

Most important backend entities should be driven by explicit state machines.

Decision:

- use `machin` for important lifecycle handling

Docs checked via Context7 on 2026-04-01:

- Machin library `/davasny/machin`
- TypeScript state machine library with persisted actors and Drizzle/Postgres support
- supports typed states/events/context and persisted transitions

Why this matters here:

- agent workflows are multi-step and failure-prone
- retry and async entry logic need strict transition control
- frontend needs trustworthy, queryable status values
- backend and frontend should share a stable lifecycle vocabulary

### 19A.1 Entities that should use state machines in v1

At minimum:

- `Record`
- `AgentRun`
- `RecordProcessingState` per task-record pair
- `RecordEdge`
- `Artifact`
- `PipelineRun`

`Task` itself should stay a description/ordering entity, not an execution state machine.
If we need task-level summary state in reads, it should be derived from `TaskRecord` rows.

`ProjectSchema` and `PipelineDefinition` can stay plain versioned definitions in v1 unless they later need guarded publish/promote workflows.

Payload/result types like `PatchProposal`, `ArtifactResult`, and `TaskFailure` should stay plain DTOs, not state machines.

Machine-first rule:

- if an entity has user-visible lifecycle, retries, invalidation, approval, activation, deactivation, or async processing, prefer a machine
- if an entity is mostly descriptive config or transient payload, keep it plain

### 19A.2 Important note on Task vs task-record processing

Some tasks fan out across many records.

So backend should distinguish:

1. task definition / ordering
2. per-record processing lifecycle inside that task

Suggested extra entity:

```ts
type TaskRecord = {
  id: string
  taskId: string
  recordId: string
  state: string
  agentRunId?: string
  lastTransitionAt: Date
  errorCode?: string
}
```

This is what powers the task details page record status list.

### 19A.3 Suggested v1 task summary state

If the UI needs a single task badge, it should be derived rather than stored as canonical execution state.

Example derived values:

- `not_started`
- `in_progress`
- `partially_completed`
- `completed`
- `failed`
- `cancelled`

### 19A.4 Suggested v1 task-record lifecycle

This directly matches your UI requirement.

Example:

- `waiting`
- `picked_up`
- `in_progress`
- `completed`
- `failed`
- `skipped`

These states map directly to the UI language for “waiting to be picked up”, “in progress”, and “done”.

### 19A.5 Suggested v1 agent run lifecycle

Example:

- `created`
- `booting`
- `running`
- `persisting_outputs`
- `completed`
- `failed`
- `aborted`

### 19A.6 Frontend implications

Frontend should not invent status locally.

Instead it should render persisted backend machine states for:

- task list badges
- record list badges
- task details progress table
- active agent indicators

### 19A.7 Machine design rule

Use state machines for transitions that matter to:

- user-visible progress
- retries
- idempotency
- compensating actions
- auditability

Avoid ad hoc boolean flags like:

- `isProcessing`
- `isDone`
- `isFailed`

when a proper machine state should exist instead.

---

## 20. Permissions and guardrails

### 20.1 OpenCode permissions

Use OpenCode permissions to restrict agents.

Important controls:

- deny broad unsafe bash where possible
- allow only necessary filesystem usage
- limit tool surface to app-specific tools + minimal local tools

### 20.2 Business guardrails

Enforce in app logic too:

- a task run can only mutate its current record while processing the project task queue
- schema migration tasks need explicit schema target version
- only approved model IDs can be used in runtime selection
- parser asset versions must be explicit
- manual record edits in UI must validate against active schema before persistence
- relation edits in UI must stay auditable

### 20.3 Recommended rule

Prompt instructions are not enough.
Use tool and API-level enforcement.

---

## 21. Observability

Track at least:

- task id
- record id
- model/provider
- tokens
- cost
- latency
- tool calls
- source files touched
- artifacts reused vs generated
- patch apply result
- failure code

Useful derived metrics:

- cost per task
- cost per migrated record
- artifact reuse rate
- parse avoidance rate
- average task retries
- pipeline version regression rate

---

## 22. Recommended v1 boundaries

### Include in v1

- GitHub OAuth only with Better Auth
- organization + project scoped tenancy
- owner-managed organization membership for existing users
- frontend project shell with task and record views
- task details page with markdown editor/viewer and per-record progress states
- shared per-project schema
- records with JSON context
- tasks and agent runs
- task-record processing state entity
- state machines for important backend lifecycles using Machin
- OpenCode server + SDK orchestration
- per-task model routing
- Hono MCP tools for record/file/artifact/relation operations
- long-lived per-record workspaces
- persistent app-owned artifacts with lineage
- schema migration fan-out tasks

### Exclude from v1

- email invitations
- public self-serve org joining
- multi-provider auth
- many record types with independent schemas
- open-ended autonomous planning
- uncontrolled cross-record agents
- fully agent-authored persistent parser evolution
- broad MCP server sprawl

---

## 23. Recommended implementation order

### Phase 1 — auth, tenancy, and core domain

1. set up Better Auth with GitHub OAuth only
2. add `Organization`, memberships, and owner role flow
3. define `Project`, `ProjectSchema`, `Record`, `Task`, `AgentRun`, `TaskRecord`, `RecordEdge`
4. define record envelope + JSON context storage
5. add one-active-execution-per-record rule against the project task queue

### Phase 2 — state machines and backend lifecycle

6. define Machin machines for `TaskRecord`, `AgentRun`, and `PipelineRun`
7. persist machine state with Drizzle/Postgres
8. make backend APIs expose machine states directly for frontend use

### Phase 3 — frontend shell and workflow UI

9. build organization/project scoped app shell
10. build task list and record list views
11. build task details page with markdown viewer/editor
12. build per-record progress table on task details page
13. build record details page with files/artifacts/relations summary

### Phase 4 — OpenCode runtime

14. stand up `opencode serve`
15. integrate `@opencode-ai/sdk`
16. add task executor service
17. add task-level `model` field handling

### Phase 5 — Hono MCP tools

18. expose app MCP server with Hono
19. implement record/schema tools
20. implement task completion tools
21. implement artifact/file tools
22. implement relation tools

### Phase 6 — file processing

23. define `source_file`, `artifact`, `pipeline_definition`, `pipeline_run`
24. define canonical local disk storage layout
25. create record workspace hydrator
26. create first parser asset bundle
27. support artifact reuse rules

### Phase 7 — migrations

28. add schema versioning
29. add schema migration task family
30. add project migration controller
31. add migration auditing

### Phase 8 — hardening

32. add plugin-based telemetry and guardrails
33. add cleanup/invalidation logic for workspaces
34. add cost reporting and retry dashboards

---

## 24. Main design decisions made so far

1. canonical object name in v1: **record**
2. schema model: **shared per project** with required `id` and `name`
3. schema evolution: **task-driven**, including per-record migration tasks
4. OpenCode role: **execution runtime**, not source of truth
5. model routing: **per task via optional `task.model` string**
6. parsed outputs: **persistent app-owned storage**
7. workspace topology: **long-lived per-record workspaces**
8. file processing reuse: **prefer prior artifacts before re-parsing raw files**
9. tool transport: **app-owned Hono MCP server exposed to OpenCode**
10. v1 blob storage: **local disk next to the app/runtime**
11. auth provider: **GitHub OAuth only with Better Auth**
12. tenancy model: **organizations contain projects; users always work inside a project scope**
13. lifecycle handling: **important execution entities use Machin state machines; project tasks themselves stay descriptive**
14. machine stance: **machine-first for lifecycle entities; plain types only for config and DTO payloads**

---

## 25. Immediate next planning targets

The best next step is to sharpen this into implementation-grade specs:

1. DB schema
   - exact tables and keys

2. executor flow
   - orchestration lifecycle around OpenCode sessions

3. MCP tool contracts
   - exact inputs/outputs for `crm_*` MCP methods

4. file/artifact lineage rules
   - invalidation and reuse behavior

5. workspace contract
   - exact directory layout and sync rules

6. local disk storage contract
   - canonical path layout, retention, and backup assumptions

7. task model rules
   - allowed model string format, defaults, and validation

8. frontend workflow spec
   - project shell, task details page, record views, and progress UX

---

## 26. Open questions to resolve next in this file

These are the next likely decision points:

- exact DB schema for files and artifacts
- whether schema field definitions support enums/validators/computed fields in v1
- whether agents can propose parser asset changes or only use approved versions
- whether per-record workspace should be in repo-adjacent storage or external runtime storage
- whether small JSON artifacts should be mirrored in Postgres in addition to disk storage
- exact organization/project membership role set beyond owner in v1
- exact realtime strategy for frontend state updates: polling vs SSE vs websockets
