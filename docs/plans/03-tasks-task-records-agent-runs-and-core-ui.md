# 03. Tasks, Task Records, Agent Runs, and Core UI

## Objective
Add the project task queue, per-record task fan-out, execution-facing status entities, and the first full product UI surfaces for tasks and records.

## Problem this phase solves
- The product needs a user-managed work contract that agents can later execute deterministically.
- Per-task progress cannot live on `Task`; it must be modeled per record.
- The UI needs a consistent, machine-state-first surface for task and record operations.

## Scope
### In scope
- `Task`, `TaskRecord`, `AgentRun` data model
- Task fan-out rules for current and future records
- One-active-execution-per-record rule
- Task ordering and revision history
- Task list, task details, record list, record details core surfaces
- App-level design-system foundation required before broad feature UI

### Out of scope
- OpenCode execution runtime itself
- MCP tool implementation
- Files, artifacts, pipelines, queues
- Schema migrations beyond linking schema versions to tasks

## Source sections from CRM plan
- Section 4.1: `Task`, `AgentRun`
- Section 4.2 and 4.3: lifecycle and repository blueprint
- Section 5.6: `task`, `taskDescriptionRevision`, `taskRecord`, `agentRun`
- Section 5.7 and 5.8A: task constraints and fan-out semantics
- Section 8.1 to 8.3: task-level model routing
- Section 8A.2 to 8A.10I: route map, task/record screens, polling, design system, reusable components, form architecture
- Section 12: task model simplification
- Section 19, 19A: concurrency and state machines
- Section 23 Phases 2 and 3, and Section 25.6 step 3

## Dependencies / prerequisites
- Project scope and auth from phase 01
- Record and schema foundation from phase 02

## Required stack and libraries
- **TypeScript** — task, task-record, and agent-run contracts
- **Drizzle + PostgreSQL 18** — canonical task and execution state tables
- **Machin** — lifecycle control for `TaskRecord` and `AgentRun`
- **Zod** — task and task-revision validation
- **Next.js App Router** — task/record routes
- **tRPC + TanStack React Query** — list/detail reads and polling
- **shadcn/ui + Tailwind CSS** — product UI surfaces
- **react-hook-form** — task and record forms

## Domain objects and data model
### Entities
- `Task`
- `TaskDescriptionRevision`
- `TaskRecord`
- `AgentRun`

### Required fields
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

Derived task summary values for reads:
- `not_started`
- `in_progress`
- `partially_completed`
- `completed`
- `failed`
- `cancelled`

Suggested `TaskRecord` lifecycle:
- `waiting`
- `picked_up`
- `in_progress`
- `completed`
- `failed`
- `skipped`

Suggested `AgentRun` lifecycle:
- `created`
- `booting`
- `running`
- `persisting_outputs`
- `completed`
- `failed`
- `aborted`

### Tables / storage
- `task` — title, ordering, markdown description, optional model, optional pipeline version, idempotency key
- `taskDescriptionRevision` — append-only description history
- `taskRecord` — one per `(taskId, recordId)` pair; unique `(taskId, recordId)`
- `agentRun` — one execution attempt for one `taskRecord`; unique `(taskRecordId, attemptNumber)`

Constraint rules:
- `task (projectId, sortOrder)` unique
- task creation fans out to all current project records
- record creation backfills missing `TaskRecord` rows for existing tasks
- dedupe fan-out via unique `(taskId, recordId)`
- one active execution per record at a time

## Backend architecture for this phase
### Feature folders
```txt
src/features/
  tasks/
  task-records/
  agent-runs/
```

### Services to implement
- `task-service` — task CRUD, ordering, revision history, task fan-out into `taskRecord`
- `task-record-service` — claim, retry, cancel, skip, and transition helpers
- `agent-run-service` — create run, persist telemetry snapshots, finalize run

### Validation and auth rules
- Every task has required `title` and `descriptionMarkdown`.
- Task meaning comes from title, markdown description, linked schema version, linked files, and per-record execution state.
- `Task` itself is descriptive; per-record progress lives on `TaskRecord` and `AgentRun`.
- `task.model` is an optional plain string override in `provider/model-id` format.

