import type { OpenAPIHono } from "@hono/zod-openapi"
import {
  createRelationEdge,
  crmRecordCreateRelationEdgeInputSchema,
  crmRecordDeactivateRelationEdgeInputSchema,
  crmRecordGetRelatedInputSchema,
  crmRecordGetRelatedRecordsInputSchema,
  crmRecordListRelationsInputSchema,
  deactivateRelationEdge,
  getRelatedRecord,
  getRelatedRecords,
  listRecordRelations,
} from "@/lib/crm/crm-service"
import { errorResponse, getScope, okResponse } from "./crm-api-helpers"

export const registerRelationRoutes = (app: OpenAPIHono) => {
  // POST /records/list-relations
  app.openapi(
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
  app.openapi(
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
  app.openapi(
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
  app.openapi(
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
  app.openapi(
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
}
