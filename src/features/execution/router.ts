import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { releaseClaimedWorkRecord } from "@/features/execution/lib/execution-claim-service"
import { executionLogger } from "@/features/execution/lib/execution-logger"
import { executionQueueService } from "@/features/execution/lib/execution-queue-service"
import { getExecutionMonitorReadModel } from "@/features/execution/lib/get-execution-monitor-read-model"
import { updateProjectAutopick } from "@/features/execution/lib/update-project-autopick"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { launchWorkRecordExecution } from "@/features/work-records/lib/launch-work-record-execution"
import { backendConfig } from "@/lib/config/backend"
import { logger } from "@/lib/logger"
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
  triggerWorkRecord: protectedProcedure
    .input(projectScopeSchema.extend({ workRecordId: z.string().uuid() }))
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

      const claimedWorkRecord = await launchWorkRecordExecution({
        projectId: project.id,
        workRecordId: input.workRecordId,
      })

      if (!claimedWorkRecord) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Work record is not eligible for manual triggering.",
        })
      }

      logger.info(claimedWorkRecord, "Claimed work record for manual trigger")

      const jobId = await executionQueueService.enqueueWorkRecordExecution({
        internRunId: claimedWorkRecord.internRunId,
        workRecordId: claimedWorkRecord.workRecordId,
      })

      if (jobId === null) {
        executionLogger.error(
          {
            internRunId: claimedWorkRecord.internRunId,
            requestedBy: "manual",
            workRecordId: claimedWorkRecord.workRecordId,
          },
          "Failed to enqueue claimed work record",
        )

        await releaseClaimedWorkRecord({
          internRunId: claimedWorkRecord.internRunId,
          reason: "ENQUEUE_FAILED",
          workRecordId: claimedWorkRecord.workRecordId,
        })

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Manual trigger could not enqueue execution.",
        })
      }

      executionLogger.info(
        {
          internRunId: claimedWorkRecord.internRunId,
          jobId,
          requestedBy: "manual",
          workRecordId: claimedWorkRecord.workRecordId,
        },
        "Enqueued claimed work record",
      )

      return { ...claimedWorkRecord, jobId }
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
