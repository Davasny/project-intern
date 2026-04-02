import { z } from "zod"
import { getAgentRunById } from "@/features/agent-runs/lib/get-agent-run-by-id"
import { listAgentRuns } from "@/features/agent-runs/lib/list-agent-runs"
import { protectedProcedure, router } from "@/lib/trpc/init"

const projectScopeSchema = z.object({
  organizationSlug: z.string().trim().min(1),
  projectSlug: z.string().trim().min(1),
})

export const agentRunsRouter = router({
  list: protectedProcedure
    .input(projectScopeSchema)
    .query(async ({ ctx, input }) =>
      listAgentRuns({
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        userId: ctx.session.user.id,
      }),
    ),
  getById: protectedProcedure
    .input(
      projectScopeSchema.extend({
        agentRunId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) =>
      getAgentRunById({
        agentRunId: input.agentRunId,
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        userId: ctx.session.user.id,
      }),
    ),
})
