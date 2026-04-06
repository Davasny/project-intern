import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { abortAgentRunCommand } from "@/features/agent-runs/lib/agent-run-commands"
import { getAgentRunById } from "@/features/agent-runs/lib/get-agent-run-by-id"
import { getAgentRunSessionMessages } from "@/features/agent-runs/lib/get-agent-run-session-messages"
import { listAgentRuns } from "@/features/agent-runs/lib/list-agent-runs"
import { isAgentRunStateActive } from "@/features/agent-runs/schemas/agent-run-state"
import { withOpencodeForOrg } from "@/features/opencode/lib/get-opencode-client"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
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
  getSessionMessages: protectedProcedure
    .input(
      projectScopeSchema.extend({
        agentRunId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const project = await ensureProjectAccess({
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        userId: ctx.session.user.id,
      })

      if (!project) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this project.",
        })
      }

      return withOpencodeForOrg({
        fn: async ({ client }) =>
          getAgentRunSessionMessages({
            agentRunId: input.agentRunId,
            client,
            organizationSlug: input.organizationSlug,
            projectSlug: input.projectSlug,
            userId: ctx.session.user.id,
          }),
        organizationId: project.organizationId,
      })
    }),
  abort: protectedProcedure
    .input(
      projectScopeSchema.extend({
        agentRunId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ensureProjectAccess({
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        userId: ctx.session.user.id,
      })

      if (!project) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this project.",
        })
      }

      const run = await getAgentRunById({
        agentRunId: input.agentRunId,
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        userId: ctx.session.user.id,
      })

      if (!isAgentRunStateActive(run.state)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Agent run is in "${run.state}" state and cannot be aborted.`,
        })
      }

      await abortAgentRunCommand({
        agentRunId: input.agentRunId,
        failurePayload: { stoppedByUser: true },
        taskRecordId: run.taskRecordId,
        toolActivitySummary: run.taskActivitySummary ?? {},
      })

      return { success: true }
    }),
})
