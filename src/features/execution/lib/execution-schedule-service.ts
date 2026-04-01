import { taskExecutorQueue } from "@/features/execution/queues/task-executor-queue"
import {
  type TaskRetryScanQueuePayload,
  taskRetryScanQueue,
} from "@/features/execution/queues/task-retry-scan-queue"
import {
  type TaskSchedulerTickQueuePayload,
  taskSchedulerTickQueue,
} from "@/features/execution/queues/task-scheduler-tick-queue"
import {
  type WorkspaceMaintenanceQueuePayload,
  workspaceMaintenanceQueue,
} from "@/features/execution/queues/workspace-maintenance-queue"

export const executionScheduleService = {
  registerSchedules: async () => {
    await taskExecutorQueue.getBoss()
    await taskSchedulerTickQueue.schedule("*/1 * * * *", {
      limit: 10,
    } satisfies TaskSchedulerTickQueuePayload)
    await taskRetryScanQueue.schedule("*/5 * * * *", {
      limit: 10,
    } satisfies TaskRetryScanQueuePayload)
    await workspaceMaintenanceQueue.schedule("0 */6 * * *", {
      projectId: null,
    } satisfies WorkspaceMaintenanceQueuePayload)
  },
}