### API / router surface
- task list/detail/create/update/reorder procedures
- task revision history procedures
- per-task per-record progress procedures
- record list/detail procedures updated to include linked tasks and latest run summary

## Frontend architecture for this phase
### Routes
- `/app/[organizationSlug]/[projectSlug]`
- `/app/[organizationSlug]/[projectSlug]/tasks`
- `/app/[organizationSlug]/[projectSlug]/tasks/[taskId]`
- `/app/[organizationSlug]/[projectSlug]/records`
- `/app/[organizationSlug]/[projectSlug]/records/[recordId]`

### Screens / surfaces
- project overview dashboard
- task list view
- task details page with markdown viewer/editor and revision history
- record list view
- record details page with linked tasks and active run summary
- embedded task create/edit modal or side panel
- embedded record create/edit modal or side panel

### Shared UI components
Required design system foundation before broad feature UI:
- app theme tokens
- status presentation mapping
- `app-shell`
- `page-header`
- `section-card`
- `filter-bar`
- `data-table`
- `side-panel`
- primary form patterns
- empty/loading/error state patterns

Important semantic reusable components from the plan:
- `status-badge/*`
- `progress-metric/*`
- `metadata-list/*`
- `activity-timeline/*`
- `markdown-viewer/markdown-viewer.tsx`

### Forms
- `src/features/tasks/components/task-form.tsx`
- `src/features/records/components/record-form.tsx`

Rules:
- the same primary form component must be reused across modal, drawer, and page shells
- render backend machine states directly; do not invent local fake statuses in UI
- use polling via React Query every 3 seconds only on active execution screens

## Execution flow
### Main flow
1. User creates a project-scoped task with required title and description.
2. System creates `TaskRecord` rows for all existing project records.
3. New records later backfill missing `TaskRecord` rows for existing tasks.
4. UI reads aggregate progress from `TaskRecord`, never ad hoc counters.
5. Task and record surfaces render persisted machine states directly.

### Edge cases / failure paths
- Reordering tasks must preserve unique `(projectId, sortOrder)`.
- Fan-out and backfill must be idempotent.
- No more than one active execution may exist per record at a time.

## State and lifecycle rules
- `TaskRecord` and `AgentRun` are machine-driven in v1.
- `Task` is not an execution state machine.
- Frontend badges and progress tables render persisted machine state directly.

## Security and guardrails
- All task and task-record operations are project-scoped.
- Later executor-originated writes must be attributable to `taskId`, `taskRecordId`, and `agentRunId`.
- Do not derive hidden task state in the browser.

## Observability and audit
- Prepare activity event families:
  - `task.created`
  - `task.reordered`
  - `task.description_revised`
  - `taskRecord.claimed`
  - `taskRecord.completed`
  - `taskRecord.failed`
  - `agentRun.started`
  - `agentRun.completed`
  - `agentRun.failed`

## Implementation sequence inside this phase
1. Add `task`, `taskDescriptionRevision`, `taskRecord`, and `agentRun` tables.
2. Implement task creation, ordering, and description revision history.
3. Implement task fan-out and record backfill logic.
4. Add Machin machines for `TaskRecord` and `AgentRun`.
5. Build design-system foundation components.
6. Build project overview, task list, task details, record list, and record details screens.

## Acceptance criteria
- [ ] Tasks are project-scoped, ordered, and have required title + description.
- [ ] Creating a task fans out `TaskRecord` rows to all current records.
- [ ] Creating a record backfills missing `TaskRecord` rows for existing tasks.
- [ ] Task progress is derived from `TaskRecord` rows.
- [ ] Task and record screens render persisted backend machine states.
- [ ] Core reusable UI building blocks exist before broad UI duplication begins.

## Handoff to next phase
- Expose stable task queue, `TaskRecord`, and `AgentRun` contracts.
- Expose task/record pages that later phases can enrich with relations, files, artifacts, and execution status.
- Preserve task-level `model` and `pipelineVersion` fields for executor phases.

## Do not implement yet
- Real OpenCode session orchestration
- MCP tools and resources
- File hydration, artifact reuse, pipeline execution
- Schema migration controller and admin monitors
