import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { executionQueueService } from "@/features/execution/lib/execution-queue-service"
import { getExecutionMonitorReadModel } from "@/features/execution/lib/get-execution-monitor-read-model"
import { updateProjectAutopick } from "@/features/execution/lib/update-project-autopick"
import { createActivityLogEvent } from "@/features/observability/lib/create-activity-log-event"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { launchTaskRecordExecution } from "@/features/task-records/lib/launch-task-record-execution"
import { backendConfig } from "@/lib/config/backend"
import { db } from "@/lib/db"
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

      const claimedTaskRecord = await launchTaskRecordExecution({
        projectId: project.id,
        taskRecordId: input.taskRecordId,
      })

      if (!claimedTaskRecord) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Task record is not eligible for manual triggering.",
        })
      }

      await createActivityLogEvent({
        actorId: claimedTaskRecord.agentRunId,
        actorType: "executor",
        agentRunId: claimedTaskRecord.agentRunId,
        database: db,
        entityId: claimedTaskRecord.taskRecordId,
        entityType: "taskRecord",
        eventType: "taskRecord.claimed",
        organizationId: claimedTaskRecord.organizationId,
        payload: {
          manualTrigger: true,
          recordId: claimedTaskRecord.recordId,
          taskId: claimedTaskRecord.taskId,
        },
        projectId: claimedTaskRecord.projectId,
        recordId: claimedTaskRecord.recordId,
        relatedProjectId: null,
        relatedRecordId: null,
        taskId: claimedTaskRecord.taskId,
        taskRecordId: claimedTaskRecord.taskRecordId,
      })

      logger.info(claimedTaskRecord, "Claimed task record for manual trigger")

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
