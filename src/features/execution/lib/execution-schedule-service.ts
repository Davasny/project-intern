import { getPgBosser } from "@/features/execution/lib/get-pg-bosser"
import { taskExecutorQueueName } from "@/features/execution/queues/task-executor-queue"
import { taskRetryScanQueueName } from "@/features/execution/queues/task-retry-scan-queue"
import { taskSchedulerTickQueueName } from "@/features/execution/queues/task-scheduler-tick-queue"
import { workspaceMaintenanceQueueName } from "@/features/execution/queues/workspace-maintenance-queue"

export const executionScheduleService = {
  registerSchedules: async () => {
    const boss = getPgBosser()

    await boss.createQueue(taskExecutorQueueName)
    await boss.createQueue(taskSchedulerTickQueueName)
    await boss.createQueue(taskRetryScanQueueName)
    await boss.createQueue(workspaceMaintenanceQueueName)
    await boss.schedule(taskSchedulerTickQueueName, "*/1 * * * *", {
      limit: 10,
    })
    await boss.schedule(taskRetryScanQueueName, "*/5 * * * *", { limit: 10 })
    await boss.schedule(workspaceMaintenanceQueueName, "0 */6 * * *", {
      projectId: null,
    })
  },
}
