# 08. Schema Migrations and Admin Surfaces

## Objective
Add task-driven schema migration flows, project migration control, schema status UI, and the later-phase activity/execution/admin surfaces built on the hardened runtime.

## Problem this phase solves
- Schema evolution is a core product requirement and must be handled through explicit tasks.
- Users need a way to inspect migration status, affected records, and current schema history.
- Hardened runtime data should finally become visible in dedicated activity and execution surfaces.

## Scope
### In scope
- schema version bump workflow tied to a normal project task
- migration task creation and fan-out
- migration status tracking per record and project
- schema settings page enhancements, schema diff modal, migration status surfaces
- project activity log screen
- execution monitor screen
- development/debug controls for manual trigger and autopick toggle

### Out of scope
- post-v1 project-specific roles
- dedicated parser asset promotion review workflow
- SSE requirement changes

## Source sections from CRM plan
- Section 8A.6A: schema management UI
- Section 8A.8A: execution/admin surfaces
- Section 11: schema migration design
- Section 17.2: schema migration task flow
- Section 21: audit data for UI
- Section 23 Phase 7 and Phase 8, and Section 25.6 step 8

## Dependencies / prerequisites
- Schema versions, records, tasks, task-records, executor, files/artifacts, scheduler, retries, and observability from prior phases

## Required stack and libraries
- **TypeScript** — migration contracts and UI read models
- **Drizzle + PostgreSQL 18** — migration status persisted through existing entities
- **Zod** — schema/migration task validation
- **tRPC + TanStack React Query** — schema, activity, and execution screen reads with polling
- **Next.js App Router** — settings/activity/execution routes
- **shadcn/ui + Tailwind CSS** — settings and admin surfaces
- **react-hook-form** — schema version editing forms

## Domain objects and data model
### Entities
- `ProjectSchemaVersion`
- `Task`
- `TaskRecord`
- `ActivityLog`

### Required fields
No new top-level entity shape is required beyond existing `ProjectSchemaVersion`, `Task`, and `TaskRecord` contracts.

Migration-specific meaning rules:
- schema migration is represented as a normal project task
- migration-specific meaning lives in task description and linked schema versions
- no special task-type field is introduced

### Tables / storage
- reuse existing tables:
  - `projectSchemaVersion`
  - `task`
  - `taskRecord`
  - `activityLog`

## Backend architecture for this phase
### Feature folders
```txt
src/features/
  project-schema/
  execution/
  observability/
```

### Services to implement
- `project-schema-service` — now includes schema diffing and migration-oriented reads
- `task-service` — creates migration tasks linked to schema versions
- project migration controller — finalizes project migration when all records complete

### Validation and auth rules
- Any project member can create schema changes through the UI in v1.
- Migration tasks should prefer, in order:
  1. existing context
  2. existing artifacts
  3. source files
- Schema migration tasks need explicit schema target version.

### API / router surface
- schema version create/list/diff/status procedures
- migration task creation procedures
- activity log and execution monitor read procedures
- manual trigger / autopick controls for development mode

## Frontend architecture for this phase
### Routes
- `/app/[organizationSlug]/[projectSlug]/settings/schema`
- `/app/[organizationSlug]/[projectSlug]/activity`
- `/app/[organizationSlug]/[projectSlug]/execution`

### Screens / surfaces
- schema settings page with version history, field list, diff, migration status, affected record count, latest schema activity
- activity log / audit trail screen
- execution monitor screen for active runs, retries, and queue-backed processing visibility
- development/debug controls for manual trigger and autopick toggle

### Shared UI components
- `activity-timeline/`
- `progress-metric/`
- `data-table/`
- `page-header/`
- `section-card/`

### Forms
- reuse schema version and schema field primary form components

## Execution flow
### Main flow
1. User creates a new `ProjectSchemaVersion`.
2. App creates a normal project task describing migration from old schema to new schema.
3. System creates per-record processing entries for affected records.
4. Each record run adopts the schema using existing context, then artifacts, then source files if needed.
5. Validated patch is applied.
6. Record is marked migrated.
7. Project migration finalizes when all records complete.

### Edge cases / failure paths
- Schema changes must remain auditable.
- Migration task should not rely on a special task type.
- Admin surfaces should not appear before the runtime data they depend on exists.

## State and lifecycle rules
- Use existing task-record and agent-run lifecycle state for migration progress.
- Task-level migration summary is derived from per-record processing state.

## Security and guardrails
- Manual record edits still validate against active schema.
- All activity and execution reads remain organization/project scoped.
- Dev debug controls should be gated to development/debug policy.

## Observability and audit
- Leverage persisted `activityLog` and `agentRun` telemetry from earlier phases.
- Surface schema changes, completions, failures, retries, and current active runs.

## Implementation sequence inside this phase
1. Extend schema settings with version history, diff, and migration status reads.
2. Implement migration-task creation tied to schema version bumps.
3. Add project migration controller and finalize-all-complete logic.
4. Build activity log screen.
5. Build execution monitor screen and dev debug controls.

## Acceptance criteria
- [ ] New schema versions can produce explicit migration tasks.
- [ ] Migration work fans out per record through existing task-record machinery.
- [ ] Schema settings show version history, diffs, migration status, and affected counts.
- [ ] Activity and execution screens show real persisted runtime data.
- [ ] Dev debug controls can disable autopick and manually trigger processing.

## Handoff to next phase
- This completes the planned v1 implementation sequence from the CRM master plan.
- Later work should focus only on deferred post-v1 questions, not reworking the core phase order.

## Do not implement yet
- `projectMembership` and finer-grained project roles
- external/delegated agent registration flows
- parser asset approval workflow
