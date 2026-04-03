import { readFile } from "node:fs/promises"
import { extname } from "node:path"
import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { getArtifact } from "@/features/artifacts/lib/get-artifact"
import { getArtifactById } from "@/features/artifacts/lib/get-artifact-by-id"
import { listArtifacts } from "@/features/artifacts/lib/list-artifacts"
import { putArtifact } from "@/features/artifacts/lib/put-artifact"
import { resolveArtifactStoragePath } from "@/features/artifacts/lib/resolve-artifact-storage-path"
import { completeScopedTaskRecord } from "@/features/execution/lib/complete-scoped-task-record"
import { failScopedTaskRecord } from "@/features/execution/lib/fail-scoped-task-record"
import { getTaskRecordExecutionScope } from "@/features/execution/lib/get-task-record-execution-scope"
import { getTaskRecordPatchSchemaVersion } from "@/features/execution/lib/get-task-record-patch-schema-version"
import { writeWorkspaceManifest } from "@/features/execution/lib/write-workspace-manifest"
import { executionRunScopeSchema } from "@/features/execution/schemas/execution-run-scope"
import { patchProposalSchema } from "@/features/execution/schemas/patch-proposal"
import { taskFailureSchema } from "@/features/execution/schemas/task-failure"
import { fetchRecordFile } from "@/features/files/lib/fetch-record-file"
import { getRecordFileById } from "@/features/files/lib/get-record-file-by-id"
import { listRecordFiles } from "@/features/files/lib/list-record-files"
import { resolveSourceFileStoragePath } from "@/features/files/lib/resolve-source-file-storage-path"
import { getActiveProjectSchemaVersionByProjectId } from "@/features/project-schema/lib/get-active-project-schema-version-by-project-id"
import { listProjectSchemaVersionsByProjectId } from "@/features/project-schema/lib/list-project-schema-versions-by-project-id"
import { createRecordEdgeById } from "@/features/record-edges/lib/create-record-edge-by-id"
import { deactivateRecordEdgeById } from "@/features/record-edges/lib/deactivate-record-edge-by-id"
import { getRelatedRecordByEdgeId } from "@/features/record-edges/lib/get-related-record-by-edge-id"
import { getRelatedRecordsByProjectId } from "@/features/record-edges/lib/get-related-records-by-project-id"
import { listRecordRelationsByProjectId } from "@/features/record-edges/lib/list-record-relations-by-project-id"
import { applyRecordPatch } from "@/features/records/lib/apply-record-patch"
import { getScopedRecord } from "@/features/records/lib/get-scoped-record"
import { proposeRecordPatch } from "@/features/records/lib/propose-record-patch"
import { assertMcpOrgOwnsProject } from "@/lib/mcp/assert-mcp-org-owns-project"
import { createArtifactResourceUri } from "@/lib/mcp/create-artifact-resource-uri"
import { createFileResourceUri } from "@/lib/mcp/create-file-resource-uri"
import { createMcpJsonResponse } from "@/lib/mcp/create-mcp-json-response"

const executionScopeInputSchema = executionRunScopeSchema

