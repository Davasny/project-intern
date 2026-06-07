import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { getInternRunAttemptByAnchorRunId } from "@/features/intern-runs/lib/get-intern-run-attempt-by-anchor-run-id"
import { getInternRunById } from "@/features/intern-runs/lib/get-intern-run-by-id"
import { getInternRunSessionMessages } from "@/features/intern-runs/lib/get-intern-run-session-messages"
import { abortInternRunCommand } from "@/features/intern-runs/lib/intern-run-commands"
import { listInternRuns } from "@/features/intern-runs/lib/list-intern-runs"
import { refreshInternRunStats } from "@/features/intern-runs/lib/refresh-intern-run-stats"
import { refreshMissingInternRunStats } from "@/features/intern-runs/lib/refresh-missing-intern-run-stats"
import { isInternRunStateActive } from "@/features/intern-runs/schemas/intern-run-state"
import { withOpencodeForOrg } from "@/features/opencode/lib/get-opencode-client"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { protectedProcedure, router } from "@/lib/trpc/init"

const projectScopeSchema = z.object({
  organizationSlug: z.string().trim().min(1),
  projectSlug: z.string().trim().min(1),
})

export const internRunsRouter = router({
  list: protectedProcedure
    .input(projectScopeSchema)
    .query(async ({ ctx, input }) =>
      listInternRuns({
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        userId: ctx.session.user.id,
      }),
    ),
  getById: protectedProcedure
    .input(
      projectScopeSchema.extend({
        internRunId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) =>
      getInternRunById({
        internRunId: input.internRunId,
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        userId: ctx.session.user.id,
      }),
    ),
  getAttempt: protectedProcedure
    .input(
      projectScopeSchema.extend({
        internRunId: z.string().uuid(),
        attemptNumber: z.number().int().positive(),
      }),
    )
    .query(async ({ ctx, input }) =>
      getInternRunAttemptByAnchorRunId({
        internRunId: input.internRunId,
        attemptNumber: input.attemptNumber,
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        userId: ctx.session.user.id,
      }),
    ),
  getSessionMessages: protectedProcedure
    .input(
      projectScopeSchema.extend({
        internRunId: z.string().uuid(),
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
          getInternRunSessionMessages({
            internRunId: input.internRunId,
            client,
            organizationSlug: input.organizationSlug,
            projectSlug: input.projectSlug,
            userId: ctx.session.user.id,
          }),
        organizationId: project.organizationId,
        projectId: project.id,
        runtimeTemperature: null,
      })
    }),
  abort: protectedProcedure
    .input(
      projectScopeSchema.extend({
        internRunId: z.string().uuid(),
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

      const run = await getInternRunById({
        internRunId: input.internRunId,
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        userId: ctx.session.user.id,
      })

      if (!isInternRunStateActive(run.state)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Intern run is in "${run.state}" state and cannot be aborted.`,
        })
      }

      await abortInternRunCommand({
        internRunId: input.internRunId,
        failurePayload: { stoppedByUser: true },
        workRecordId: run.workRecordId,
        toolActivitySummary: run.taskActivitySummary ?? {},
      })

      return { success: true }
    }),
  refreshMissingStats: protectedProcedure
    .input(projectScopeSchema)
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

      return withOpencodeForOrg({
        fn: async ({ client }) =>
          refreshMissingInternRunStats({
            client,
            projectId: project.id,
          }),
        organizationId: project.organizationId,
        projectId: project.id,
        runtimeTemperature: null,
      })
    }),
  refreshRunStats: protectedProcedure
    .input(
      projectScopeSchema.extend({
        internRunId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) =>
      refreshInternRunStats({
        internRunId: input.internRunId,
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        userId: ctx.session.user.id,
      }),
    ),
})
