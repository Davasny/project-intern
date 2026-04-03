import { StreamableHTTPTransport } from "@hono/mcp"
import { Hono } from "hono"
import { createCrmMcpServer } from "@/lib/mcp/create-crm-mcp-server"
import { mcpScopeStorage } from "@/lib/mcp/mcp-scope-storage"
import { verifyMcpApiKey } from "@/lib/mcp/verify-mcp-api-key"

const transport = new StreamableHTTPTransport()
const server = createCrmMcpServer()

export const mcpApp = new Hono()

mcpApp.use("*", verifyMcpApiKey)

mcpApp.all("/", async (context) => {
  const scope = context.get("mcpScope")

  if (!server.isConnected()) {
    await server.connect(transport)
  }

  return mcpScopeStorage.run(scope, () => transport.handleRequest(context))
})
