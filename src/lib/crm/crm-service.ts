import { z } from "zod"
import { completeScopedTaskRecord } from "@/features/execution/lib/complete-scoped-task-record"
import { failScopedTaskRecord } from "@/features/execution/lib/fail-scoped-task-record"
import { getTaskRecordExecutionScope } from "@/features/execution/lib/get-task-record-execution-scope"
import { getTaskRecordPatchSchemaVersion } from "@/features/execution/lib/get-task-record-patch-schema-version"
import { taskFailureSchema } from "@/features/execution/schemas/task-failure"
import { createProjectSchemaVersionProposalByProjectId } from "@/features/project-schema/lib/create-project-schema-version-proposal-by-project-id"
import { getActiveProjectSchemaVersionByProjectId } from "@/features/project-schema/lib/get-active-project-schema-version-by-project-id"
import { listProjectSchemaVersionsByProjectId } from "@/features/project-schema/lib/list-project-schema-versions-by-project-id"
import { projectSchemaDefinitionSchema } from "@/features/project-schema/schemas/project-schema-version"
import { listOrganizationProjectsById } from "@/features/projects/lib/list-organization-projects-by-id"
import { createRecordEdgeById } from "@/features/record-edges/lib/create-record-edge-by-id"
import { deactivateRecordEdgeById } from "@/features/record-edges/lib/deactivate-record-edge-by-id"
import { getRelatedRecordByEdgeId } from "@/features/record-edges/lib/get-related-record-by-edge-id"
import { getRelatedRecordsByProjectId } from "@/features/record-edges/lib/get-related-records-by-project-id"
import { listRecordRelationsByProjectId } from "@/features/record-edges/lib/list-record-relations-by-project-id"
import { applyRecordPatch as applyPatch } from "@/features/records/lib/apply-record-patch"
import { createRecordForMcp } from "@/features/records/lib/create-record-for-mcp"
import { getScopedRecord } from "@/features/records/lib/get-scoped-record"
import { proposeRecordPatch as proposePatch } from "@/features/records/lib/propose-record-patch"
import type { CrmScope } from "@/lib/crm/types"
import { assertMcpOrgOwnsProject } from "@/lib/mcp/assert-mcp-org-owns-project"

const executionScopeInputSchema = z.object({
  agentRunId: z.string().uuid(),
  projectId: z.string().uuid(),
  recordId: z.string().uuid(),
  taskId: z.string().uuid(),
  taskRecordId: z.string().uuid(),
})

export const crmRecordReadInputSchema = executionScopeInputSchema

type CrmRecordReadInput = z.infer<typeof crmRecordReadInputSchema>

const crmProjectReadSchemaInputSchema = executionScopeInputSchema

type CrmProjectReadSchemaInput = z.infer<typeof crmProjectReadSchemaInputSchema>

export const crmProjectSchemaProposeVersionInputSchema = z.object({
  projectId: z.string().uuid(),
  schemaDefinition: projectSchemaDefinitionSchema,
})

type CrmProjectSchemaProposeVersionInput = z.infer<
  typeof crmProjectSchemaProposeVersionInputSchema
>

const patchProposalSchema = z.object({
  baseVersion: z.number().int().positive(),
  changes: z.array(
    z.union([
      z.object({
        field: z.string().trim().min(1),
        op: z.literal("set"),
        reason: z.string().trim().min(1),
        sources: z.array(z.string().trim().min(1)).min(1),
        value: z.unknown(),
      }),
      z.object({
        field: z.string().trim().min(1),
        op: z.literal("unset"),
        reason: z.string().trim().min(1),
        sources: z.array(z.string().trim().min(1)).min(1),
      }),
    ]),
  ),
  recordId: z.string().uuid(),
})

export const crmRecordProposePatchInputSchema = z.object({
  execution: executionScopeInputSchema,
  patch: patchProposalSchema,
})

const crmRecordPatchInputSchema = z.object({
  execution: executionScopeInputSchema,
  patch: patchProposalSchema,
})

type CrmRecordProposePatchInput = z.infer<typeof crmRecordPatchInputSchema>
type CrmRecordApplyPatchInput = z.infer<typeof crmRecordPatchInputSchema>

export const crmRecordCompleteTaskInputSchema = z.object({
  execution: executionScopeInputSchema,
  patch: patchProposalSchema.nullable(),
  resultPayload: z.record(z.string(), z.unknown()).nullable(),
})

type CrmRecordCompleteTaskInput = z.infer<
  typeof crmRecordCompleteTaskInputSchema
>

export const crmRecordFailTaskInputSchema = z.object({
  execution: executionScopeInputSchema,
  failure: taskFailureSchema,
})

type CrmRecordFailTaskInput = z.infer<typeof crmRecordFailTaskInputSchema>

export const crmRecordListRelationsInputSchema = executionScopeInputSchema

