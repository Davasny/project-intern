import { fetchRequestHandler } from "@trpc/server/adapters/fetch"
import { Hono } from "hono"
import { auth } from "@/features/auth/lib/auth"
import { crmApiApp } from "@/lib/hono/crm-api-app"
import { sessionGuard } from "@/lib/hono/middleware/session-guard"
import { uploadRecordFilesHandler } from "@/lib/hono/routes/upload"
import { logger } from "@/lib/logger"
import { mcpApp } from "@/lib/mcp/mcp-app"
import { createTrpcContext } from "@/lib/trpc/create-context"
import { appRouter } from "@/lib/trpc/router"

export const apiApp = new Hono()

apiApp.get("/api/health", (context) => context.json({ ok: true }))

apiApp.on(["GET", "POST"], "/api/auth/*", (context) =>
  auth.handler(context.req.raw),
)

apiApp.on(["GET", "POST"], "/api/trpc/*", (context) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req: context.req.raw,
    router: appRouter,
    createContext: () =>
      createTrpcContext({ headers: context.req.raw.headers }),
    onError: ({ error, path }) => {
      logger.error(
        {
          error,
          path,
        },
        "tRPC request failed",
      )
    },
  }),
)

apiApp.post(
  "/api/upload/record/:recordId",
  sessionGuard,
  uploadRecordFilesHandler,
)

apiApp.route("/api/mcp", mcpApp)
apiApp.route("/api/crm", crmApiApp)
