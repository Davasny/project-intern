import { authRouter } from "@/features/auth/router"
import { organizationsRouter } from "@/features/organizations/router"
import { projectSchemaRouter } from "@/features/project-schema/router"
import { projectsRouter } from "@/features/projects/router"
import { recordsRouter } from "@/features/records/router"
import { router } from "@/lib/trpc/init"

export const appRouter = router({
  auth: authRouter,
  organizations: organizationsRouter,
  projectSchema: projectSchemaRouter,
  projects: projectsRouter,
  records: recordsRouter,
})

export type AppRouter = typeof appRouter
