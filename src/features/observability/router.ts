import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { listProjectActivityLogEvents } from "@/features/observability/lib/list-project-activity-log-events"
import { protectedProcedure, router } from "@/lib/trpc/init"

const projectScopeSchema = z.object({
  organizationSlug: z.string().trim().min(1),
  projectSlug: z.string().trim().min(1),
})

export const observabilityRouter = router({
  listActivityLogEvents: protectedProcedure
    .input(projectScopeSchema)
    .query(async ({ ctx, input }) => {
      const events = await listProjectActivityLogEvents({
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        userId: ctx.session.user.id,
      })

      if (!events) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this project.",
        })
      }

      return events
    }),
})
