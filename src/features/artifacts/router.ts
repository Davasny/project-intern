import { z } from "zod"
import { listArtifacts } from "@/features/artifacts/lib/list-artifacts"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { protectedProcedure, router } from "@/lib/trpc/init"

const projectScopeSchema = z.object({
  organizationSlug: z.string().trim().min(1),
  projectSlug: z.string().trim().min(1),
})

export const artifactsRouter = router({
  list: protectedProcedure
    .input(projectScopeSchema.extend({ recordId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const project = await ensureProjectAccess({
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        userId: ctx.session.user.id,
      })

      if (!project) {
        return []
      }

      return listArtifacts({
        projectId: project.id,
        recordId: input.recordId,
      })
    }),
})
