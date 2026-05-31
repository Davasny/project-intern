import type { OpenAPIHono } from "@hono/zod-openapi"
import {
  crmRecordCompleteTaskInputSchema,
  crmRecordCreateInputSchema,
  crmRecordFailTaskInputSchema,
  crmRecordPatchInputSchema,
  crmRecordProposePatchInputSchema,
  crmRecordReadInputSchema,
} from "@/lib/crm/crm-schemas"
import {
  applyRecordPatch,
  completeWorkRecord,
  createRecord,
  failWorkRecord,
  proposeRecordPatch,
  readRecord,
} from "@/lib/crm/crm-service"
import { errorResponse, getScope, okResponse } from "./crm-api-helpers"

export const registerRecordRoutes = (app: OpenAPIHono) => {
  // POST /records/read
  app.openapi(
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
  app.openapi(
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
  app.openapi(
    {
      method: "post",
      path: "/records/apply-patch",
      request: {
        body: {
          content: {
            "application/json": {
              schema: crmRecordPatchInputSchema,
            },
          },
        },
      },
      responses: {
        200: okResponse("The patched record and work record state."),
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
  app.openapi(
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
      summary: "Complete the scoped work record and optionally apply a patch.",
      tags: ["Records"],
    },
    async (context) => {
      const body = context.req.valid("json")
      const scope = getScope(context)
      const completedScope = await completeWorkRecord(body, scope)
      return context.json({ data: completedScope, ok: true as const }, 200)
    },
  )

  // POST /records/fail-task
  app.openapi(
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
      summary: "Fail the scoped work record with a structured failure payload.",
      tags: ["Records"],
    },
    async (context) => {
      const body = context.req.valid("json")
      const scope = getScope(context)
      const failedScope = await failWorkRecord(body, scope)
      return context.json({ data: failedScope, ok: true as const }, 200)
    },
  )

  // POST /records/create
  app.openapi(
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
}
