import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { claimTaskRecordForManualTrigger } from "@/features/execution/lib/claim-task-record-for-manual-trigger"
import { executionQueueService } from "@/features/execution/lib/execution-queue-service"
import { getExecutionMonitorReadModel } from "@/features/execution/lib/get-execution-monitor-read-model"
import { updateProjectAutopick } from "@/features/execution/lib/update-project-autopick"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { backendConfig } from "@/lib/config/backend"
import { protectedProcedure, router } from "@/lib/trpc/init"

const projectScopeSchema = z.object({
  organizationSlug: z.string().trim().min(1),
  projectSlug: z.string().trim().min(1),
})

const assertDevelopmentMode = () => {
  if (!backendConfig.IS_DEVELOPMENT) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Debug execution controls are available only in development.",
    })
  }
}

export const executionRouter = router({
  getMonitor: protectedProcedure
    .input(projectScopeSchema)
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

      const readModel = await getExecutionMonitorReadModel({
        projectId: project.id,
      })

      if (!readModel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Execution monitor could not be loaded.",
        })
      }

      return {
        ...readModel,
        debugControlsEnabled: backendConfig.IS_DEVELOPMENT,
      }
    }),
  triggerTaskRecord: protectedProcedure
    .input(projectScopeSchema.extend({ taskRecordId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      assertDevelopmentMode()

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

      const claimedTaskRecord = await claimTaskRecordForManualTrigger({
        projectId: project.id,
        taskRecordId: input.taskRecordId,
      })

      if (!claimedTaskRecord) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Task record is not eligible for manual triggering.",
        })
      }

      const jobId = await executionQueueService.enqueueTaskRecordExecution({
        agentRunId: claimedTaskRecord.agentRunId,
        taskRecordId: claimedTaskRecord.taskRecordId,
      })

      if (jobId === null) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Manual trigger could not enqueue execution.",
        })
      }

      return { ...claimedTaskRecord, jobId }
    }),
  updateAutopick: protectedProcedure
    .input(projectScopeSchema.extend({ isAutopickEnabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      assertDevelopmentMode()

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

      return updateProjectAutopick({
        isAutopickEnabled: input.isAutopickEnabled,
        projectId: project.id,
      })
    }),
})
