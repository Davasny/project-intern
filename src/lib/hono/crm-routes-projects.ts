import type { OpenAPIHono } from "@hono/zod-openapi"
import {
  crmProjectListInputSchema,
  crmProjectSchemaProposeVersionInputSchema,
  crmRecordReadInputSchema,
} from "@/lib/crm/crm-schemas"
import {
  listProjects,
  proposeProjectSchemaVersion,
  readProjectSchema,
} from "@/lib/crm/crm-service"
import { errorResponse, getScope, okResponse } from "./crm-api-helpers"

export const registerProjectRoutes = (app: OpenAPIHono) => {
  // POST /projects/list
  app.openapi(
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

  // POST /projects/read-schema
  app.openapi(
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
  app.openapi(
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
}
