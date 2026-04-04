import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { completeScopedTaskRecord } from "@/features/execution/lib/complete-scoped-task-record"
import { failScopedTaskRecord } from "@/features/execution/lib/fail-scoped-task-record"
import { getTaskRecordExecutionScope } from "@/features/execution/lib/get-task-record-execution-scope"
import { getTaskRecordPatchSchemaVersion } from "@/features/execution/lib/get-task-record-patch-schema-version"
import { executionRunScopeSchema } from "@/features/execution/schemas/execution-run-scope"
import { patchProposalSchema } from "@/features/execution/schemas/patch-proposal"
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
import { applyRecordPatch } from "@/features/records/lib/apply-record-patch"
import { createRecordForMcp } from "@/features/records/lib/create-record-for-mcp"
import { getScopedRecord } from "@/features/records/lib/get-scoped-record"
import { proposeRecordPatch } from "@/features/records/lib/propose-record-patch"
import { assertMcpOrgOwnsProject } from "@/lib/mcp/assert-mcp-org-owns-project"
import { createMcpJsonResponse } from "@/lib/mcp/create-mcp-json-response"
import { getMcpScope } from "@/lib/mcp/mcp-scope-storage"

const executionScopeInputSchema = executionRunScopeSchema

const patchInputSchema = z.object({
  execution: executionScopeInputSchema,
  patch: patchProposalSchema,
})

const schemaProposalInputSchema = z.object({
  projectId: z.string().uuid(),
  schemaDefinition: projectSchemaDefinitionSchema,
})

const completeTaskRecordInputSchema = z.object({
  execution: executionScopeInputSchema,
  patch: patchProposalSchema.nullable(),
  resultPayload: z.record(z.string(), z.unknown()).nullable(),
})

const failTaskRecordInputSchema = z.object({
  execution: executionScopeInputSchema,
  failure: taskFailureSchema,
})

