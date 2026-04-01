import { artifactsRouter } from "@/features/artifacts/router"
import { authRouter } from "@/features/auth/router"
import { executionRouter } from "@/features/execution/router"
import { filesRouter } from "@/features/files/router"
import { observabilityRouter } from "@/features/observability/router"
import { organizationsRouter } from "@/features/organizations/router"
import { pipelinesRouter } from "@/features/pipelines/router"
import { projectSchemaRouter } from "@/features/project-schema/router"
import { projectsRouter } from "@/features/projects/router"
import { recordEdgesRouter } from "@/features/record-edges/router"
import { recordsRouter } from "@/features/records/router"
import { tasksRouter } from "@/features/tasks/router"
import { router } from "@/lib/trpc/init"

export const appRouter = router({
  artifacts: artifactsRouter,
  auth: authRouter,
  execution: executionRouter,
  files: filesRouter,
  observability: observabilityRouter,
  organizations: organizationsRouter,
  pipelines: pipelinesRouter,
  projectSchema: projectSchemaRouter,
  projects: projectsRouter,
  records: recordsRouter,
  recordEdges: recordEdgesRouter,
  tasks: tasksRouter,
})

export type AppRouter = typeof appRouter
