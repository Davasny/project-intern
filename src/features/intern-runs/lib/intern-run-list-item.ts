import type { inferRouterOutputs } from "@trpc/server"
import type { AppRouter } from "@/lib/trpc/router"

export type InternRunListItem =
  inferRouterOutputs<AppRouter>["internRuns"]["list"][number]
