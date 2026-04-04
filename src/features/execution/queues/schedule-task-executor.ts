import { Worker } from "pg-bosser"
import { runTaskSchedulerTick } from "@/features/execution/lib/run-task-scheduler-tick"
import { runWorkspaceMaintenance } from "@/features/execution/lib/run-workspace-maintenance"
import {
  taskSchedulerTickQueue,
  taskSchedulerTickQueuePayloadSchema,
} from "@/features/execution/queues/task-scheduler-tick-queue"
import {
  workspaceMaintenanceQueue,
  workspaceMaintenanceQueuePayloadSchema,
} from "@/features/execution/queues/workspace-maintenance-queue"
import { logger } from "@/lib/logger"

export const taskSchedulerWorker = new Worker(
  taskSchedulerTickQueue,
  async (job) => {
    const payload = taskSchedulerTickQueuePayloadSchema.parse(job.data)
    const childLogger = logger.child({
      worker: "taskSchedulerWorker",
      queue: taskSchedulerTickQueue.queueName,
      jobId: job.id,
      jobName: job.name,
      limit: payload.limit,
    })

    childLogger.info("processing task scheduler tick job")

    await runTaskSchedulerTick({ limit: payload.limit })

    childLogger.info("completed task scheduler tick job")
  },
)

export const workspaceMaintenanceWorker = new Worker(
  workspaceMaintenanceQueue,
  async (job) => {
    const payload = workspaceMaintenanceQueuePayloadSchema.parse(job.data)
    const childLogger = logger.child({
      worker: "workspaceMaintenanceWorker",
      queue: workspaceMaintenanceQueue.queueName,
      jobId: job.id,
      jobName: job.name,
      projectId: payload.projectId,
    })

    childLogger.info("processing workspace maintenance job")

    await runWorkspaceMaintenance()

    childLogger.info("completed workspace maintenance job")
  },
)

export const scheduleTaskExecutor = async () => {
  await Promise.all([
    taskSchedulerWorker.work(),
    workspaceMaintenanceWorker.work(),
  ])
}
