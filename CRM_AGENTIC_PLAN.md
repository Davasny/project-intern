# Project Intern — Agentic CRM / Task System Plan

## 1. Objective

Build a fresh CRM/task management system that is **agentic-first** for **intern-level work**:

- humans define the task, process, and expected outcome
- agents execute one scoped task at a time
- each business object has structured context
- schema evolution is handled through explicit tasks
- file processing is first-class and reusable across future tasks

V1 stack:

- TypeScript
- Next.js App Router
- tRPC + TanStack React Query
- Drizzle + PostgreSQL 18
- Docker Compose for local database runtime
- Better Auth
- Zod
- Hono mounted as the single Next.js API app
- Machin for lifecycle state machines
- OpenCode server + SDK for agent execution
- shadcn/ui + Tailwind CSS for frontend

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
- `ProjectSchemaVersion` — one versioned required + custom field definition set for the project
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
- development environment also supports Better Auth anonymous login plugin for account-free testing

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

#### ProjectSchemaVersion

Defines one versioned shared schema for all records inside one project.

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
  state: "active" | "archived" | "processing" | "error"
  context: Record<string, unknown>
  version: number
  createdAt: Date
  updatedAt: Date
}
```

Machine note:

- `Record` should be machine-driven in v1
- the stored record state should come from a Machin actor, not ad hoc status flags
- `state` here represents machine state, not a freeform business column concept

#### Task

A task is the contract for work.

In v1, a task belongs to a project and targets **all records in that project**.
The project owns a user-managed sorted task list, and each record agent processes tasks from that ordered queue.

Suggested shape:

```ts
type Task = {
  id: string
  projectId: string
  title: string
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
- `title` is required and is the primary UI label in lists, details pages, and activity views

Task fan-out rule for v1:

- when a task is created, create `TaskRecord` rows for all records that currently exist in the project
- when a new record is later created, automatically create missing `TaskRecord` rows for existing applicable project tasks
- deduplicate with a unique `(taskId, recordId)` constraint
- task execution still respects project task ordering and one-active-execution-per-record rules

#### AgentRun

Represents one OpenCode execution attempt.

Stores:

- session reference
- selected model
- selected agent
- execution state
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
  state: "active" | "inactive"
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

### 4.2 Concrete application architecture blueprint

Use a single Next.js application as the main UI host in v1, with one Hono app mounted inside the Next.js API layer as the only backend request entrypoint.

Runtime layers:

1. **Next.js app router**
   - hosts authenticated product UI
   - owns route layouts, organization/project scope, and project settings pages

2. **Single Hono API layer inside Next.js**
   - mounted once in the Next.js API directory
   - handles all backend HTTP traffic for tRPC, Better Auth, MCP, and any future internal endpoints
   - centralizes auth middleware, request context, logging, and shared route composition

3. **Domain services layer**
   - feature-local services coordinate DB access, validation, storage, and machine transitions
   - routers stay thin and call feature services

4. **Machin lifecycle layer**
   - owns transition rules for `TaskRecord`, `AgentRun`, `PipelineRun`, `Artifact`, and `RecordEdge`
   - frontend renders persisted machine state directly

5. **Executor layer**
   - scheduler selects eligible `TaskRecord`
   - executor ensures workspace hydration
   - executor opens OpenCode session through SDK
   - executor persists outputs, transitions state, and records telemetry

6. **Hono sub-apps / route groups**
   - Hono serves `/trpc/*`, `/auth/*`, `/mcp`, and any future backend endpoints from one mounted app
   - MCP remains one route group inside that same Hono app

7. **Postgres + local disk storage**
   - Postgres stores canonical metadata, schema versions, machine states, lineage, and audit trail
   - local disk stores canonical files/artifacts and long-lived record workspaces

### 4.3 Concrete repository blueprint

Recommended repository structure for this project:

```txt
src/
  app/
    (public)/
    (protected)/
      app/
        [organizationSlug]/
          [projectSlug]/
            tasks/
            records/
            settings/
    api/
      [[...route]]/route.ts
  components/
    ui/
  features/
    auth/
    organizations/
    projects/
    project-schema/
    records/
    tasks/
    task-records/
    agent-runs/
    record-edges/
    files/
    artifacts/
    pipelines/
    execution/
    observability/
  lib/
    config/
    db.ts
    trpc/
    logger.ts
    machin/
    opencode/
    mcp/
  utils/
```

Repository rules for this plan:

- all auth ownership lives in `src/features/auth`
- do **not** create `src/lib/auth`; shared auth code belongs to the auth feature
- `src/features/auth` should own Better Auth config, auth client, roles, org helpers, auth-facing schemas, and auth DB tables
- `src/lib/config` should be split into `frontend.ts`, `backend.ts`, and `database.ts`
- `src/lib/config/database.ts` should be imported only by `src/lib/db.ts`
- feature code must not import database config directly; it should import the ready DB client from `src/lib/db.ts`
- this avoids loading all app configs during Drizzle generate/migrate flows
- feature folders own their Drizzle schema, Zod schemas, services, and tRPC router
- shared infrastructure lives in `src/lib`
- reusable UI primitives live in `src/components/ui`
- if the same UI structure appears in 2+ places, extract a semantic reusable component under `src/components/ui/<component-name>/` built from shadcn primitives and composition
- avoid generic reusable names like `Container`, `Wrapper`, or `Panel` when a more specific UI concept exists
- feature folders may keep only feature-specific components; repeated cards, tables, badges, headers, metadata blocks, and editors should move to `src/components/ui`
- task, record, schema, and relation forms should each have one primary form component reused across modal, drawer, inline, or details-page shells instead of duplicating form markup per surface
- feature pages compose feature components and call tRPC procedures served through the shared Hono app
- Better Auth, tRPC, and MCP are all exposed through one Hono mount, not separate Next.js route handlers
- background orchestration code lives in `src/features/execution`

Concrete auth feature shape:

```txt
src/features/auth/
  db.ts
  router.ts
  consts/
  lib/
    auth.ts
    auth-client.ts
    global-roles.ts
    organization-roles.ts
  utils/
```

Concrete config and DB shape:

```txt
src/lib/config/
  frontend.ts
  backend.ts
  database.ts

src/lib/
  db.ts
```

Config ownership rules:

- `frontend.ts` contains only browser-safe public config
- `backend.ts` contains server runtime config except direct DB connection config
- `database.ts` contains only DB connection/runtime settings needed to construct the Drizzle client
- `db.ts` is the only place allowed to import `database.ts`
- all features import the DB client from `src/lib/db.ts`, never raw database env config

Auth implementation rules:

- `src/features/auth/lib/auth.ts` owns the Better Auth server instance
- `src/features/auth/lib/auth-client.ts` owns the Better Auth client instance
- GitHub OAuth stays enabled for normal v1 usage
- Better Auth anonymous plugin is enabled only when app config marks the environment as development
- auth route handlers are still mounted through the shared Hono API app

Concrete execution feature shape:

```txt
src/features/execution/
  lib/
    scheduler-service.ts
    executor-service.ts
  queues/
    task-executor-queue.ts
    task-executor-worker.ts
    schedule-task-executor.ts
  entrypoints/
    run-execution-workers.ts
```

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
- in development only, also enable Better Auth anonymous login plugin to allow testing without creating a real account

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

Development anonymous flow:

1. developer starts an anonymous session in local/dev environment
2. system creates an anonymous user/session through Better Auth anonymous plugin
3. system creates a disposable personal organization for that anonymous user if missing
4. anonymous user can test project creation and normal product flows in dev
5. anonymous login must be disabled outside development environments

Membership flow in v1:

- organization owners can add existing users to the organization
- no email invitation flow yet
- no public join links yet
- organization membership stays minimal: `owner` and `member`
- all project members can operate normal project workflows in v1

### 5.6 Concrete v1 database blueprint

Use Drizzle with one table definition file per feature. The canonical v1 tables should be:

#### Auth / tenancy

- `user`
- `session`
- `account`
- `verification`
- `organization`
- `organizationMembership`

Better Auth plugin note:

- keep auth tables inside `src/features/auth/db.ts`
- configure GitHub OAuth as the normal v1 auth method
- configure Better Auth anonymous plugin only in development
- when anonymous login is enabled, plan for anonymous-user-to-real-account linking later, but keep v1 implementation minimal

#### Core business

- `project`
- `projectSchemaVersion`
- `record`
- `task`
- `taskDescriptionRevision`
- `taskRecord`
- `agentRun`
- `recordEdge`
- `activityLog`

#### Files and pipelines

- `sourceFile`
- `artifact`
- `pipelineDefinition`
- `pipelineRun`

#### Concrete table responsibilities

- `project` stores org ownership, slug, display name, active schema version id, and executor defaults
- `projectSchemaVersion` stores the full validated ProjectSchemaVersion JSON, version number, and optional parent version id
- `record` stores project envelope fields, active schema version, machine state, JSONB `context`, and optimistic `version`
- `task` stores title, ordering, markdown description, optional model override, optional pipeline version, and idempotency key
- `taskDescriptionRevision` stores append-only task description history for the UI diff/revision view
- `taskRecord` stores the per-record lifecycle row for one `(taskId, recordId)` pair
- `agentRun` stores one execution attempt for one `taskRecord`
- `recordEdge` stores generic cross-project relations with machine state and auditable metadata
- `sourceFile` stores canonical uploaded file metadata and disk storage path
- `artifact` stores canonical derived output metadata, lineage tuple, machine state, and disk storage path
- `pipelineDefinition` stores versioned stage config and parser asset bundle version
- `pipelineRun` stores one processing attempt lineage for one task-record execution
- `activityLog` stores append-only audit events for user actions and machine-visible transitions

### 5.7 Concrete v1 relational rules

Required constraints and indexes:

- `organization.slug` unique
- `project (organizationId, slug)` unique
- `projectSchemaVersion (projectId, version)` unique
- `record (projectId, id)` indexed and `record.name` indexed per project
- `task (projectId, sortOrder)` unique
- `taskRecord (taskId, recordId)` unique
- `agentRun (taskRecordId, attemptNumber)` unique
- `artifact (recordId, fileId, stage, sourceHash, pipelineVersion)` unique
- `recordEdge` indexes on source, target, and `(fromProjectId, toProjectId, relationType)`
- partial unique app rule for one active task execution per record at a time

### 5.8 Membership simplification decision

Resolve the earlier ambiguity as follows for v1:

- keep explicit `organizationMembership`
- do **not** add separate `projectMembership` yet
- all organization members can access all projects in that organization in v1
- if project-specific access is needed later, add `projectMembership` in v2 without changing core record/task design

### 5.8A Task fan-out semantics

Decision:

- project tasks target all records in the project
- task fan-out is **not** snapshot-only in v1
- new records created after a task exists should automatically get missing `TaskRecord` rows for existing applicable tasks

Required rules:

- task creation fans out to all current records in project scope
- record creation backfills missing `TaskRecord` rows for existing project tasks
- backfill must be idempotent and rely on the unique `(taskId, recordId)` constraint
- task details and aggregate progress always read from `TaskRecord`, never from ad hoc counters
- scheduler only claims from persisted `TaskRecord` rows

### 5.9 Local database runtime blueprint

For local development, use Docker Compose the same way as in the reference projects.

Concrete local database defaults for **Project Intern**:

- database service managed by `docker-compose.yml` or `compose.yml`
- PostgreSQL 18 image
- host port: `5433` to avoid conflicts with other local projects
- database name: `project_intern`
- database user: `intern`
- database password: `intern`

Rules:

- `src/lib/config/database.ts` should define the local `DATABASE_URL` source for the DB client
- only `src/lib/db.ts` may import `src/lib/config/database.ts`
- keep credentials simple only for local development
- do not reuse database credentials from other projects
- production/staging environments must override all DB credentials and host settings

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
- one app-owned Hono application mounted in Next.js API

Your backend should:

1. create/select a task
2. read the task model override if present
3. prepare workspace inputs
4. expose record/file/artifact/relation operations through the MCP routes inside the shared Hono app
5. create an OpenCode session
6. send prompt + context + model override
7. capture structured output / MCP tool effects
8. persist results in your app DB/storage

### 7.2B Concrete backend service split

Recommended app services:

- `api-app-service` — builds the single Hono app, mounts route groups, injects request context, and shares middleware across tRPC, Better Auth, and MCP
- `auth-service` — Better Auth integration and post-login organization bootstrap
- `project-access-service` — resolves current org/project scope and membership checks
- `project-schema-service` — schema version creation, validation, diffing, and active-version reads
- `record-service` — record CRUD, schema-validated context updates, optimistic patch application
- `task-service` — task CRUD, ordering, revision history, and task fan-out into `taskRecord`
- `task-record-service` — claim, retry, cancel, skip, and state transition helpers
- `agent-run-service` — create run, persist telemetry, attach outputs/failures, finalize run
- `relation-service` — relation creation, deactivation, traversal, and cardinality enforcement
- `file-service` — canonical file registration, hashing, and hydration control
- `artifact-service` — artifact registration, reuse lookup, invalidation, and storage access
- `workspace-service` — record workspace path resolution, hydration, manifest sync, and local cleanup
- `executor-service` — main orchestration around OpenCode session lifecycle
- `scheduler-service` — selects next eligible `taskRecord` in project task order
- `execution-queue-service` — queue enqueueing and worker handoff for record task execution
- `execution-schedule-service` — pg-bosser schedule registration for recurring scheduler ticks and maintenance jobs
- `observability-service` — query cost, latency, retries, and artifact reuse metrics

Queue/runtime recommendation based on reference project structure:

- use `pg-bosser` for background execution in v1
- `pg-bosser` is the app-local wrapper around `pg-boss` used by this project
- keep queue definitions in feature folders, not in shared `lib`
- use one queue for task execution handoff and separate scheduled jobs for recurring orchestration work
- use pg-bosser schedules for scheduler ticks, retry scans, and optional workspace maintenance
- keep worker bootstrapping in a dedicated entrypoint, separate from the web request runtime

Auth plugin recommendation:

- use Better Auth anonymous plugin only in development environments
- keep GitHub OAuth as the default non-dev sign-in path
- do not expose anonymous login in production UI or production config
- Better Auth Agent Auth is useful as a future path for external or third-party agent registration/capability grants, but should not be the default internal executor auth layer in v1 because the plugin is currently unstable

### 7.2A MCP transport decision

Prefer a single app-owned Hono application with an MCP route group over a large set of `.opencode/tools/*` files.

Why:

- tool logic lives next to app services and DB access
- no duplicated tool contracts between app and OpenCode
- easier auth, rate limits, and audit control
- simpler deployment for multiple agent runtimes
- OpenCode can consume it through normal remote MCP config

Recommended setup:

- one Next.js API catch-all route mounts the Hono app
- Hono exposes `/auth/*` for Better Auth handlers
- Hono exposes `/trpc/*` for tRPC
- Hono exposes `/mcp` for remote MCP
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

app.route('/auth', authApp)
app.route('/trpc', trpcApp)

app.all('/mcp', async (c) => {
  const transport = new StreamableHTTPTransport()
  const server = createCrmMcpServer(c)
  await server.connect(transport)
  return transport.handleRequest(c)
})
```

For auth, token-based bearer middleware is sufficient in v1.

### 7.2C Auth and caller identity blueprint

Every important surface should have explicit caller identity.

Required auth split for v1:

1. **User auth**
   - Better Auth session auth for product UI and normal app API access
   - all tRPC and Hono handlers resolve user, organization membership, and project scope before business logic

2. **Executor auth**
   - background workers and internal executor flows use app-owned service credentials
   - executor identity is separate from end-user identity
   - every write still records `taskId`, `taskRecordId`, `agentRunId`, and effective initiating user when available

3. **MCP auth**
   - remote MCP routes require bearer auth
   - bearer token is validated before exposing tools or resources
   - MCP handlers must also validate project/task/record scope on every call

4. **Audit attribution**
   - activity log should record both actor type and actor id
   - actor types should distinguish at least `user`, `executor`, and `system`
   - agent-triggered mutations should remain attributable to the owning `AgentRun`

5. **Better Auth Agent Auth position**
   - docs checked 2026-04-01: Better Auth Agent Auth supports capability-based auth, MCP/OpenAPI adapters, JWTs, and audit hooks
   - plugin is explicitly marked unstable in current docs
   - useful if this product later needs external agent registration/discovery or delegated third-party agent access
   - not required for the internal app-owned executor and MCP setup in v1

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

Screen planning rule for v1:

- do **not** introduce all screens at once
- each implementation phase should add only the screens needed for the capabilities introduced in that phase
- prefer full routes for primary work surfaces and heavy editors
- prefer embedded modals, drawers, and panels for lighter create/edit flows in v1
- default UI stance: show as much useful scoped data as possible from the backend
- useful means machine `state`, ids, timestamps, counts, latest run info, relation summaries, schema version, file/artifact summaries, and audit pointers when available

### 8A.1 Scope model in frontend

Frontend always works inside:

- current organization
- current project

There should be no “global mixed data” workspace in v1.

Primary app shell:

- organization switcher
- project switcher
- project navigation

Phase ownership note:

- sign-in, organization bootstrap/select, and project create/select belong to early auth/tenancy phases
- project overview, tasks, and records belong to the main frontend workflow phase
- schema, migration, and execution/admin surfaces arrive only after the underlying capabilities exist

### 8A.2 Main project views

Inside a project, frontend should provide at least:

1. task list view
2. record list view
3. task details page
4. record details page
5. project settings area

These are the primary full-page work surfaces in v1.
Most create/edit flows should stay embedded unless the workflow is heavy enough to justify its own route.

Embedded v1 surfaces:

- task create/edit modal or side panel
- record create/edit modal or side panel
- relation editor panel on record details
- file upload/manage panel on record details
- schema diff modal

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
- latest updated task-record timestamp when available
- latest active or last completed run summary when available
- linked schema version
- linked pipeline version if present

The task list is user-sorted in v1.
Agents process tasks in that explicit project order.
Each task must have a required title and description.

Useful filters:

- state
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
- schema version
- file count
- artifact count
- last run timestamp when available
- last error summary when available

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
- active run summary
- latest failure summary when relevant
- schema version linked to the task
- pipeline version linked to the task if present
- recent activity log entries related to the task

Task descriptions should have revision history in v1.

Per-record status list should show at least:

- waiting to be picked up
- in progress
- completed
- failed
- skipped

This page should also show aggregate progress counters.

V1 editing rule:

- task editing should be embedded from this page or the task list, not a separate dedicated route by default

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
- recent agent runs
- latest failure details when relevant
- recent activity log entries related to the record
- lineage pointers for important artifacts when available

Users can fully edit record values in the UI as long as the values match the active schema.

V1 editing rule:

- record editing should be embedded on this page or launched from the record list, not split into a dedicated edit route by default

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

### 8A.8A Execution and admin surfaces

These should be explicit only after the backend runtime exists.

Later-phase screens should include:

- activity log / audit trail screen
- execution monitor screen for active runs, retries, and queue-backed processing visibility
- development/debug controls for manual trigger and autopick toggle

These should not be introduced before queueing, scheduling, and observability are implemented.

### 8A.9 Concrete frontend route map

Use Next.js protected routes with organization and project slug scope:

- `/app/[organizationSlug]/[projectSlug]` — project overview dashboard
- `/app/[organizationSlug]/[projectSlug]/tasks` — task list
- `/app/[organizationSlug]/[projectSlug]/tasks/[taskId]` — task details, revisions, and per-record progress
- `/app/[organizationSlug]/[projectSlug]/records` — record list
- `/app/[organizationSlug]/[projectSlug]/records/[recordId]` — record details, context editor, files, artifacts, and relations
- `/app/[organizationSlug]/[projectSlug]/settings/schema` — schema version browser/editor
- `/app/[organizationSlug]/[projectSlug]/settings/pipelines` — pipeline definitions and parser bundle visibility
- `/app/[organizationSlug]/[projectSlug]/settings/members` — organization members visible in project scope
- `/app/[organizationSlug]/[projectSlug]/activity` — project activity log and audit trail
- `/app/[organizationSlug]/[projectSlug]/execution` — execution monitor, active runs, and debug controls

Early auth/onboarding routes should also exist for:

- landing / sign-in
- organization bootstrap or selection
- project creation or selection

### 8A.10 Concrete frontend implementation rules

- use server components for route shells and access checks
- use client components for sortable task lists, record editor forms, and live progress tables
- use tRPC + React Query for all frontend data access
- use `refetchInterval: 3000` only on active execution screens
- use `react-hook-form` + Zod-derived schema validation for task, record, and schema forms
- render backend machine states directly; do not derive local fake statuses in the UI
- use shadcn/ui primitives as the base layer and wrap repeated product patterns into semantic reusable components
- if task, record, schema, activity, or execution screens repeat the same card, table, badge, toolbar, metadata row, empty state, or side-panel structure, extract it to `src/components/ui`
- keep feature components thin and domain-specific; they should compose shared UI building blocks instead of copying Tailwind/shadcn markup between features
- embedded create/edit surfaces must reuse the same primary form/body component and only swap the outer shell such as modal, drawer, or page section
- prefer one reusable status presentation system for machine states so list badges, detail headers, tables, and activity surfaces do not each redefine colors, labels, and icons separately

### 8A.10A Concrete v1 design system decision

Before feature implementation starts, define one app-level design system built on top of shadcn/ui.

V1 design system goals:

- keep product UI visually consistent across tasks, records, schema, activity, and execution screens
- prevent repeated local Tailwind/shadcn compositions in feature folders
- make every repeated business pattern map to one semantic reusable component
- keep high-density CRM screens readable without looking like generic dashboard boilerplate

V1 design style direction:

- dense but calm data-work UI
- neutral base surfaces with restrained accent color usage
- status colors reserved primarily for machine/execution state
- strong typography and spacing hierarchy over heavy borders or decorative elements
- desktop-first primary experience, with mobile-safe stacking for detail surfaces and drawers

### 8A.10B Foundation tokens and layout rules

Design tokens should be defined once through the app theme and reused everywhere.

Core rules:

- one radius scale for the full app
- one spacing scale for page, section, card, and inline layouts
- one border and muted-surface language across all screens
- one status color mapping shared by every status component
- one typography hierarchy for page titles, section headers, labels, helper text, and table text

Layout rules:

- page content should use flex column + gap layouts, not margin stacking
- overview and detail pages should be built from reusable page sections and content grids
- all dense data screens should align to shared table, filter bar, and metadata layouts
- drawers, dialogs, and inline panels should share the same internal spacing and header/footer contract

### 8A.10C shadcn primitive baseline

Use shadcn/ui as the primitive layer, not as the final product surface.

Expected base primitives for v1:

- `button`
- `input`
- `textarea`
- `select`
- `checkbox`
- `switch`
- `badge`
- `table`
- `tabs`
- `dialog`
- `drawer`
- `sheet`
- `dropdown-menu`
- `popover`
- `tooltip`
- `separator`
- `skeleton`
- `form`
- `alert-dialog`
- `scroll-area`

Rule:

- feature code should rarely compose raw primitive combinations directly more than once
- once a product pattern repeats, wrap it in a semantic component under `src/components/ui`

### 8A.10D Required semantic reusable component map

Create reusable semantic UI components before broad screen implementation.

Recommended `src/components/ui/` structure:

```txt
src/components/ui/
  app-shell/
    app-shell.tsx
    app-shell-sidebar.tsx
    app-shell-header.tsx
    app-shell-project-switcher.tsx
    app-shell-organization-switcher.tsx
  page-header/
    page-header.tsx
    page-header-actions.tsx
    page-header-meta.tsx
  section-card/
    section-card.tsx
    section-card-header.tsx
    section-card-content.tsx
    section-card-footer.tsx
  filter-bar/
    filter-bar.tsx
    filter-bar-search.tsx
    filter-bar-facets.tsx
    filter-bar-actions.tsx
  data-table/
    data-table.tsx
    data-table-toolbar.tsx
    data-table-empty-state.tsx
  empty-state/
    empty-state.tsx
  status-badge/
    status-badge.tsx
    task-status-badge.tsx
    record-status-badge.tsx
    run-status-badge.tsx
  progress-metric/
    progress-metric.tsx
    progress-metric-grid.tsx
  metadata-list/
    metadata-list.tsx
    metadata-list-item.tsx
  activity-timeline/
    activity-timeline.tsx
    activity-timeline-item.tsx
  relation-list/
    relation-list.tsx
    relation-list-item.tsx
  artifact-list/
    artifact-list.tsx
    artifact-list-item.tsx
  file-list/
    file-list.tsx
    file-list-item.tsx
  schema-field-list/
    schema-field-list.tsx
    schema-field-row.tsx
  side-panel/
    side-panel.tsx
    side-panel-header.tsx
    side-panel-footer.tsx
  confirm-action-dialog/
    confirm-action-dialog.tsx
  markdown-viewer/
    markdown-viewer.tsx
  json-viewer/
    json-viewer.tsx
  loading-state/
    loading-state.tsx
  state-icon/
    state-icon.tsx
```

Meaning of the map:

- `app-shell` owns the protected product frame and navigation chrome
- `page-header` standardizes title, secondary metadata, and top-level actions
- `section-card` is the default container for dashboard/detail sections
- `filter-bar` standardizes search, filters, sort, and create actions above list screens
- `data-table` is the shared CRM table shell for tasks, records, members, activity, and execution rows
- `status-badge` owns the visual language for machine states
- `progress-metric` standardizes KPI/count cards and progress summaries
- `metadata-list` standardizes label/value detail blocks
- `activity-timeline`, `relation-list`, `artifact-list`, `file-list`, and `schema-field-list` cover repeated business list patterns
- `side-panel` is the shared shell for lightweight embedded editing and management flows
- `markdown-viewer` and `json-viewer` centralize rich read-only content rendering

### 8A.10E Required feature form architecture

Every major editable entity should have one primary form component reused in all shells.

Required form components:

- `src/features/tasks/components/task-form.tsx`
- `src/features/records/components/record-form.tsx`
- `src/features/project-schema/components/schema-field-form.tsx`
- `src/features/project-schema/components/schema-version-form.tsx`
- `src/features/record-edges/components/relation-form.tsx`
- `src/features/files/components/file-upload-form.tsx`

Rules:

- modal, drawer, and page implementations must reuse these primary form components
- create and edit mode differences should be handled through explicit props or initial values, not duplicated markup
- field layouts, labels, help text, validation messages, and submit rows should be standardized through shared form subcomponents where repetition appears

### 8A.10F Required screen composition contract

Primary screens should be composed from the same reusable building blocks.

Expected composition patterns:

1. project overview
   - `PageHeader`
   - `ProgressMetricGrid`
   - `SectionCard`
   - `ActivityTimeline`

2. task list / record list / activity / execution
   - `PageHeader`
   - `FilterBar`
   - `DataTable`
   - `DataTableEmptyState`

3. task details / record details
   - `PageHeader`
   - `ProgressMetricGrid` when relevant
   - `SectionCard`
   - `MetadataList`
   - specialized list components such as `ActivityTimeline`, `ArtifactList`, `RelationList`, or progress table sections

4. settings screens
   - `PageHeader`
   - reusable settings navigation pattern
   - `SectionCard`
   - specialized editor/list component for the settings domain

### 8A.10G Status and state presentation system

Machine state presentation must be centralized.

Rules:

- one shared mapping from backend machine states to label, tone, icon, and emphasis
- do not let each feature pick its own badge colors or copy labels freely
- task, record, task-record, agent-run, pipeline-run, and artifact states may each have different vocabularies, but the presentation contract should stay structurally consistent

Minimum output for every status presentation component:

- label
- tone
- icon
- optional helper text for dense/detail contexts

### 8A.10H Page density and responsiveness rules

V1 should optimize for dense operational work without making screens visually noisy.

Rules:

- tables are the default for large collections
- cards are for grouped summaries, not for replacing large lists of rows
- detail pages should use stacked sections on narrow screens and multi-column layouts only when readability remains high
- avoid nested cards inside cards unless the inner element is a clearly separate semantic block
- use drawers or sheets for secondary edit flows; reserve full routes for primary work surfaces and complex editors

### 8A.10I Design system implementation gate

Do not start broad feature UI implementation until the following are defined:

- app theme tokens
- status presentation mapping
- app shell
- page header
- section card
- filter bar
- data table shell
- side panel shell
- primary form patterns
- empty/loading/error state patterns

This design system work should happen before or at the very start of the frontend shell phase so feature work composes stable building blocks instead of inventing new ones per screen.

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

### 10.2B Concrete path contract

Use app-configured absolute directories outside the repo working tree:

- `CRM_STORAGE_ROOT` — canonical source files and artifacts
- `CRM_WORKSPACE_ROOT` — long-lived record workspaces

Recommended layout:

```txt
${CRM_STORAGE_ROOT}/
  organizations/<organizationId>/
    projects/<projectId>/
      source-files/<fileId>/<originalFileName>
      artifacts/<artifactId>/<stage>.<ext>

${CRM_WORKSPACE_ROOT}/
  projects/<projectId>/records/<recordId>/
```

Rules:

- DB stores relative app-owned storage paths, not arbitrary user paths
- canonical file paths must never point into the workspace tree
- workspace hydration always copies or materializes from canonical storage
- future S3 migration should only replace storage service implementation, not lineage semantics

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
- `state`

Suggested indexes:

- `(from_record_id, relation_type, state)`
- `(to_record_id, relation_type, state)`
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

1. create new `ProjectSchemaVersion`
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

### 11.4 Concrete schema field blueprint

Supported custom field kinds in v1:

- `text`
- `long_text`
- `number`
- `boolean`
- `date`
- `datetime`
- `url`
- `email`
- `enum`
- `json`

Every field definition should include:

- `key`
- `label`
- `type`
- `required`
- `description`
- `defaultValue` when valid for the field kind
- `config` for type-specific metadata

V1 field rules:

- allow enum options
- allow min/max style validators inside `config`
- do **not** support computed fields in v1
- do **not** support relation fields as implicit copied foreign keys; relations stay in `RecordEdge`
- generate runtime Zod validation from the active project schema version

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

This is the main agent tool surface exposed through the MCP route group inside the single app-owned Hono application.

Scope rule for all `crm_*` tools:

- every call must be scoped by `projectId`
- and then by either `recordId` or `taskId`, depending on the operation
- tools must never operate on global unscoped data
- backend must validate that the scoped project/task/record relation is valid before doing work
- backend must authenticate caller identity before any tool execution and authorize project access for that caller

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

In addition to tools, the MCP route group inside the Hono app should expose resources for file and artifact contents.

Recommended pattern:

- tools return metadata, ids, and hydration actions
- MCP `resources/read` returns actual text/blob content
- backend hydrator or agent writes fetched content into the record workspace

This is the preferred way to expose large or binary file payloads.

### 13.3 Workspace support tools

19. `crm_write_workspace_manifest`
   - maintain local state summary for the scoped record workspace

### 13.4 Concrete MCP contract conventions

For v1, all MCP tools should use a consistent request/response shape.

Common input rules:

- every tool input includes `projectId`
- record-scoped tools include `recordId`
- task-scoped tools include `taskId`
- mutating execution tools include `taskRecordId` and `agentRunId` when available
- all mutation inputs include an idempotency token when duplication is possible

Common response rules:

- return structured JSON only
- include a top-level `ok: boolean`
- include either `data` or `error`
- mutation responses should include machine state snapshot after mutation

Validation rules:

- all MCP tool inputs are validated with Zod in the Hono app
- Hono handlers call feature services, not raw SQL
- authorization and project/record/task relationship checks happen before business execution

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

### 17.4 Concrete scheduler and executor blueprint

Scheduler loop for v1:

1. select active projects with pending `taskRecord` rows
2. for each project, walk tasks in `sortOrder`
3. for each task, select eligible `taskRecord` rows in `waiting` or retryable `failed`
4. skip any record that already has an active `taskRecord` or active `agentRun`
5. atomically transition one `taskRecord` to `picked_up`
6. create a new `agentRun` attempt row
7. hand off to executor worker

Executor steps for one `taskRecord`:

1. transition `agentRun` to `booting`
2. read project, active schema, task, record, relation summary, files, and reusable artifacts
3. ensure workspace exists and hydrate missing canonical inputs
4. ensure required pipeline asset bundle is materialized in workspace
5. open OpenCode session with selected model and `record-worker` agent
6. stream tool events and persist telemetry snapshots
7. validate structured outputs before any record mutation
8. apply artifact registrations and record patch under optimistic concurrency rules
9. transition `taskRecord` and `agentRun` to terminal state
10. append activity log events for completion or failure

Development rule:

- scheduler must be disableable by config and by project-level debug UI switch
- manual trigger endpoint should enqueue or directly execute a specific `taskRecord`

### 17.5 Concrete queue and schedule blueprint

Use `pg-bosser` as the default background job runtime for v1.

Recommended execution jobs:

- `task-record-execution` — runs one claimed `taskRecord`
- `task-record-retry-scan` — scheduled job that finds retryable failed work
- `task-record-scheduler-tick` — scheduled job that claims eligible work and enqueues execution jobs
- `workspace-maintenance` — optional scheduled job for manifest repair or stale scratch cleanup

Recommended ownership rules:

- queue definitions live in `src/features/execution/queues`
- queue payload schemas live next to their queue files
- queue workers call feature services and machine transitions, not raw DB logic spread across worker files
- scheduled jobs should stay thin and delegate real work to services

Recommended v1 deployment model:

- web runtime: Next.js + mounted Hono app
- worker runtime: dedicated execution entrypoint that starts pg-bosser workers and schedules
- both runtimes share the same Postgres database and storage configuration

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

`ProjectSchemaVersion` and `PipelineDefinition` can stay plain versioned definitions in v1 unless they later need guarded publish/promote workflows.

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
- every API and MCP mutation must resolve caller identity before business execution
- every executor-originated write must carry `taskId`, `taskRecordId`, and `agentRunId` attribution
- every scoped read/write must validate organization membership and project access

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

### 21.1 Concrete observability implementation

Use structured logging with `pino` in `src/lib/logger.ts`.

Minimum persisted telemetry fields on `agentRun`:

- `provider`
- `model`
- `startedAt`
- `finishedAt`
- `latencyMs`
- `inputTokens`
- `outputTokens`
- `estimatedCostUsd`
- `toolCallCount`
- `toolSummary`
- `resultPayload`
- `failurePayload`

Minimum activity log event families:

- `task.created`
- `task.reordered`
- `task.description_revised`
- `taskRecord.claimed`
- `taskRecord.completed`
- `taskRecord.failed`
- `agentRun.started`
- `agentRun.completed`
- `agentRun.failed`
- `record.patch_applied`
- `recordEdge.created`
- `recordEdge.deactivated`
- `schema.version_created`
- `artifact.registered`
- `artifact.invalidated`
- `auth.executor_call`
- `auth.mcp_call`

Minimum actor attribution fields on `activityLog`:

- `actorType` (`user` | `executor` | `system`)
- `actorId`
- `organizationId`
- `projectId`
- `taskId?`
- `taskRecordId?`
- `agentRunId?`

---

## 22. Recommended v1 boundaries

### Include in v1

- GitHub OAuth only with Better Auth
- Better Auth anonymous plugin enabled only in development for account-free testing
- organization + project scoped tenancy
- owner-managed organization membership for existing users
- auth implementation fully owned by `src/features/auth`
- frontend project shell with task and record views
- task details page with markdown editor/viewer and per-record progress states
- shared per-project schema
- records with JSON context
- tasks and agent runs
- task-record processing state entity
- state machines for important backend lifecycles using Machin
- OpenCode server + SDK orchestration
- per-task model routing
- Hono-mounted API app serving Better Auth, tRPC, and MCP from one backend entrypoint
- MCP tools for record/file/artifact/relation operations
- long-lived per-record workspaces
- persistent app-owned artifacts with lineage
- schema migration fan-out tasks
- landing/sign-in plus organization and project bootstrap/select screens
- project overview dashboard
- mostly embedded create/edit flows for tasks and records
- later-phase activity log and execution monitor screens

### Exclude from v1

- email invitations
- public self-serve org joining
- multi-provider auth
- production anonymous login
- many record types with independent schemas
- open-ended autonomous planning
- uncontrolled cross-record agents
- fully agent-authored persistent parser evolution
- broad MCP server sprawl

---

## 23. Recommended implementation order

### Phase 1 — auth, tenancy, and core domain

1. set up Better Auth with GitHub OAuth plus development-only anonymous plugin support
2. implement auth fully inside `src/features/auth` including auth config, auth client, auth DB schema, and org role helpers
3. define `Project`, `ProjectSchemaVersion`, `Record`, `Task`, `AgentRun`, `TaskRecord`, `RecordEdge`
4. define record envelope + JSON context storage
5. add Docker Compose Postgres for local development on port `5433` with database/user/password set to `project_intern` / `intern` / `intern`
6. add one-active-execution-per-record rule against the project task queue
7. build landing/sign-in flow plus organization bootstrap/select and project create/select screens

### Phase 2 — state machines and backend lifecycle

8. define Machin machines for `TaskRecord`, `AgentRun`, and `PipelineRun`
9. persist machine state with Drizzle/Postgres
10. make backend APIs expose machine states directly for frontend use

### Phase 3 — frontend shell and workflow UI

11. define app theme tokens, status mapping, and the initial design system contract
12. build organization/project scoped app shell, page header, section card, filter bar, data table shell, and side panel shell
13. build organization/project scoped app shell and project overview dashboard
14. build task list and record list views
15. build task details page with markdown viewer/editor
16. build per-record progress table on task details page
17. build record details page with files/artifacts/relations summary
18. keep task and record create/edit flows mostly embedded as modals, drawers, or side panels
19. extract shared semantic UI building blocks before repeating the same task/record/schema surface markup across features

### Phase 4 — OpenCode runtime

20. stand up `opencode serve`
21. integrate `@opencode-ai/sdk`
22. add task executor service
23. add task-level `model` field handling

### Phase 5 — Hono API app and MCP tools

24. mount one Hono app in the Next.js API catch-all route
25. route Better Auth, tRPC, and shared middleware through that Hono app
26. implement MCP record/schema tools
27. implement MCP task completion and artifact/file tools
28. implement MCP relation tools
29. expose embedded relation editor and file management surfaces once their backend contracts exist

### Phase 6 — queues, schedules, and file processing

30. add pg-bosser queues, workers, and schedules for executor orchestration
31. define `source_file`, `artifact`, `pipeline_definition`, `pipeline_run`
32. define canonical local disk storage layout
33. create record workspace hydrator
34. create first parser asset bundle
35. support artifact reuse rules

### Phase 7 — migrations

36. add schema versioning
37. add schema migration task family
38. add project migration controller
39. add migration auditing
40. build schema settings page, schema diff modal, and migration status surfaces

### Phase 8 — hardening

41. add plugin-based telemetry and guardrails
42. add cleanup/invalidation logic for workspaces
43. add cost reporting and retry dashboards
44. build activity log screen, execution monitor screen, and dev debug controls

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
9. backend transport: **single Hono app mounted in Next.js API, with MCP exposed to OpenCode as one route group**
10. v1 blob storage: **local disk next to the app/runtime**
11. auth provider: **GitHub OAuth only with Better Auth**
12. development auth mode: **Better Auth anonymous plugin is enabled only in development for account-free testing**
13. auth ownership: **all Better Auth server/client/roles/org helpers live in `src/features/auth`, not `src/lib/auth`**
14. tenancy model: **organizations contain projects; users always work inside a project scope**
15. local database runtime: **Docker Compose PostgreSQL 18 on port `5433` with local credentials `intern` / `intern` and DB `project_intern`**
16. background runtime: **pg-bosser queues and schedules drive execution orchestration outside the web request path**
17. lifecycle handling: **important execution entities use Machin state machines; project tasks themselves stay descriptive**
18. machine stance: **machine-first for lifecycle entities; plain types only for config and DTO payloads**
19. task fan-out: **tasks auto-create `TaskRecord` rows for current records and auto-backfill new records later**
20. task shape: **every task has required `title` and `descriptionMarkdown`**
21. internal auth stance: **use Better Auth for users and app-owned credentials for executor/MCP flows in v1; Better Auth Agent Auth is optional future infrastructure, not a v1 requirement**

---

## 25. Immediate next planning targets

This section now resolves the immediate planning targets into a concrete v1 build blueprint.

### 25.1 Finalized backend contracts

- **DB**: Drizzle + Postgres 18 with explicit feature tables and JSONB only for schema/context/metadata payloads
- **Config split**: `src/lib/config/frontend.ts`, `src/lib/config/backend.ts`, and `src/lib/config/database.ts`
- **DB config rule**: `src/lib/config/database.ts` is imported only by `src/lib/db.ts`
- **IDs**: uuidv7 primary keys across domain tables
- **Validation**: Zod for router inputs, MCP inputs, schema definitions, and structured outputs
- **API**: one Hono app inside Next.js API serving Better Auth, tRPC, MCP, and future backend endpoints
- **Auth ownership**: all Better Auth server/client/roles/org helpers live in `src/features/auth`
- **Dev auth**: Better Auth anonymous plugin is enabled only in development
- **Local DB runtime**: Docker Compose PostgreSQL 18 on port `5433` using local database `project_intern` and credentials `intern` / `intern`
- **Background jobs**: pg-bosser queues and schedules handle async execution outside the request path
- **Lifecycle**: Machin for `TaskRecord`, `AgentRun`, `PipelineRun`, `Artifact`, and `RecordEdge`
- **Task fan-out**: task creation fans out to current project records and record creation backfills missing `TaskRecord` rows for existing tasks
- **Task shape**: every task has required `title` and `descriptionMarkdown`
- **Internal auth**: Better Auth sessions protect user surfaces and app-owned credentials protect executor/MCP flows in v1

### 25.2 Finalized executor contract

- scheduler operates on `taskRecord`, never directly on `task`
- one active execution per record at a time
- each retry creates a new `agentRun`
- record patching uses optimistic locking via `record.version`
- artifact writes are deduplicated by lineage tuple

### 25.3 Finalized file and workspace contract

- canonical source files and artifacts live in `CRM_STORAGE_ROOT`
- long-lived record workspaces live in `CRM_WORKSPACE_ROOT`
- workspace files are reusable but non-canonical
- artifact and file reads should prefer MCP resources for payload transfer
- no automatic canonical retention cleanup in v1

### 25.4 Finalized task and model contract

- `task.model` is an optional string in `provider/model-id` format
- backend validates task model against an allowlist of approved runtime models
- absence of `task.model` falls back to environment default model
- task execution permissions are enforced in tools and services, not only in prompts

### 25.5 Finalized frontend contract

- route scope is always `organization -> project`
- task and record views are the primary work surfaces
- task detail is the main execution visibility page
- polling via tRPC + React Query every 3 seconds is the v1 realtime strategy
- all visible statuses come from persisted backend machine state
- screens are introduced incrementally by implementation phase, not all at once
- create/edit flows are mostly embedded in v1 unless they are heavy editors
- frontend should show as much useful scoped data as practical on lists, details, execution, and audit surfaces

### 25.6 Finalized implementation sequence

1. auth + organizations + projects
2. schema versions + records
3. tasks + taskRecord + agentRun + frontend task/record views
4. relations
5. MCP server + OpenCode executor
6. pg-bosser queues/schedules + files + artifacts + pipeline definitions
7. scheduler + retries + observability
8. schema migration UX and controllers

---

## 26. Open questions to resolve next in this file

Most important v1 questions are now resolved. The remaining deferred questions should be treated as post-v1 or implementation-detail follow-ups:

- whether small JSON artifacts should also be mirrored in Postgres for selective query acceleration
- whether `Record` itself needs a full machine or only explicit persisted `state` in v1
- whether project-level execution controls need SSE before broader rollout
- whether parser asset promotion should later gain dedicated review workflow and approval state
- when to introduce `projectMembership` and finer-grained project roles beyond org-wide membership
