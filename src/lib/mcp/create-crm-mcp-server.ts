import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import {
  applyRecordPatch,
  completeTaskRecord,
  createRecord,
  createRelationEdge,
  crmProjectListInputSchema,
  crmProjectSchemaProposeVersionInputSchema,
  crmRecordCompleteTaskInputSchema,
  crmRecordCreateInputSchema,
  crmRecordCreateRelationEdgeInputSchema,
  crmRecordDeactivateRelationEdgeInputSchema,
  crmRecordFailTaskInputSchema,
  crmRecordGetRelatedInputSchema,
  crmRecordGetRelatedRecordsInputSchema,
  crmRecordListRelationsInputSchema,
  crmRecordPatchInputSchema,
  crmRecordProposePatchInputSchema,
  crmRecordReadInputSchema,
  deactivateRelationEdge,
  failTaskRecord,
  getRelatedRecord,
  getRelatedRecords,
  listProjects,
  listRecordRelations,
  proposeProjectSchemaVersion,
  proposeRecordPatch,
  readProjectSchema,
  readRecord,
} from "@/lib/crm/crm-service"
import { createMcpJsonResponse } from "@/lib/mcp/create-mcp-json-response"
import { getMcpScope } from "@/lib/mcp/mcp-scope-storage"

export const createCrmMcpServer = () => {
  const server = new McpServer({
    name: "project-intern-crm",
    version: "1.0.0",
  })

  server.registerTool(
    "crm_record_read",
    {
      description: "Read the scoped record envelope and context.",
      inputSchema: crmRecordReadInputSchema,
    },
    async (input) => {
      const scope = getMcpScope()
      const record = await readRecord(input, scope)

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
      inputSchema: crmRecordReadInputSchema,
    },
    async (input) => {
      const scope = getMcpScope()
      const result = await readProjectSchema(input, scope)

      return createMcpJsonResponse({
        data: result,
        ok: true,
      })
    },
  )

  server.registerTool(
    "crm_project_schema_propose_version",
    {
      description:
        "Create a new schema proposal in created state for the project. The proposal must include the full schema definition with canonical system fields.",
      inputSchema: crmProjectSchemaProposeVersionInputSchema,
    },
    async (input) => {
      const scope = getMcpScope()
      const proposal = await proposeProjectSchemaVersion(input, scope)

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
      inputSchema: crmRecordProposePatchInputSchema,
    },
    async (input) => {
      const scope = getMcpScope()
      const patch = await proposeRecordPatch(input, scope)

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
      inputSchema: crmRecordPatchInputSchema,
    },
    async (input) => {
      const scope = getMcpScope()
      const result = await applyRecordPatch(input, scope)

      return createMcpJsonResponse({
        data: result,
        ok: true,
      })
    },
  )

  server.registerTool(
    "crm_record_complete_task",
    {
      description:
        "Complete the scoped task record and optionally apply a patch. Pass patch as null when no record values need to change, including schema-only migrations.",
      inputSchema: crmRecordCompleteTaskInputSchema,
    },
    async (input) => {
      const scope = getMcpScope()
      const completedScope = await completeTaskRecord(input, scope)

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
      inputSchema: crmRecordFailTaskInputSchema,
    },
    async (input) => {
      const scope = getMcpScope()
      const failedScope = await failTaskRecord(input, scope)

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
      inputSchema: crmRecordListRelationsInputSchema,
    },
    async (input) => {
      const scope = getMcpScope()
      const relations = await listRecordRelations(input, scope)

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
      inputSchema: crmRecordGetRelatedInputSchema,
    },
    async (input) => {
      const scope = getMcpScope()
      const relation = await getRelatedRecord(input, scope)

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
      inputSchema: crmRecordGetRelatedRecordsInputSchema,
    },
    async (input) => {
      const scope = getMcpScope()
      const relatedRecords = await getRelatedRecords(input, scope)

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
      inputSchema: crmRecordCreateRelationEdgeInputSchema,
    },
    async (input) => {
      const scope = getMcpScope()
      const relation = await createRelationEdge(input, scope)

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
      inputSchema: crmRecordDeactivateRelationEdgeInputSchema,
    },
    async (input) => {
      const scope = getMcpScope()
      const relation = await deactivateRelationEdge(input, scope)

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
      inputSchema: crmRecordCreateInputSchema,
    },
    async (input) => {
      const scope = getMcpScope()
      const record = await createRecord(input, scope)

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
      inputSchema: crmProjectListInputSchema,
    },
    async (input) => {
      const scope = getMcpScope()
      const projects = await listProjects(input, scope)

      return createMcpJsonResponse({
        data: projects,
        ok: true,
      })
    },
  )

  return server
}
