import { auth } from "@/features/auth/lib/auth"
import { ensureSystemUserForOrg } from "@/features/auth/utils/ensure-system-user-for-org"
import { logger } from "@/lib/logger"

type CreateOrgMcpApiKeyParams = {
  organizationId: string
}

export const createOrgMcpApiKey = async ({
  organizationId,
}: CreateOrgMcpApiKeyParams) => {
  // @see https://github.com/better-auth/better-auth/issues/8778
  const { systemUserId } = await ensureSystemUserForOrg({ organizationId })

  logger.debug({
    msg: "Creating MCP API key for organization",
    organizationId,
    systemUserId,
  })

  try {
    const result = await auth.api.createApiKey({
      body: {
        configId: "mcp",
        name: "mcp-key",
        organizationId: organizationId,
        rateLimitEnabled: false,
        userId: systemUserId,
      },
    })

    logger.info({
      msg: "Created MCP API key for organization",
      apiKeyId: result.id,
      expiresAt: result.expiresAt?.toISOString(),
      organizationId,
    })

    return {
      apiKeyId: result.id,
      expiresAt: result.expiresAt,
      key: result.key,
      name: result.name,
      organizationId,
    }
  } catch (error) {
    logger.error({
      msg: "Better auth MCP API key creation failed",
      error,
    })

    throw new Error("Failed to create MCP API key for organization.", {
      cause: error,
    })
  }
}