const relationCreateInputSchema = z.object({
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

const relationDeactivateInputSchema = z.object({
  execution: executionScopeInputSchema,
  recordEdgeId: z.string().uuid(),
})

const relatedRecordInputSchema = z.object({
  execution: executionScopeInputSchema,
  recordEdgeId: z.string().uuid(),
})

const recordCreateInputSchema = z.object({
  context: z.record(z.string(), z.unknown()),
  name: z.string().trim().min(1, "Record name is required."),
  projectId: z.string().uuid(),
})

export const createCrmMcpServer = () => {
  const server = new McpServer({
    name: "project-intern-crm",
    version: "1.0.0",
  })

  server.registerTool(
    "crm_record_read",
    {
      description: "Read the scoped record envelope and context.",
      inputSchema: executionScopeInputSchema,
    },
    async (input) => {
      const scope = await getTaskRecordExecutionScope(input)
      await assertMcpOrgOwnsProject({ projectId: scope.project.id })
      const record = await getScopedRecord({
        projectId: scope.project.id,
        recordId: scope.record.id,
      })

      return createMcpJsonResponse({
        data: record,
        ok: true,
      })
    },
  )

  server.registerTool(
    "crm_project_read_schema",
    {
      description: "Read the active project schema and versions.",
      inputSchema: executionScopeInputSchema,
    },
    async (input) => {
      const scope = await getTaskRecordExecutionScope(input)
      await assertMcpOrgOwnsProject({ projectId: scope.project.id })
      const [activeSchema, versions] = await Promise.all([
        getActiveProjectSchemaVersionByProjectId({
          projectId: scope.project.id,
        }),
        listProjectSchemaVersionsByProjectId({ projectId: scope.project.id }),
      ])

      return createMcpJsonResponse({
        data: {
          activeSchema,
          versions,
        },
        ok: true,
      })
    },
  )

  server.registerTool(
    "crm_project_schema_propose_version",
    {
      description:
        "Create a new schema proposal in created state for the project. The proposal must include the full schema definition with canonical system fields.",
      inputSchema: schemaProposalInputSchema,
    },
    async (input) => {
      await assertMcpOrgOwnsProject({ projectId: input.projectId })
      const scope = getMcpScope()
      const proposal = await createProjectSchemaVersionProposalByProjectId({
        actorId: scope.apiKeyId,
        projectId: input.projectId,
        schemaDefinitionInput: input.schemaDefinition,
      })

      return createMcpJsonResponse({
        data: proposal,
        ok: true,
      })
    },
  )

  server.registerTool(
    "crm_record_propose_patch",
    {
      description:
        "Validate a structured patch proposal for the scoped record. Patches edit record values only, not schemaVersion. Use the current record version as baseVersion. Valid patch targets are name and schema-backed context fields.",
      inputSchema: patchInputSchema,
    },
    async (input) => {
      const scope = await getTaskRecordExecutionScope(input.execution)
      await assertMcpOrgOwnsProject({ projectId: scope.project.id })
      const schemaVersion = getTaskRecordPatchSchemaVersion({
        recordSchemaVersion: scope.record.schemaVersion,
        taskSchemaVersion: scope.task.schemaVersion,
        taskTargetSchemaVersionId: scope.task.targetSchemaVersionId,
      })
      const patch = await proposeRecordPatch({
        patch: input.patch,
        projectId: scope.project.id,
        recordId: scope.record.id,
        schemaVersion,
      })

      return createMcpJsonResponse({
        data: patch,
        ok: true,
      })
    },
  )

  server.registerTool(
    "crm_record_apply_patch",
    {
      description:
        "Apply a validated structured patch to the scoped record. Patches edit record values only, not schemaVersion. Use the current record version as baseVersion. Valid patch targets are name and schema-backed context fields.",
      inputSchema: patchInputSchema,
    },
    async (input) => {
      const scope = await getTaskRecordExecutionScope(input.execution)
      await assertMcpOrgOwnsProject({ projectId: scope.project.id })
      const schemaVersion = getTaskRecordPatchSchemaVersion({
        recordSchemaVersion: scope.record.schemaVersion,
        taskSchemaVersion: scope.task.schemaVersion,
        taskTargetSchemaVersionId: scope.task.targetSchemaVersionId,
      })
      await proposeRecordPatch({
        patch: input.patch,
        projectId: scope.project.id,
        recordId: scope.record.id,
        schemaVersion,
      })

      const record = await applyRecordPatch({
        patch: input.patch,
        projectId: scope.project.id,
        recordId: scope.record.id,
        schemaVersion,
      })

      return createMcpJsonResponse({
        data: {
          record,
          taskRecordState: scope.taskRecord.state,
        },
        ok: true,
      })
    },
  )

  server.registerTool(
    "crm_record_complete_task",
    {
      description:
        "Complete the scoped task record and optionally apply a patch. Pass patch as null when no record values need to change, including schema-only migrations.",
      inputSchema: completeTaskRecordInputSchema,
    },
    async (input) => {
      const scope = await getTaskRecordExecutionScope(input.execution)
      await assertMcpOrgOwnsProject({ projectId: scope.project.id })
      const completedScope = await completeScopedTaskRecord({
        executionScope: input.execution,
        patch: input.patch,
        resultPayload: input.resultPayload,
        toolActivitySummary: { completionSource: "mcp" },
      })

      return createMcpJsonResponse({
        data: completedScope,
        ok: true,
      })
    },
  )

  server.registerTool(
    "crm_record_fail_task",
    {
      description:
        "Fail the scoped task record with a structured failure payload. Use this whenever you cannot complete the task, including repeated tool validation errors or inability to produce a valid patch.",
      inputSchema: failTaskRecordInputSchema,
    },
    async (input) => {
      const scope = await getTaskRecordExecutionScope(input.execution)
      await assertMcpOrgOwnsProject({ projectId: scope.project.id })
      const failedScope = await failScopedTaskRecord({
        executionScope: input.execution,
        failure: input.failure,
        toolActivitySummary: { failureSource: "mcp" },
      })

      return createMcpJsonResponse({
        data: failedScope,
        ok: true,
      })
    },
  )

  server.registerTool(
    "crm_record_list_relations",
    {
      description: "List active relations for the scoped record.",
      inputSchema: executionScopeInputSchema,
    },
    async (input) => {
      const scope = await getTaskRecordExecutionScope(input)
      await assertMcpOrgOwnsProject({ projectId: scope.project.id })
      const relations = await listRecordRelationsByProjectId({
        projectId: scope.project.id,
        recordId: scope.record.id,
      })

      return createMcpJsonResponse({
        data: relations,
        ok: true,
      })
    },
  )

  server.registerTool(
    "crm_record_get_related",
    {
      description: "Read one related record linked from the scoped record.",
      inputSchema: relatedRecordInputSchema,
    },
    async (input) => {
      const scope = await getTaskRecordExecutionScope(input.execution)
      await assertMcpOrgOwnsProject({ projectId: scope.project.id })
      const relation = await getRelatedRecordByEdgeId({
        projectId: scope.project.id,
        recordEdgeId: input.recordEdgeId,
        recordId: scope.record.id,
      })

      return createMcpJsonResponse({
        data: relation,
        ok: true,
      })
    },
  )

  server.registerTool(
    "crm_record_get_related_records",
    {
      description: "Read related records linked from the scoped record.",
      inputSchema: executionScopeInputSchema,
    },
    async (input) => {
      const scope = await getTaskRecordExecutionScope(input)
      await assertMcpOrgOwnsProject({ projectId: scope.project.id })
      const relatedRecords = await getRelatedRecordsByProjectId({
        projectId: scope.project.id,
        recordId: scope.record.id,
      })

      return createMcpJsonResponse({
        data: relatedRecords,
        ok: true,
      })
    },
  )

  server.registerTool(
    "crm_record_create_relation_edge",
    {
      description: "Create a relation edge from the scoped record.",
      inputSchema: relationCreateInputSchema,
    },
    async (input) => {
      const scope = await getTaskRecordExecutionScope(input.execution)
      await assertMcpOrgOwnsProject({ projectId: scope.project.id })
      const relation = await createRecordEdgeById({
        agentRunId: scope.agentRun.id,
        direction: input.direction,
        metadata: {
          ...input.metadata,
          idempotencyKey: input.idempotencyKey,
        },
        relationType: input.relationType,
        sourceProjectId: scope.project.id,
        sourceRecordId: scope.record.id,
        targetProjectId: input.targetProjectId,
        targetRecordId: input.targetRecordId,
        taskId: scope.task.id,
      })

      return createMcpJsonResponse({
        data: relation,
        ok: true,
      })
    },
  )

  server.registerTool(
    "crm_record_deactivate_relation_edge",
    {
      description: "Deactivate a relation edge from the scoped record.",
      inputSchema: relationDeactivateInputSchema,
    },
    async (input) => {
      const scope = await getTaskRecordExecutionScope(input.execution)
      await assertMcpOrgOwnsProject({ projectId: scope.project.id })
      const relation = await deactivateRecordEdgeById({
        agentRunId: scope.agentRun.id,
        projectId: scope.project.id,
        recordEdgeId: input.recordEdgeId,
        recordId: scope.record.id,
      })

      return createMcpJsonResponse({
        data: relation,
        ok: true,
      })
    },
  )

  server.registerTool(
    "crm_record_create",
    {
      description:
        "Create a new record in the specified project. Validates name and context against the project's initial schema version.",
      inputSchema: recordCreateInputSchema,
    },
    async (input) => {
      await assertMcpOrgOwnsProject({ projectId: input.projectId })
      const record = await createRecordForMcp({
        context: input.context,
        name: input.name,
        projectId: input.projectId,
      })

      return createMcpJsonResponse({
        data: record,
        ok: true,
      })
    },
  )

  server.registerTool(
    "crm_project_list",
    {
      description:
        "List all projects in the organization that issued the API key.",
      inputSchema: z.object({}),
    },
    async () => {
      const scope = getMcpScope()
      const projects = await listOrganizationProjectsById(scope.organizationId)

      return createMcpJsonResponse({
        data: projects,
        ok: true,
      })
    },
  )

  return server
}
