import { executionScheduleService } from "@/features/execution/lib/execution-schedule-service"
import { getPgBosser } from "@/features/execution/lib/get-pg-bosser"
import { scheduleTaskExecutor } from "@/features/execution/queues/schedule-task-executor"
import { taskExecutorWorker } from "@/features/execution/queues/task-executor-worker"

const runExecutionWorkers = async () => {
  const boss = getPgBosser()

  await boss.start()
  await executionScheduleService.registerSchedules()
  await scheduleTaskExecutor()
  await taskExecutorWorker()
}

void runExecutionWorkers()
