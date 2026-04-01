# 05. Hono MCP and OpenCode Executor

## Objective
Stand up the app-owned Hono backend entrypoint, remote MCP route group, OpenCode server/SDK integration, and the executor service contract for one record-task run.

## Problem this phase solves
- The product needs a controlled agent execution layer that is app-owned, auditable, and project-scoped.
- Tool logic must live next to app services and DB access, not as scattered local tool files.
- Later queue workers need a stable executor contract before async orchestration is added.

## Scope
### In scope
- Single mounted Hono app as the only backend entrypoint
- Hono route groups for `/auth/*`, `/trpc/*`, `/mcp`
- OpenCode server + JS/TS SDK integration
- Executor service contract around one `TaskRecord` / `AgentRun`
- MCP tools for records, schema, task completion, files, artifacts, relations, and workspace manifest
- MCP resources pattern for file/artifact payload reads
- Executor auth and MCP bearer auth split

### Out of scope
- pg-bosser queues and scheduled workers
- Full file/artifact storage implementation details
- Schema migration controllers

## Source sections from CRM plan
- Section 4.2: application architecture blueprint
- Section 6: agent model
- Section 7.1 to 7.3: OpenCode role, integration mode, MCP transport, auth split
- Section 8: task-level model routing
- Section 13: MCP tools and resource conventions
- Section 17.1 and 17.4: executor steps
- Section 20: permissions and guardrails
- Section 25.2 to 25.4 and 25.6 step 5

## Dependencies / prerequisites
- Tasks, task-records, agent-runs, relations, and record/schema services already exist
- Single mounted Hono app from phase 01 can be extended

## Required stack and libraries
- **Hono** — app-owned backend entrypoint and route composition
- **OpenCode server + SDK** — session creation, model selection, execution runtime
- **TypeScript** — tool contracts and executor services
- **Zod** — MCP input validation and structured output validation
- **tRPC** — stays routed through the same Hono app
- **Better Auth** — user auth surfaces already mounted through Hono

## Domain objects and data model
### Entities
- `AgentRun` remains central in this phase
- MCP request/response DTOs
- structured output DTOs

### Required fields
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

type TaskFailure = {
  code: string
  retryable: boolean
  message: string
  missingInputs?: string[]
}
```

### Tables / storage
- Reuse `agentRun` for execution attempts, telemetry, outputs, failures, and session linkage.

## Backend architecture for this phase
### Feature folders
```txt
src/features/
  execution/
    lib/
      scheduler-service.ts
      executor-service.ts
  agent-runs/
src/lib/
  opencode/
  mcp/
```

### Services to implement
- `executor-service` — main orchestration around OpenCode session lifecycle
- `agent-run-service` — telemetry persistence and run finalization
- reuse: `record-service`, `project-schema-service`, `task-service`, `task-record-service`, `relation-service`, `file-service`, `artifact-service`, `workspace-service`

### Validation and auth rules
- User auth protects product UI and normal app API access.
- Executor auth uses app-owned service credentials.
- MCP routes require bearer auth.
- MCP handlers must validate project/task/record scope on every call.
- All MCP inputs are validated with Zod.
- Mutation inputs include idempotency tokens when duplication is possible.

### API / router surface
- Hono route groups:
  - `/auth/*`
  - `/trpc/*`
  - `/mcp`

Recommended Hono shape from the plan:
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

MCP tools to expose:
- `crm_read_record`
- `crm_read_project_schema`
- `crm_propose_patch`
- `crm_apply_patch`
- `crm_complete_task_record`
- `crm_fail_task_record`
- `crm_list_relations`
- `crm_get_related_record`
- `crm_get_related_records`
- `crm_create_relation_edge`
- `crm_deactivate_relation_edge`
- `crm_list_record_files`
- `crm_fetch_file`
- `crm_list_artifacts`
- `crm_get_artifact`
- `crm_put_artifact`
- `crm_get_pipeline_definition`
- `crm_register_pipeline_run`
- `crm_write_workspace_manifest`

## Frontend architecture for this phase
### Routes
- No new primary user screens required in this phase.
- Existing task/record pages will later surface executor-backed data.

### Screens / surfaces
- Keep UI changes minimal; execution/admin screens belong later.

### Shared UI components
- None beyond existing status and metadata presentation.

### Forms
- None specific to this phase.

## Execution flow
### Main flow
1. Backend selects a `TaskRecord` to execute.
2. Executor resolves project, task, record, active schema, relations, files, and artifacts.
3. Executor ensures the record workspace exists.
4. Executor opens an OpenCode session with selected model and `record-worker` agent.
5. OpenCode uses scoped MCP tools and resources.
6. Structured outputs are validated before mutation.
7. Backend persists results, telemetry, and state transitions.

### Edge cases / failure paths
- Executor must not mutate other records directly.
- Prompt instructions are not sufficient; tool/API-level enforcement is required.
- `task.model` must be validated against approved runtime models.

## State and lifecycle rules
- `one AgentRun = one record + one project-task + one selected model + one OpenCode session`
- retries create new `AgentRun` rows but preserve task linkage
- structured output DTOs remain plain payloads, not machines

## File, artifact, or workspace behavior
- Tools return metadata and hydration actions.
- MCP `resources/read` returns file/artifact payload bytes.
- Backend hydrator or agent writes those bytes into the record workspace.

## Security and guardrails
- deny broad unsafe bash where possible
- allow only necessary filesystem usage
- limit tool surface to app-specific tools + minimal local tools
- a task run can only mutate its current record
- every executor-originated write must carry `taskId`, `taskRecordId`, and `agentRunId`

## Observability and audit
- Activity families to support:
  - `auth.executor_call`
  - `auth.mcp_call`
  - `agentRun.started`
  - `agentRun.completed`
  - `agentRun.failed`

## Implementation sequence inside this phase
1. Extend the mounted Hono app to serve `/mcp`.
2. Integrate `opencode serve` and `@opencode-ai/sdk`.
3. Implement executor-service session lifecycle.
4. Implement MCP tool handlers and resource patterns.
5. Validate `task.model` selection and scoped mutations.

## Acceptance criteria
- [ ] One Hono app serves Better Auth, tRPC, and MCP.
- [ ] OpenCode sessions run through app-owned executor-service.
- [ ] All MCP calls are bearer-authenticated and project-scoped.
- [ ] Structured outputs are validated before mutation.
- [ ] Executor can complete or fail a scoped `TaskRecord` through app-owned services.

## Handoff to next phase
- Expose stable executor-service and MCP contracts for queue workers.
- Preserve one-run-per-record semantics and task-level model routing.

## Do not implement yet
- Scheduled claiming and async worker bootstrapping
- Canonical file/artifact persistence internals beyond needed contracts
- Activity/execution monitor screens
