# 06. Files, Artifacts, Pipelines, and Queues

## Objective
Add canonical file/artifact storage, long-lived record workspaces, pipeline definitions and runs, and pg-bosser queue infrastructure for async execution handoff.

## Problem this phase solves
- Record tasks need reusable canonical files and derived outputs.
- Agent workspaces must persist execution assets without becoming the source of truth.
- Async execution requires queue-backed handoff outside the web request path.

## Scope
### In scope
- `sourceFile`, `artifact`, `pipelineDefinition`, `pipelineRun`
- local-disk canonical storage under app-owned roots
- long-lived per-record workspace topology
- parser asset bundle contract
- pg-bosser queue definitions, workers, and schedules
- artifact lineage and reuse rules

### Out of scope
- Schema migration controllers
- Broad retention cleanup beyond optional workspace maintenance
- Execution/audit screens

## Source sections from CRM plan
- Section 4.3: execution feature shape
- Section 5.6: file and pipeline tables
- Section 7.2B: file-service, artifact-service, workspace-service, execution-queue-service, execution-schedule-service
- Section 9: workspace topology decision
- Section 10: file processing architecture
- Section 15: workspace layout proposal
- Section 16: parser assets and Python scripts
- Section 17.3 and 17.5: file reprocess and queue/schedule blueprint
- Section 19: idempotency guards
- Section 23 Phase 6 and Section 25.3 / 25.6 step 6

## Dependencies / prerequisites
- Executor and MCP contracts from phase 05
- Record, task, relation, and agent-run foundations from earlier phases

## Required stack and libraries
- **Drizzle + PostgreSQL 18** — canonical metadata, lineage, machine states
- **TypeScript** — artifact, pipeline, and queue payload contracts
- **pg-bosser** — queue runtime and scheduled orchestration jobs
- **Zod** — queue payload validation and pipeline config validation
- **OpenCode server + SDK** — consumes hydrated workspaces and pipeline assets

## Domain objects and data model
### Entities
- `SourceFile`
- `Artifact`
- `PipelineDefinition`
- `PipelineRun`

### Required fields
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

type PipelineDefinition = {
  id: string
  name: string
  version: string
  stages: string[]
  parserAssetVersion: string
  createdAt: Date
}
```

Suggested artifact stages:
- `text_extraction`
- `structure_normalization`
- `field_candidates`
- `record_patch_input`
- `post_validation_report`

### Tables / storage
- `sourceFile` — canonical uploaded file metadata and disk path
- `artifact` — canonical derived output metadata, lineage tuple, machine state, disk path
- `pipelineDefinition` — versioned stage config and parser asset bundle version
- `pipelineRun` — one processing attempt lineage for one task-record execution

Uniqueness and lineage rules:
- `artifact (recordId, fileId, stage, sourceHash, pipelineVersion)` unique
- artifact reuse keyed by `record_id`, `file_id`, `stage`, `source_hash`, `pipeline_version`

## Backend architecture for this phase
### Feature folders
```txt
src/features/
  files/
  artifacts/
  pipelines/
  execution/
    queues/
      task-executor-queue.ts
      task-executor-worker.ts
      schedule-task-executor.ts
    entrypoints/
      run-execution-workers.ts
```

### Services to implement
- `file-service` — canonical file registration, hashing, hydration control
- `artifact-service` — artifact registration, reuse lookup, invalidation, storage access
- `workspace-service` — record workspace path resolution, hydration, manifest sync, local cleanup
- `execution-queue-service` — queue enqueueing and worker handoff
- `execution-schedule-service` — recurring scheduler ticks and maintenance jobs

### Validation and auth rules
- Canonical files and artifacts live on local disk in v1.
- DB stores relative app-owned storage paths, never arbitrary user paths.
- Canonical file paths must never point into workspace tree.
- Workspace hydration copies/materializes from canonical storage.
- Parser/helper scripts are versioned pipeline assets, not arbitrary permanent agent memory.

### API / router surface
- tRPC surfaces for file registration/listing and pipeline visibility
- executor/MCP surfaces reuse file/artifact services for hydration and persistence

## Frontend architecture for this phase
### Routes
- `/app/[organizationSlug]/[projectSlug]/settings/pipelines`

### Screens / surfaces
- file upload/manage panel on record details
- file list and artifact list on record details
- pipeline definitions and parser bundle visibility under settings

### Shared UI components
- `file-list/`
- `artifact-list/`
- `schema-field-list/` not required here

### Forms
- `src/features/files/components/file-upload-form.tsx`

## Execution flow
### Main flow
1. Canonical source file is uploaded and registered.
2. Storage service writes the file under `CRM_STORAGE_ROOT`.
3. Workspace service materializes needed files/artifacts into the record workspace.
4. Executor uses pipeline asset bundle version defined by `PipelineDefinition`.
5. New artifacts are persisted canonically and linked by lineage tuple.
6. Queue workers hand off execution outside the request path.

### Edge cases / failure paths
- Workspace files are persistent but non-canonical.
- No automatic canonical retention cleanup in v1.
- Future S3 migration must replace only storage implementation, not lineage semantics.

## State and lifecycle rules
- `Artifact` should be machine-driven with transitions like registered, available, invalidated, superseded.
- `PipelineRun` should be machine-driven by default.
- `PipelineDefinition` can stay plain config in v1.

## File, artifact, or workspace behavior
Canonical roots:
- `CRM_STORAGE_ROOT`
- `CRM_WORKSPACE_ROOT`

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

Workspace layout:
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

## Security and guardrails
- Canonical storage is app-owned.
- Workspaces are reusable execution environments, not the source of truth.
- Parser logic changes should go through explicit tasks/review; do not silently fork permanent parser logic.

## Observability and audit
- Future activity families include:
  - `artifact.registered`
  - `artifact.invalidated`

## Implementation sequence inside this phase
1. Add file/artifact/pipeline tables.
2. Implement canonical disk storage and path rules.
3. Implement workspace-service and manifest layout.
4. Implement parser asset bundle materialization rules.
5. Add pg-bosser queue definitions, worker entrypoint, and schedules.
6. Add artifact reuse and invalidation logic.

## Acceptance criteria
- [ ] Canonical source files and artifacts are stored under app-owned disk roots.
- [ ] Record workspaces are long-lived and non-canonical.
- [ ] Artifact lineage deduplicates by tuple.
- [ ] Pipeline definitions expose stages and parser asset version.
- [ ] Queue workers run outside web requests through pg-bosser.

## Handoff to next phase
- Expose stable file, artifact, pipeline, workspace, and queue contracts.
- Preserve canonical-vs-workspace ownership boundaries.

## Do not implement yet
- Schema migration execution controller
- Final admin dashboards and retry reporting screens
- Broad storage cleanup policies beyond optional maintenance
