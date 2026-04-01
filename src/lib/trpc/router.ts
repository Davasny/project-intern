import { authRouter } from "@/features/auth/router"
import { organizationsRouter } from "@/features/organizations/router"
import { projectsRouter } from "@/features/projects/router"
import { router } from "@/lib/trpc/init"

export const appRouter = router({
  auth: authRouter,
  organizations: organizationsRouter,
  projects: projectsRouter,
})

export type AppRouter = typeof appRouter
