import { StreamableHTTPTransport } from "@hono/mcp"
import { Hono } from "hono"
import { assertMcpBearerToken } from "@/lib/mcp/assert-mcp-bearer-token"
import { createCrmMcpServer } from "@/lib/mcp/create-crm-mcp-server"

const transport = new StreamableHTTPTransport()
const server = createCrmMcpServer()

export const mcpApp = new Hono()

mcpApp.use("*", async (context, next) => {
  assertMcpBearerToken({
    authorizationHeader: context.req.header("authorization"),
  })

  await next()
})

mcpApp.all("/", async (context) => {
  if (!server.isConnected()) {
    await server.connect(transport)
  }

  return transport.handleRequest(context)
})