type CrmRecordListRelationsInput = z.infer<
  typeof crmRecordListRelationsInputSchema
>

export const crmRecordGetRelatedInputSchema = z.object({
  execution: executionScopeInputSchema,
  recordEdgeId: z.string().uuid(),
})

type CrmRecordGetRelatedInput = z.infer<typeof crmRecordGetRelatedInputSchema>

export const crmRecordGetRelatedRecordsInputSchema = executionScopeInputSchema

type CrmRecordGetRelatedRecordsInput = z.infer<
  typeof crmRecordGetRelatedRecordsInputSchema
>

export const crmRecordCreateRelationEdgeInputSchema = z.object({
  direction: z.enum(["bidirectional", "outbound"]),
  execution: executionScopeInputSchema,
  idempotencyKey: z.string().trim().min(1),
  metadata: z.record(z.string(), z.unknown()),
  relationType: z.enum([
    "belongs_to",
    "depends_on",
    "duplicates",
    "related_to",
  ]),
  targetProjectId: z.string().uuid(),
  targetRecordId: z.string().uuid(),
})

type CrmRecordCreateRelationEdgeInput = z.infer<
  typeof crmRecordCreateRelationEdgeInputSchema
>

export const crmRecordDeactivateRelationEdgeInputSchema = z.object({
  execution: executionScopeInputSchema,
  recordEdgeId: z.string().uuid(),
})

type CrmRecordDeactivateRelationEdgeInput = z.infer<
  typeof crmRecordDeactivateRelationEdgeInputSchema
>

export const crmRecordCreateInputSchema = z.object({
  context: z.record(z.string(), z.unknown()),
  name: z.string().trim().min(1, "Record name is required."),
  projectId: z.string().uuid(),
})

type CrmRecordCreateInput = z.infer<typeof crmRecordCreateInputSchema>

export const crmProjectListInputSchema = z.object({})

type CrmProjectListInput = z.infer<typeof crmProjectListInputSchema>

export const readRecord = async (
  input: CrmRecordReadInput,
  scope: CrmScope,
) => {
  const resolvedScope = await getTaskRecordExecutionScope(input)
  await assertMcpOrgOwnsProject({
    organizationId: scope.organizationId,
    projectId: resolvedScope.project.id,
  })
  return getScopedRecord({
    projectId: resolvedScope.project.id,
    recordId: resolvedScope.record.id,
  })
}

export const readProjectSchema = async (
  input: CrmProjectReadSchemaInput,
  scope: CrmScope,
) => {
  const resolvedScope = await getTaskRecordExecutionScope(input)
  await assertMcpOrgOwnsProject({
    organizationId: scope.organizationId,
    projectId: resolvedScope.project.id,
  })
  const [activeSchema, versions] = await Promise.all([
    getActiveProjectSchemaVersionByProjectId({
      projectId: resolvedScope.project.id,
    }),
    listProjectSchemaVersionsByProjectId({
      projectId: resolvedScope.project.id,
    }),
  ])
  return { activeSchema, versions }
}

export const proposeProjectSchemaVersion = async (
  input: CrmProjectSchemaProposeVersionInput,
  scope: CrmScope,
) => {
  await assertMcpOrgOwnsProject({
    organizationId: scope.organizationId,
    projectId: input.projectId,
  })
  return createProjectSchemaVersionProposalByProjectId({
    actorId: scope.apiKeyId,
    projectId: input.projectId,
    schemaDefinitionInput: input.schemaDefinition,
  })
}

export const proposeRecordPatch = async (
  input: CrmRecordProposePatchInput,
  scope: CrmScope,
) => {
  const resolvedScope = await getTaskRecordExecutionScope(input.execution)
  await assertMcpOrgOwnsProject({
    organizationId: scope.organizationId,
    projectId: resolvedScope.project.id,
  })
  const schemaVersion = getTaskRecordPatchSchemaVersion({
    recordSchemaVersion: resolvedScope.record.schemaVersion,
    taskSchemaVersion: resolvedScope.task.schemaVersion,
    taskTargetSchemaVersionId: resolvedScope.task.targetSchemaVersionId,
  })
  return proposePatch({
    patch: input.patch,
    projectId: resolvedScope.project.id,
    recordId: resolvedScope.record.id,
    schemaVersion,
  })
}

export const applyRecordPatch = async (
  input: CrmRecordApplyPatchInput,
  scope: CrmScope,
) => {
  const resolvedScope = await getTaskRecordExecutionScope(input.execution)
  await assertMcpOrgOwnsProject({
    organizationId: scope.organizationId,
    projectId: resolvedScope.project.id,
  })
  const schemaVersion = getTaskRecordPatchSchemaVersion({
    recordSchemaVersion: resolvedScope.record.schemaVersion,
    taskSchemaVersion: resolvedScope.task.schemaVersion,
    taskTargetSchemaVersionId: resolvedScope.task.targetSchemaVersionId,
  })
  await proposePatch({
    patch: input.patch,
    projectId: resolvedScope.project.id,
    recordId: resolvedScope.record.id,
    schemaVersion,
  })

  const record = await applyPatch({
    patch: input.patch,
    projectId: resolvedScope.project.id,
    recordId: resolvedScope.record.id,
    schemaVersion,
  })

  return {
    record,
    taskRecordState: resolvedScope.taskRecord.state,
  }
}

