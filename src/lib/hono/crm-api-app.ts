import { OpenAPIHono, z } from "@hono/zod-openapi"
import {
  applyRecordPatch,
  completeTaskRecord,
  createRecord,
  createRelationEdge,
  crmProjectListInputSchema,
  crmProjectSchemaProposeVersionInputSchema,
  crmRecordApplyPatchInputSchema,
  crmRecordCompleteTaskInputSchema,
  crmRecordCreateInputSchema,
  crmRecordCreateRelationEdgeInputSchema,
  crmRecordDeactivateRelationEdgeInputSchema,
  crmRecordFailTaskInputSchema,
  crmRecordGetRelatedInputSchema,
  crmRecordGetRelatedRecordsInputSchema,
  crmRecordListRelationsInputSchema,
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
import type { CrmScope } from "@/lib/crm/types"
import { verifyMcpApiKey } from "@/lib/mcp/verify-mcp-api-key"

export const crmApiApp = new OpenAPIHono()

crmApiApp.openAPIRegistry.registerComponent("securitySchemes", "Bearer", {
  scheme: "bearer",
  type: "http",
})

crmApiApp.use((context, next) => {
  const url = new URL(context.req.url)
  if (url.pathname.endsWith("/schema.json")) return next()
  return verifyMcpApiKey(context, next)
})

type HandlerContext = Parameters<Parameters<typeof crmApiApp.openapi>[1]>[0]

const getScope = (context: HandlerContext): CrmScope => {
  const mcpScope = context.get("mcpScope")
  return {
    apiKeyId: mcpScope.apiKeyId,
    organizationId: mcpScope.organizationId,
  }
}

const envelopeSchema = z.object({
  data: z.unknown().nullable(),
  ok: z.boolean(),
})

const errorResponse = {
  400: {
    content: {
      "application/json": {
        schema: z.object({ error: z.object({ message: z.string() }) }),
      },
    },
    description: "Bad request or validation error.",
  },
  401: {
    content: {
      "application/json": {
        schema: z.object({ error: z.object({ message: z.string() }) }),
      },
    },
    description: "Unauthorized — invalid or missing API key.",
  },
  403: {
    content: {
      "application/json": {
        schema: z.object({ error: z.object({ message: z.string() }) }),
      },
    },
    description: "Forbidden — organization does not own the target resource.",
  },
  404: {
    content: {
      "application/json": {
        schema: z.object({ error: z.object({ message: z.string() }) }),
      },
    },
    description: "Resource not found.",
  },
}

const okResponse = (data: unknown) => ({
  content: {
    "application/json": {
      schema: envelopeSchema,
    },
  },
  description: data as string,
})

// POST /projects/list
crmApiApp.openapi(
  {
    method: "post",
    path: "/projects/list",
    request: {
      body: {
        content: {
          "application/json": {
            schema: crmProjectListInputSchema,
          },
        },
      },
    },
    responses: {
      200: okResponse("List of organization projects."),
      ...errorResponse,
    },
    security: [{ Bearer: [] }],
    summary: "List all projects in the organization.",
    tags: ["Projects"],
  },
  async (context) => {
    const body = context.req.valid("json")
    const scope = getScope(context)
    const projects = await listProjects(body, scope)
    return context.json({ data: projects, ok: true as const }, 200)
  },
)

// POST /records/read
crmApiApp.openapi(
  {
    method: "post",
    path: "/records/read",
    request: {
      body: {
        content: {
          "application/json": {
            schema: crmRecordReadInputSchema,
          },
        },
      },
    },
    responses: {
      200: okResponse("The scoped record envelope and context."),
      ...errorResponse,
    },
    security: [{ Bearer: [] }],
    summary: "Read the scoped record envelope and context.",
    tags: ["Records"],
  },
  async (context) => {
    const body = context.req.valid("json")
    const scope = getScope(context)
    const record = await readRecord(body, scope)
    return context.json({ data: record, ok: true as const }, 200)
  },
)

// POST /records/propose-patch
crmApiApp.openapi(
  {
    method: "post",
    path: "/records/propose-patch",
    request: {
      body: {
        content: {
          "application/json": {
            schema: crmRecordProposePatchInputSchema,
          },
        },
      },
    },
    responses: {
      200: okResponse("The validated patch proposal."),
      ...errorResponse,
    },
    security: [{ Bearer: [] }],
    summary: "Validate a structured patch proposal for the scoped record.",
    tags: ["Records"],
  },
  async (context) => {
    const body = context.req.valid("json")
    const scope = getScope(context)
    const patch = await proposeRecordPatch(body, scope)
    return context.json({ data: patch, ok: true as const }, 200)
  },
)

// POST /records/apply-patch
crmApiApp.openapi(
  {
    method: "post",
    path: "/records/apply-patch",
    request: {
      body: {
        content: {
          "application/json": {
            schema: crmRecordApplyPatchInputSchema,
          },
        },
      },
    },
    responses: {
      200: okResponse("The patched record and task record state."),
      ...errorResponse,
    },
    security: [{ Bearer: [] }],
    summary: "Apply a validated structured patch to the scoped record.",
    tags: ["Records"],
  },
  async (context) => {
    const body = context.req.valid("json")
    const scope = getScope(context)
    const result = await applyRecordPatch(body, scope)
    return context.json({ data: result, ok: true as const }, 200)
  },
)

// POST /records/complete-task
crmApiApp.openapi(
  {
    method: "post",
    path: "/records/complete-task",
    request: {
      body: {
        content: {
          "application/json": {
            schema: crmRecordCompleteTaskInputSchema,
          },
        },
      },
    },
    responses: {
      200: okResponse("The completed task scope."),
      ...errorResponse,
    },
    security: [{ Bearer: [] }],
    summary: "Complete the scoped task record and optionally apply a patch.",
    tags: ["Records"],
  },
  async (context) => {
    const body = context.req.valid("json")
    const scope = getScope(context)
    const completedScope = await completeTaskRecord(body, scope)
    return context.json({ data: completedScope, ok: true as const }, 200)
  },
)

// POST /records/fail-task
crmApiApp.openapi(
  {
    method: "post",
    path: "/records/fail-task",
    request: {
      body: {
        content: {
          "application/json": {
            schema: crmRecordFailTaskInputSchema,
          },
        },
      },
    },
    responses: {
      200: okResponse("The failed task scope."),
      ...errorResponse,
    },
    security: [{ Bearer: [] }],
    summary: "Fail the scoped task record with a structured failure payload.",
    tags: ["Records"],
  },
  async (context) => {
    const body = context.req.valid("json")
    const scope = getScope(context)
    const failedScope = await failTaskRecord(body, scope)
    return context.json({ data: failedScope, ok: true as const }, 200)
  },
)

// POST /records/create
crmApiApp.openapi(
  {
    method: "post",
    path: "/records/create",
    request: {
      body: {
        content: {
          "application/json": {
            schema: crmRecordCreateInputSchema,
          },
        },
      },
    },
    responses: {
      200: okResponse("The created record."),
      ...errorResponse,
    },
    security: [{ Bearer: [] }],
    summary: "Create a new record in the specified project.",
    tags: ["Records"],
  },
  async (context) => {
    const body = context.req.valid("json")
    const scope = getScope(context)
    const record = await createRecord(body, scope)
    return context.json({ data: record, ok: true as const }, 200)
  },
)

// POST /records/list-relations
crmApiApp.openapi(
  {
    method: "post",
    path: "/records/list-relations",
    request: {
      body: {
        content: {
          "application/json": {
            schema: crmRecordListRelationsInputSchema,
          },
        },
      },
    },
    responses: {
      200: okResponse("List of active relations for the scoped record."),
      ...errorResponse,
    },
    security: [{ Bearer: [] }],
    summary: "List active relations for the scoped record.",
    tags: ["Relations"],
  },
  async (context) => {
    const body = context.req.valid("json")
    const scope = getScope(context)
    const relations = await listRecordRelations(body, scope)
    return context.json({ data: relations, ok: true as const }, 200)
  },
)

// POST /records/get-related
crmApiApp.openapi(
  {
    method: "post",
    path: "/records/get-related",
    request: {
      body: {
        content: {
          "application/json": {
            schema: crmRecordGetRelatedInputSchema,
          },
        },
      },
    },
    responses: {
      200: okResponse("The related record."),
      ...errorResponse,
    },
    security: [{ Bearer: [] }],
    summary: "Read one related record linked from the scoped record.",
    tags: ["Relations"],
  },
  async (context) => {
    const body = context.req.valid("json")
    const scope = getScope(context)
    const relation = await getRelatedRecord(body, scope)
    return context.json({ data: relation, ok: true as const }, 200)
  },
)

// POST /records/get-related-records
crmApiApp.openapi(
  {
    method: "post",
    path: "/records/get-related-records",
    request: {
      body: {
        content: {
          "application/json": {
            schema: crmRecordGetRelatedRecordsInputSchema,
          },
        },
      },
    },
    responses: {
      200: okResponse("List of related records."),
      ...errorResponse,
    },
    security: [{ Bearer: [] }],
    summary: "Read related records linked from the scoped record.",
    tags: ["Relations"],
  },
  async (context) => {
    const body = context.req.valid("json")
    const scope = getScope(context)
    const relatedRecords = await getRelatedRecords(body, scope)
    return context.json({ data: relatedRecords, ok: true as const }, 200)
  },
)

// POST /records/create-relation
crmApiApp.openapi(
  {
    method: "post",
    path: "/records/create-relation",
    request: {
      body: {
        content: {
          "application/json": {
            schema: crmRecordCreateRelationEdgeInputSchema,
          },
        },
      },
    },
    responses: {
      200: okResponse("The created relation edge."),
      ...errorResponse,
    },
    security: [{ Bearer: [] }],
    summary: "Create a relation edge from the scoped record.",
    tags: ["Relations"],
  },
  async (context) => {
    const body = context.req.valid("json")
    const scope = getScope(context)
    const relation = await createRelationEdge(body, scope)
    return context.json({ data: relation, ok: true as const }, 200)
  },
)

// POST /records/deactivate-relation
crmApiApp.openapi(
  {
    method: "post",
    path: "/records/deactivate-relation",
    request: {
      body: {
        content: {
          "application/json": {
            schema: crmRecordDeactivateRelationEdgeInputSchema,
          },
        },
      },
    },
    responses: {
      200: okResponse("The deactivated relation edge."),
      ...errorResponse,
    },
    security: [{ Bearer: [] }],
    summary: "Deactivate a relation edge from the scoped record.",
    tags: ["Relations"],
  },
  async (context) => {
    const body = context.req.valid("json")
    const scope = getScope(context)
    const relation = await deactivateRelationEdge(body, scope)
    return context.json({ data: relation, ok: true as const }, 200)
  },
)

// POST /projects/read-schema
crmApiApp.openapi(
  {
    method: "post",
    path: "/projects/read-schema",
    request: {
      body: {
        content: {
          "application/json": {
            schema: crmRecordReadInputSchema,
          },
        },
      },
    },
    responses: {
      200: okResponse("The active project schema and versions."),
      ...errorResponse,
    },
    security: [{ Bearer: [] }],
    summary: "Read the active project schema and versions.",
    tags: ["Projects"],
  },
  async (context) => {
    const body = context.req.valid("json")
    const scope = getScope(context)
    const result = await readProjectSchema(body, scope)
    return context.json({ data: result, ok: true as const }, 200)
  },
)

// POST /projects/propose-schema-version
crmApiApp.openapi(
  {
    method: "post",
    path: "/projects/propose-schema-version",
    request: {
      body: {
        content: {
          "application/json": {
            schema: crmProjectSchemaProposeVersionInputSchema,
          },
        },
      },
    },
    responses: {
      200: okResponse("The created schema version proposal."),
      ...errorResponse,
    },
    security: [{ Bearer: [] }],
    summary: "Create a new schema version proposal for the project.",
    tags: ["Projects"],
  },
  async (context) => {
    const body = context.req.valid("json")
    const scope = getScope(context)
    const proposal = await proposeProjectSchemaVersion(body, scope)
    return context.json({ data: proposal, ok: true as const }, 200)
  },
)

crmApiApp.doc31("/schema.json", (context) => ({
  openapi: "3.1.0",
  info: {
    title: "CRM REST API",
    version: "1.0.0",
  },
  servers: [
    {
      description: "Current environment",
      url: new URL(context.req.url).origin,
    },
  ],
}))
