import { OpenAPIHono } from "@hono/zod-openapi"
import { verifyMcpApiKey } from "@/lib/mcp/verify-mcp-api-key"
import { registerProjectRoutes } from "./crm-routes-projects"
import { registerRecordRoutes } from "./crm-routes-records"
import { registerRelationRoutes } from "./crm-routes-relations"

export const crmApiApp = new OpenAPIHono()

crmApiApp.openAPIRegistry.registerComponent("securitySchemes", "Bearer", {
  scheme: "bearer",
  type: "http",
})

crmApiApp.use((context, next) => {
  const url = new URL(context.req.url)
  if (url.pathname.endsWith("/schema.json")) return next()
  return verifyMcpApiKey(context, next)
})

registerProjectRoutes(crmApiApp)
registerRecordRoutes(crmApiApp)
registerRelationRoutes(crmApiApp)

crmApiApp.doc31("/schema.json", (context) => ({
  openapi: "3.1.0",
  info: {
    title: "CRM REST API",
    version: "1.0.0",
  },
  servers: [
    {
      description: "Current environment",
      url: new URL(context.req.url).origin,
    },
  ],
}))
