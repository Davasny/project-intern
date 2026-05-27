import { z } from "@hono/zod-openapi"
import type { Context } from "hono"
import type { CrmScope } from "@/lib/crm/types"

export const envelopeSchema = z.object({
  data: z.unknown().nullable(),
  ok: z.boolean(),
})

export const errorResponse = {
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

export const okResponse = (data: unknown) => ({
  content: {
    "application/json": {
      schema: envelopeSchema,
    },
  },
  description: data as string,
})

type CrmContext = Context<{
  Variables: { mcpScope: { apiKeyId: string; organizationId: string } }
}>

export const getScope = (c: CrmContext): CrmScope => {
  const mcpScope = c.get("mcpScope")
  return {
    apiKeyId: mcpScope.apiKeyId,
    organizationId: mcpScope.organizationId,
  }
}
