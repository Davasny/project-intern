# 07. Scheduler, Retries, and Observability

## Objective
Add deterministic scheduling, retry handling, one-active-execution-per-record enforcement, and persisted telemetry/audit data for runtime visibility.

## Problem this phase solves
- Queue infrastructure alone does not decide what work is eligible next.
- Agent runs need explicit retry and locking behavior to avoid duplicate mutation and workspace races.
- The system needs trustworthy telemetry and audit trails before broader rollout.

## Scope
### In scope
- scheduler loop over ordered project tasks
- claim logic on `taskRecord`
- retry scan behavior
- active execution guard per record
- persisted telemetry on `agentRun`
- structured logging and activity log events

### Out of scope
- schema migration UX and controllers
- broader SSE/live transport changes

## Source sections from CRM plan
- Section 17.1, 17.4, 17.5: execution, scheduler, queue job blueprint
- Section 19: concurrency, locking, idempotency, retry model
- Section 19A: state-machine implications
- Section 21 and 21.1: observability and activity log design
- Section 23 Phase 8 hardening items related to guardrails and reporting
- Section 25.2 and 25.6 step 7

## Dependencies / prerequisites
- Tasks, task-records, agent-runs, executor-service, queues, files/artifacts, and workspaces from prior phases

## Required stack and libraries
- **pg-bosser** — scheduled jobs and execution handoff
- **Machin** — lifecycle transitions for runtime entities
- **pino** — structured logging in `src/lib/logger.ts`
- **Drizzle + PostgreSQL 18** — persisted telemetry and activity log storage
- **TypeScript** — scheduler and telemetry contracts

## Domain objects and data model
### Entities
- `TaskRecord`
- `AgentRun`
- `ActivityLog`

### Required fields
Persisted telemetry fields on `agentRun`:
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

### Tables / storage
- `activityLog` — append-only audit events for user actions and machine-visible transitions

Minimum actor attribution fields:
- `actorType` (`user` | `executor` | `system`)
- `actorId`
- `organizationId`
- `projectId`
- `taskId?`
- `taskRecordId?`
- `agentRunId?`

## Backend architecture for this phase
### Feature folders
```txt
src/features/
  execution/
  observability/
```

### Services to implement
- `scheduler-service` — selects next eligible `taskRecord` in project task order
- `observability-service` — query cost, latency, retries, artifact reuse metrics

### Validation and auth rules
- Scheduler operates on `taskRecord`, never directly on `task`.
- One active execution per record at a time.
- Retries create new `AgentRun`s but preserve task linkage.
- Record patching uses optimistic `record.version`.
- Artifact writes are deduplicated by lineage tuple.

### API / router surface
- internal scheduler/retry orchestration only in this phase
- prepare later read models for execution and activity screens

## Frontend architecture for this phase
### Routes
- No major new user routes required here; data supports later execution/activity screens.

### Screens / surfaces
- Existing task and record screens may now show richer latest run / failure / retry info.

### Shared UI components
- reuse status and metadata components for execution summaries

### Forms
- none

## Execution flow
### Main flow
1. Scheduler selects active projects with pending `taskRecord` rows.
2. For each project, it walks tasks in `sortOrder`.
3. It selects eligible `taskRecord` rows in `waiting` or retryable `failed` state.
4. It skips records with active `taskRecord` or active `agentRun`.
5. It atomically transitions one `taskRecord` to `picked_up`.
6. It creates a new `agentRun` attempt row.
7. It enqueues execution work.

### Edge cases / failure paths
- Safe retries may reuse workspace files, prior artifacts, and prior downloaded source files.
- Retries must not duplicate schema patch application, artifact registration, or task completion.

## State and lifecycle rules
- Task-record and agent-run machines remain the source of truth for progress.
- Avoid ad hoc flags like `isProcessing`, `isDone`, `isFailed` when proper machine states exist.

## Security and guardrails
- Every scoped read/write still validates organization membership and project access.
- Every executor-originated write carries execution attribution.
- Approved runtime model allowlist remains enforced.

## Observability and audit
Structured logging:
- `pino` in `src/lib/logger.ts`

Minimum activity event families:
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

Useful derived metrics:
- cost per task
- cost per migrated record
- artifact reuse rate
- parse avoidance rate
- average task retries
- pipeline version regression rate

## Implementation sequence inside this phase
1. Implement scheduler-service claim logic in project task order.
2. Add retry scan behavior and safe retry semantics.
3. Persist agent-run telemetry and failure/result payloads.
4. Add append-only activity log with actor attribution.
5. Add structured logging and metric derivation.

## Acceptance criteria
- [ ] Scheduler claims eligible work from `taskRecord` in task order.
- [ ] One active execution per record is enforced.
- [ ] Retries create new `AgentRun` rows without duplicating side effects.
- [ ] Telemetry is persisted on `agentRun`.
- [ ] Activity log captures machine-visible transitions with actor attribution.

## Handoff to next phase
- Expose migration-safe execution runtime with retries, metrics, and audit trails.
- Preserve activity log and agent-run telemetry for future admin screens.

## Do not implement yet
- Schema migration UX and controller flows
- Broader realtime transport changes beyond existing polling
