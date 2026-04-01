import { getPgBosser } from "@/features/execution/lib/get-pg-bosser"
import { runTaskRetryScan } from "@/features/execution/lib/run-task-retry-scan"
import { runTaskSchedulerTick } from "@/features/execution/lib/run-task-scheduler-tick"
import { runWorkspaceMaintenance } from "@/features/execution/lib/run-workspace-maintenance"
import {
  type TaskRetryScanQueuePayload,
  taskRetryScanQueueName,
  taskRetryScanQueuePayloadSchema,
} from "@/features/execution/queues/task-retry-scan-queue"
import {
  type TaskSchedulerTickQueuePayload,
  taskSchedulerTickQueueName,
  taskSchedulerTickQueuePayloadSchema,
} from "@/features/execution/queues/task-scheduler-tick-queue"
import {
  type WorkspaceMaintenanceQueuePayload,
  workspaceMaintenanceQueueName,
  workspaceMaintenanceQueuePayloadSchema,
} from "@/features/execution/queues/workspace-maintenance-queue"

export const scheduleTaskExecutor = async () => {
  const boss = getPgBosser()

  await boss.work<TaskSchedulerTickQueuePayload>(
    taskSchedulerTickQueueName,
    async (jobs) => {
      const job = jobs[0]

      if (!job) {
        return
      }

      const payload = taskSchedulerTickQueuePayloadSchema.parse(job.data)

      await runTaskSchedulerTick({ limit: payload.limit })
    },
  )

  await boss.work<TaskRetryScanQueuePayload>(
    taskRetryScanQueueName,
    async (jobs) => {
      const job = jobs[0]

      if (!job) {
        return
      }

      const payload = taskRetryScanQueuePayloadSchema.parse(job.data)

      await runTaskRetryScan({ limit: payload.limit })
    },
  )

  await boss.work<WorkspaceMaintenanceQueuePayload>(
    workspaceMaintenanceQueueName,
    async (jobs) => {
      const job = jobs[0]

      if (!job) {
        return
      }

      workspaceMaintenanceQueuePayloadSchema.parse(job.data)

      await runWorkspaceMaintenance()
    },
  )
}
