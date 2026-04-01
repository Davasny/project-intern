import { fetchRequestHandler } from "@trpc/server/adapters/fetch"
import { Hono } from "hono"
import { auth } from "@/features/auth/lib/auth"
import { logger } from "@/lib/logger"
import { mcpApp } from "@/lib/mcp/mcp-app"
import { createTrpcContext } from "@/lib/trpc/create-context"
import { appRouter } from "@/lib/trpc/router"

export const apiApp = new Hono().basePath("/api")

apiApp.get("/health", (context) => context.json({ ok: true }))

apiApp.on(["GET", "POST"], "/auth/*", (context) =>
  auth.handler(context.req.raw),
)

apiApp.on(["GET", "POST"], "/trpc/*", (context) =>
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

apiApp.route("/mcp", mcpApp)