export const completeTaskRecord = async (
  input: CrmRecordCompleteTaskInput,
  scope: CrmScope,
) => {
  const resolvedScope = await getTaskRecordExecutionScope(input.execution)
  await assertMcpOrgOwnsProject({
    organizationId: scope.organizationId,
    projectId: resolvedScope.project.id,
  })
  return completeScopedTaskRecord({
    executionScope: input.execution,
    patch: input.patch,
    resultPayload: input.resultPayload,
    toolActivitySummary: { completionSource: "rest" },
  })
}

export const failTaskRecord = async (
  input: CrmRecordFailTaskInput,
  scope: CrmScope,
) => {
  const resolvedScope = await getTaskRecordExecutionScope(input.execution)
  await assertMcpOrgOwnsProject({
    organizationId: scope.organizationId,
    projectId: resolvedScope.project.id,
  })
  return failScopedTaskRecord({
    executionScope: input.execution,
    failure: input.failure,
    toolActivitySummary: { failureSource: "rest" },
  })
}

export const listRecordRelations = async (
  input: CrmRecordListRelationsInput,
  scope: CrmScope,
) => {
  const resolvedScope = await getTaskRecordExecutionScope(input)
  await assertMcpOrgOwnsProject({
    organizationId: scope.organizationId,
    projectId: resolvedScope.project.id,
  })
  return listRecordRelationsByProjectId({
    projectId: resolvedScope.project.id,
    recordId: resolvedScope.record.id,
  })
}

export const getRelatedRecord = async (
  input: CrmRecordGetRelatedInput,
  scope: CrmScope,
) => {
  const resolvedScope = await getTaskRecordExecutionScope(input.execution)
  await assertMcpOrgOwnsProject({
    organizationId: scope.organizationId,
    projectId: resolvedScope.project.id,
  })
  return getRelatedRecordByEdgeId({
    projectId: resolvedScope.project.id,
    recordEdgeId: input.recordEdgeId,
    recordId: resolvedScope.record.id,
  })
}

export const getRelatedRecords = async (
  input: CrmRecordGetRelatedRecordsInput,
  scope: CrmScope,
) => {
  const resolvedScope = await getTaskRecordExecutionScope(input)
  await assertMcpOrgOwnsProject({
    organizationId: scope.organizationId,
    projectId: resolvedScope.project.id,
  })
  return getRelatedRecordsByProjectId({
    projectId: resolvedScope.project.id,
    recordId: resolvedScope.record.id,
  })
}

export const createRelationEdge = async (
  input: CrmRecordCreateRelationEdgeInput,
  scope: CrmScope,
) => {
  const resolvedScope = await getTaskRecordExecutionScope(input.execution)
  await assertMcpOrgOwnsProject({
    organizationId: scope.organizationId,
    projectId: resolvedScope.project.id,
  })
  return createRecordEdgeById({
    agentRunId: resolvedScope.agentRun.id,
    direction: input.direction,
    metadata: {
      ...input.metadata,
      idempotencyKey: input.idempotencyKey,
    },
    relationType: input.relationType,
    sourceProjectId: resolvedScope.project.id,
    sourceRecordId: resolvedScope.record.id,
    targetProjectId: input.targetProjectId,
    targetRecordId: input.targetRecordId,
    taskId: resolvedScope.task.id,
  })
}

export const deactivateRelationEdge = async (
  input: CrmRecordDeactivateRelationEdgeInput,
  scope: CrmScope,
) => {
  const resolvedScope = await getTaskRecordExecutionScope(input.execution)
  await assertMcpOrgOwnsProject({
    organizationId: scope.organizationId,
    projectId: resolvedScope.project.id,
  })
  return deactivateRecordEdgeById({
    agentRunId: resolvedScope.agentRun.id,
    projectId: resolvedScope.project.id,
    recordEdgeId: input.recordEdgeId,
    recordId: resolvedScope.record.id,
  })
}

export const createRecord = async (
  input: CrmRecordCreateInput,
  scope: CrmScope,
) => {
  await assertMcpOrgOwnsProject({
    organizationId: scope.organizationId,
    projectId: input.projectId,
  })
  return createRecordForMcp({
    context: input.context,
    name: input.name,
    organizationId: scope.organizationId,
    projectId: input.projectId,
  })
}

export const listProjects = async (
  _input: CrmProjectListInput,
  scope: CrmScope,
) => {
  return listOrganizationProjectsById(scope.organizationId)
}
