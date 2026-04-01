# 04. Record Relations

## Objective
Add first-class cross-project relations through a generic edge model and make linked record context visible in the UI and later agent tooling.

## Problem this phase solves
- Projects can represent different record types, but records still need canonical links across project boundaries.
- Copied relation data inside record `context` would break auditability and schema coherence.
- Later agent runs need explicit, scoped access to related record context.

## Scope
### In scope
- `RecordEdge` table and app logic
- relation cardinality enforcement
- relation traversal depth `1`
- relation editor on record details
- relation summary on list/detail screens

### Out of scope
- OpenCode relation MCP tools implementation
- Deep traversal or graph exploration
- Relation fields embedded into record `context`

## Source sections from CRM plan
- Section 4.1: `RecordEdge`
- Section 5.4: cross-project relation model and guardrails
- Section 5.6 and 5.7: `recordEdge` responsibilities and indexes
- Section 10A: cross-project relation architecture
- Section 13.1A: relation tools contract
- Section 23 / 25.6 step 4

## Dependencies / prerequisites
- Records, projects, and record detail/list surfaces from earlier phases
- Stable org/project scope and record identities

## Required stack and libraries
- **TypeScript** — relation contract and metadata typing
- **Drizzle + PostgreSQL 18** — generic edge storage and indexes
- **Machin** — guarded `RecordEdge` lifecycle
- **Zod** — relation input validation
- **tRPC + TanStack React Query** — relation CRUD and relation-aware reads
- **shadcn/ui + Tailwind CSS** — relation list/editor surfaces

## Domain objects and data model
### Entities
- `RecordEdge`

### Required fields
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

Recommended metadata examples:
- `confidence`
- `source`
- `created_by_task_id`
- `notes`

### Tables / storage
- `recordEdge` — generic cross-project relations with machine state and auditable metadata

Indexes:
- source index
- target index
- `(fromProjectId, toProjectId, relationType)`
- suggested relation lookups on `(from_record_id, relation_type, state)` and `(to_record_id, relation_type, state)`

## Backend architecture for this phase
### Feature folders
```txt
src/features/
  record-edges/
```

### Services to implement
- `relation-service` — relation creation, deactivation, traversal, and cardinality enforcement

### Validation and auth rules
- Relations are first-class canonical app-owned data.
- Relations do not live inside record `context`.
- Traversal depth is limited to `1` in v1.
- Related context access is read-only by default.
- Cardinality rules are enforced in app logic by `relationType`.

### API / router surface
- relation create/edit/deactivate procedures
- relation list/read procedures for record list/detail enrichment

## Frontend architecture for this phase
### Routes
- relation UI remains embedded into record screens from phase 03

### Screens / surfaces
- relation summary on record list
- related records section on record details
- relation editor panel on record details

### Shared UI components
- `relation-list/`
- `metadata-list/`
- status presentation for edge lifecycle state

### Forms
- `src/features/record-edges/components/relation-form.tsx`

## Execution flow
### Main flow
1. User opens a record details page.
2. System lists active edges for the record.
3. User creates, edits, or deactivates a relation through the relation editor.
4. App logic validates source/target scope and cardinality.
5. Relation metadata is persisted as canonical app-owned data.

### Edge cases / failure paths
- A relation type like `offer -> company belongs_to` may allow only one active outbound edge.
- Traversal must not exceed depth `1`.
- Relation changes must remain auditable.

## State and lifecycle rules
- `RecordEdge` should be machine-driven in v1.
- Edge lifecycle should support guarded transitions such as create, activate, deactivate, supersede, invalidate.

## Security and guardrails
- Agents and users must not infer linked records from copied fields.
- Returned related context is full context in v1 but only through declared relation access paths.
- Relation edits in UI must remain auditable.

## Observability and audit
- Activity event families:
  - `recordEdge.created`
  - `recordEdge.deactivated`

## Implementation sequence inside this phase
1. Add `recordEdge` table and indexes.
2. Implement relation-service with cardinality rules.
3. Add relation CRUD/list procedures.
4. Add relation summary and relation editor surfaces to record screens.

## Acceptance criteria
- [ ] Cross-project relations are stored as first-class edges.
- [ ] Record `context` does not embed copied relation state.
- [ ] Cardinality rules are enforced in app logic.
- [ ] Record screens show linked records and support direct relation editing.
- [ ] Relation changes are auditable.

## Handoff to next phase
- Expose stable relation reads for future MCP tools and executor prompts.
- Preserve depth-1 traversal and read-only-by-default access pattern.

## Do not implement yet
- Remote MCP relation tools
- Agent-driven relation creation during execution
- Deeper graph traversal or broader graph UI