const patchInputSchema = z.object({
  execution: executionScopeInputSchema,
  patch: patchProposalSchema,
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

const fileFetchInputSchema = z.object({
  execution: executionScopeInputSchema,
  fileId: z.string().uuid(),
})

const artifactGetInputSchema = z.object({
  artifactId: z.string().uuid(),
  execution: executionScopeInputSchema,
})

const artifactPutInputSchema = z.object({
  contentBase64: z.string().trim().min(1),
  execution: executionScopeInputSchema,
  fileId: z.string().uuid(),
  fileName: z.string().trim().min(1),
  idempotencyKey: z.string().trim().min(1),
  metadata: z.record(z.string(), z.unknown()),
  mimeType: z.string().trim().min(1),
  stage: z.string().trim().min(1),
})

const relatedRecordInputSchema = z.object({
  execution: executionScopeInputSchema,
  recordEdgeId: z.string().uuid(),
})

const workspaceManifestInputSchema = z.object({
  artifactIds: z.array(z.string().uuid()),
  execution: executionScopeInputSchema,
  fileIds: z.array(z.string().uuid()),
})

const createResourceContent = async (params: {
  mimeType: string
  uri: string
  filePath: string
}) => {
  const buffer = await readFile(params.filePath)
  const isTextLike =
    params.mimeType.startsWith("text/") ||
    params.mimeType === "application/json" ||
    extname(params.filePath) === ".json"

  if (isTextLike) {
    return {
      contents: [
        {
          mimeType: params.mimeType,
          text: buffer.toString("utf8"),
          uri: params.uri,
        },
      ],
    }
  }

  return {
    contents: [
      {
        blob: buffer.toString("base64"),
        mimeType: params.mimeType,
        uri: params.uri,
      },
    ],
  }
}

const getResourceVariable = (
  variable: string | string[],
  variableName: string,
) => {
  if (typeof variable === "string") {
    return variable
  }

  throw new Error(`Resource variable ${variableName} must be a single string.`)
}

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
    "crm_record_list_files",
    {
      description: "List files available for the scoped record.",
      inputSchema: executionScopeInputSchema,
    },
    async (input) => {
      const scope = await getTaskRecordExecutionScope(input)
      await assertMcpOrgOwnsProject({ projectId: scope.project.id })
      const files = await listRecordFiles({
        projectId: scope.project.id,
        recordId: scope.record.id,
      })

      return createMcpJsonResponse({
        data: files.map((file) => ({
          ...file,
          resourceUri: createFileResourceUri({
            fileId: file.id,
            projectId: scope.project.id,
            recordId: scope.record.id,
          }),
        })),
        ok: true,
      })
    },
  )

  server.registerTool(
    "crm_record_fetch_file",
    {
      description: "Hydrate one scoped file into the record workspace.",
      inputSchema: fileFetchInputSchema,
    },
    async (input) => {
      const scope = await getTaskRecordExecutionScope(input.execution)
      await assertMcpOrgOwnsProject({ projectId: scope.project.id })
      const fetchedFile = await fetchRecordFile({
        fileId: input.fileId,
        projectId: scope.project.id,
        recordId: scope.record.id,
      })

      return createMcpJsonResponse({
        data: {
          ...fetchedFile,
          resourceUri: createFileResourceUri({
            fileId: fetchedFile.file.id,
            projectId: scope.project.id,
            recordId: scope.record.id,
          }),
        },
        ok: true,
      })
    },
  )

  server.registerTool(
    "crm_record_list_artifacts",
    {
      description: "List artifacts available for the scoped record.",
      inputSchema: executionScopeInputSchema,
    },
    async (input) => {
      const scope = await getTaskRecordExecutionScope(input)
      await assertMcpOrgOwnsProject({ projectId: scope.project.id })
      const artifacts = await listArtifacts({
        projectId: scope.project.id,
        recordId: scope.record.id,
      })

      return createMcpJsonResponse({
        data: artifacts.map((artifact) => ({
          ...artifact,
          resourceUri: createArtifactResourceUri({
            artifactId: artifact.id,
            projectId: scope.project.id,
            recordId: scope.record.id,
          }),
        })),
        ok: true,
      })
    },
  )

  server.registerTool(
    "crm_record_get_artifact",
    {
      description: "Hydrate one artifact into the scoped record workspace.",
      inputSchema: artifactGetInputSchema,
    },
    async (input) => {
      const scope = await getTaskRecordExecutionScope(input.execution)
      await assertMcpOrgOwnsProject({ projectId: scope.project.id })
      const hydratedArtifact = await getArtifact({
        artifactId: input.artifactId,
        projectId: scope.project.id,
        recordId: scope.record.id,
      })

      return createMcpJsonResponse({
        data: {
          ...hydratedArtifact,
          resourceUri: createArtifactResourceUri({
            artifactId: hydratedArtifact.artifact.id,
            projectId: scope.project.id,
            recordId: scope.record.id,
          }),
        },
        ok: true,
      })
    },
  )

  server.registerTool(
    "crm_record_put_artifact",
    {
      description: "Persist a new artifact for the scoped record.",
      inputSchema: artifactPutInputSchema,
    },
    async (input) => {
      const scope = await getTaskRecordExecutionScope(input.execution)
      await assertMcpOrgOwnsProject({ projectId: scope.project.id })
      const artifact = await putArtifact({
        contentBase64: input.contentBase64,
        fileId: input.fileId,
        fileName: input.fileName,
        idempotencyKey: input.idempotencyKey,
        metadata: input.metadata,
        mimeType: input.mimeType,
        projectId: scope.project.id,
        recordId: scope.record.id,
        stage: input.stage,
        userId: null,
      })

      return createMcpJsonResponse({
        data: {
          ...artifact,
          resourceUri: createArtifactResourceUri({
            artifactId: artifact.id,
            projectId: scope.project.id,
            recordId: scope.record.id,
          }),
        },
        ok: true,
      })
    },
  )

  server.registerTool(
    "crm_record_write_workspace_manifest",
    {
      description:
        "Write the workspace manifest for the scoped record workspace.",
      inputSchema: workspaceManifestInputSchema,
    },
    async (input) => {
      const scope = await getTaskRecordExecutionScope(input.execution)
      await assertMcpOrgOwnsProject({ projectId: scope.project.id })
      const manifest = await writeWorkspaceManifest({
        artifactIds: input.artifactIds,
        fileIds: input.fileIds,
        projectId: scope.project.id,
        recordId: scope.record.id,
        taskId: scope.task.id,
      })

      return createMcpJsonResponse({
        data: manifest,
        ok: true,
      })
    },
  )

  server.registerResource(
    "crm-file",
    new ResourceTemplate(
      "crm://projects/{projectId}/records/{recordId}/files/{fileId}",
      { list: undefined },
    ),
    {
      description:
        "Read canonical file payload bytes for a scoped record file.",
      mimeType: "application/octet-stream",
    },
    async (_uri, variables) => {
      const fileId = getResourceVariable(variables.fileId, "fileId")
      const projectId = getResourceVariable(variables.projectId, "projectId")
      const recordId = getResourceVariable(variables.recordId, "recordId")

      await assertMcpOrgOwnsProject({ projectId })

      const file = await getRecordFileById({
        fileId,
        projectId,
        recordId,
      })

      return createResourceContent({
        filePath: resolveSourceFileStoragePath({
          storagePath: file.storagePath,
        }),
        mimeType: file.mimeType,
        uri: createFileResourceUri({
          fileId: file.id,
          projectId,
          recordId,
        }),
      })
    },
  )

  server.registerResource(
    "crm-artifact",
    new ResourceTemplate(
      "crm://projects/{projectId}/records/{recordId}/artifacts/{artifactId}",
      { list: undefined },
    ),
    {
      description: "Read artifact payload bytes for a scoped record artifact.",
      mimeType: "application/octet-stream",
    },
    async (_uri, variables) => {
      const artifactId = getResourceVariable(variables.artifactId, "artifactId")
      const projectId = getResourceVariable(variables.projectId, "projectId")
      const recordId = getResourceVariable(variables.recordId, "recordId")

      await assertMcpOrgOwnsProject({ projectId })

      const artifact = await getArtifactById({
        artifactId,
        projectId,
        recordId,
      })

      return createResourceContent({
        filePath: resolveArtifactStoragePath({
          storagePath: artifact.storagePath,
        }),
        mimeType: artifact.mimeType,
        uri: createArtifactResourceUri({
          artifactId: artifact.id,
          projectId,
          recordId,
        }),
      })
    },
  )

  return server
}
