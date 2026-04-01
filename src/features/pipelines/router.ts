import { z } from "zod"
import { listPipelineDefinitions } from "@/features/pipelines/lib/list-pipeline-definitions"
import { protectedProcedure, router } from "@/lib/trpc/init"

export const pipelinesRouter = router({
  listDefinitions: protectedProcedure
    .input(
      z.object({
        organizationSlug: z.string().trim().min(1),
        projectSlug: z.string().trim().min(1),
      }),
    )
    .query(({ ctx, input }) =>
      listPipelineDefinitions({
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        userId: ctx.session.user.id,
      }),
    ),
})
