# 02. Schema Versions and Records

## Objective
Add project-scoped shared schema versions and canonical record storage with a relational envelope plus JSONB context.

## Problem this phase solves
- The system needs a canonical business object model before tasks or agent execution can act on data.
- Every project requires one shared schema definition for all records.
- Record editing and validation must be anchored to the active schema version.

## Scope
### In scope
- `ProjectSchemaVersion` model and versioning rules
- `Record` storage model with envelope fields and JSONB `context`
- Active schema version reads per project
- Runtime Zod validation derived from active project schema version
- Record CRUD and schema-validated context updates
- Record list/detail foundation routes and forms

### Out of scope
- Tasks, task fan-out, agent runs
- Files, artifacts, pipelines
- Schema migration execution
- Cross-project relations

## Source sections from CRM plan
- Section 3: naming
- Section 4.1: `ProjectSchemaVersion`, `Record`
- Section 5.1 and 5.2: shared schema model and record storage model
- Section 5.6: `projectSchemaVersion` and `record` responsibilities
- Section 5.7: relational rules and indexes
- Section 8A.4, 8A.6, 8A.6A: record and schema UI expectations
- Section 11.4: concrete schema field blueprint
- Section 23 Phase 1 and 25.6 step 2

## Dependencies / prerequisites
- Auth, organization, project scope, and DB runtime from phase 01
- Protected project routes already exist

## Required stack and libraries
- **TypeScript** — entity and schema contracts
- **Drizzle + PostgreSQL 18** — schema version and record tables with JSONB context
- **Zod** — project schema validation and runtime record validation
- **tRPC + TanStack React Query** — record and schema data access
- **Next.js App Router** — project-scoped record surfaces
- **shadcn/ui + Tailwind CSS** — record and schema screens/forms
- **react-hook-form** — form handling for record and schema editors

## Domain objects and data model
### Entities
- `ProjectSchemaVersion`
- `Record`

### Required fields
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

Schema field kinds supported in v1:
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

Each field definition includes:
- `key`
- `label`
- `type`
- `required`
- `description`
- `defaultValue` when valid
- `config`

### Tables / storage
- `projectSchemaVersion` — full validated schema JSON, version number, optional parent version id; unique `(projectId, version)`
- `record` — project envelope fields, active schema version, machine state, JSONB context, optimistic `version`

Index rules:
- `record (projectId, id)` indexed
- `record.name` indexed per project

## Backend architecture for this phase
### Feature folders
```txt
src/features/
  project-schema/
  records/
```

### Services to implement
- `project-schema-service` — schema version creation, validation, diffing, active-version reads
- `record-service` — record CRUD, schema-validated context updates, optimistic patch-ready storage rules

### Validation and auth rules
- Schema is shared per project; all records in the project use the same schema definition.
- Required system fields must include `id` and `name`.
- Record custom fields live in `context`, not dynamic columns.
- Runtime validation is derived from the active schema version.
- Manual record edits must validate against active schema before persistence.

### API / router surface
- tRPC procedures for:
  - active schema read
  - schema version list
  - record create/read/update/list
  - schema version create/edit workflow

## Frontend architecture for this phase
### Routes
- `/app/[organizationSlug]/[projectSlug]/records`
- `/app/[organizationSlug]/[projectSlug]/records/[recordId]`
- `/app/[organizationSlug]/[projectSlug]/settings/schema`

### Screens / surfaces
- record list view
- record details page with envelope fields and full context editor
- schema version browser/editor under project settings
- schema diff modal

### Shared UI components
- start using the semantic building blocks planned for later broad UI reuse when repetition appears
- schema field list and metadata presentation should be consistent with active schema reads

### Forms
- `src/features/records/components/record-form.tsx`
- `src/features/project-schema/components/schema-field-form.tsx`
- `src/features/project-schema/components/schema-version-form.tsx`

Rules:
- primary form component reused across modal, drawer, inline, or detail shells
- do not duplicate create/edit markup per surface

## Execution flow
### Main flow
1. User opens project schema settings.
2. System reads active schema version and version history.
3. User creates or updates a new schema version.
4. Record forms derive runtime validation from the active schema version.
5. User creates or edits a record using envelope fields plus `context` fields.
6. System stores canonical record data in app-owned Postgres storage.

### Edge cases / failure paths
- Invalid schema definitions must fail validation before persistence.
- Invalid record context values must fail against active schema-derived Zod validation.
- Relations must not be represented as copied foreign-key fields in record `context`.

## State and lifecycle rules
- `Record` should be machine-driven in v1; stored record state comes from a Machin actor rather than ad hoc flags.
- `state` represents machine state, not a freeform business status column.

## Security and guardrails
- All record and schema reads/writes are project-scoped.
- Users operate only inside organization + project access boundaries.
- Schema and record mutations must be validated server-side, not just in UI.

## Observability and audit
- Prepare append-only activity logging later for schema and record changes.
- Important future event families include `schema.version_created` and `record.patch_applied`.

## Implementation sequence inside this phase
1. Add `projectSchemaVersion` and `record` tables.
2. Implement shared schema validation and active-version reads.
3. Generate runtime Zod validation from active schema.
4. Add record CRUD and schema-validated context persistence.
5. Build record list and record details routes.
6. Build schema settings page and schema diff surface.

## Acceptance criteria
- [ ] Each project has versioned shared schema definitions.
- [ ] All records in a project use the same active schema model.
- [ ] Record storage uses envelope columns plus JSONB `context`.
- [ ] Record edits validate against active schema.
- [ ] Record list/detail and schema settings routes work in project scope.

## Handoff to next phase
- Expose stable `Record` and `ProjectSchemaVersion` contracts.
- Expose active schema reads for task creation, task detail, and later executor prompts.
- Preserve optimistic `record.version` for later patch application.

## Do not implement yet
- Task ordering, task-record lifecycle, agent runs
- OpenCode executor and MCP tools
- File/artifact/pipeline processing
- Schema migration controllers
