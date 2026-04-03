import type { MiddlewareHandler } from "hono"
import { HTTPException } from "hono/http-exception"
import { auth } from "@/features/auth/lib/auth"
import { logger } from "@/lib/logger"

type McpScope = {
  apiKeyId: string
  organizationId: string
}

declare module "hono" {
  interface ContextVariableMap {
    mcpScope: McpScope
  }
}

const extractBearerToken = (
  authorizationHeader: string | undefined,
): string | null => {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null
  }

  return authorizationHeader.slice("Bearer ".length)
}

export const verifyMcpApiKey: MiddlewareHandler = async (context, next) => {
  const token = extractBearerToken(context.req.header("authorization"))

  if (!token) {
    logger.warn(
      { eventFamily: "auth.mcp_call" },
      "Rejected MCP call — missing bearer token",
    )
    throw new HTTPException(401, {
      message: "MCP bearer token is required.",
    })
  }

  const result = await auth.api.verifyApiKey({
    body: {
      configId: "mcp",
      key: token,
    },
  })

  if (!result.valid || !result.key) {
    logger.warn(
      {
        error: result.error?.message,
        eventFamily: "auth.mcp_call",
      },
      "Rejected MCP call — invalid API key",
    )
    throw new HTTPException(401, {
      message: "MCP bearer token is invalid.",
    })
  }

  const scope: McpScope = {
    apiKeyId: result.key.id,
    organizationId: result.key.referenceId,
  }

  context.set("mcpScope", scope)

  logger.info(
    {
      eventFamily: "auth.mcp_call",
      organizationId: scope.organizationId,
    },
    "Accepted MCP API key",
  )

  await next()
}
