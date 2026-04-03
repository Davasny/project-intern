import { AsyncLocalStorage } from "node:async_hooks"

type McpScope = {
  apiKeyId: string
  organizationId: string
}

export const mcpScopeStorage = new AsyncLocalStorage<McpScope>()

export const getMcpScope = (): McpScope => {
  const scope = mcpScopeStorage.getStore()

  if (!scope) {
    throw new Error(
      "MCP scope is not available. This function must be called within an MCP tool handler.",
    )
  }

  return scope
}
