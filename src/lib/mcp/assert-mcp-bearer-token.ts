import { HTTPException } from "hono/http-exception"
import { backendConfig } from "@/lib/config/backend"
import { logger } from "@/lib/logger"

type AssertMcpBearerTokenParams = {
  authorizationHeader: string | undefined
}

export const assertMcpBearerToken = ({
  authorizationHeader,
}: AssertMcpBearerTokenParams) => {
  const bearerToken = authorizationHeader?.startsWith("Bearer ")
    ? authorizationHeader.slice("Bearer ".length)
    : null

  if (bearerToken !== backendConfig.CRM_MCP_TOKEN) {
    logger.warn({ eventFamily: "auth.mcp_call" }, "Rejected MCP bearer token")
    throw new HTTPException(401, {
      message: "MCP bearer token is invalid.",
    })
  }

  logger.info({ eventFamily: "auth.mcp_call" }, "Accepted MCP bearer token")
}
