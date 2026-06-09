import { reconcileExecutions } from "@/features/execution/lib/execution-reconciler"
import { sweepStaleExecutions } from "@/features/execution/lib/sweep-stale-executions"
import {
  scheduleTaskExecutor,
  taskRetryScanWorker,
  taskSchedulerWorker,
  workspaceMaintenanceWorker,
} from "@/features/execution/queues/schedule-task-executor"
import { taskRetryScanQueue } from "@/features/execution/queues/task-retry-scan-queue"
import { taskSchedulerTickQueue } from "@/features/execution/queues/task-scheduler-tick-queue"
import { workspaceMaintenanceQueue } from "@/features/execution/queues/workspace-maintenance-queue"
import { logger } from "@/lib/logger"

const schedulerWorkers = [
  {
    name: "taskSchedulerWorker",
    worker: taskSchedulerWorker,
  },
  {
    name: "workspaceMaintenanceWorker",
    worker: workspaceMaintenanceWorker,
  },
  {
    name: "taskRetryScanWorker",
    worker: taskRetryScanWorker,
  },
]

let isShuttingDown = false

const stopExecutionScheduler = async () => {
  if (isShuttingDown) {
    return
  }

  isShuttingDown = true

  const drainTimeoutMs = 30_000
  await Promise.race([
    Promise.all(
      schedulerWorkers.map(async ({ name, worker }) => {
        logger.info({ worker: name }, "stopping worker")
        await worker.stop()
      }),
    ),
    new Promise<void>((resolve) => setTimeout(resolve, drainTimeoutMs)),
  ])
}

const registerShutdownHandlers = () => {
  const signals: readonly NodeJS.Signals[] = ["SIGINT", "SIGTERM"]

  for (const signal of signals) {
    process.on(signal, () => {
      logger.info({ signal }, "received shutdown signal")
      void stopExecutionScheduler().then(() => process.exit(0))
    })
  }
}

const registerWorkerEventHandlers = () => {
  for (const { name, worker } of schedulerWorkers) {
    const childLogger = logger.child({ worker: name })

    worker.on("ready", () => {
      childLogger.info("worker is ready")
    })

    worker.on("done", ({ job }) => {
      childLogger.info(
        {
          jobId: job.id,
          jobName: job.name,
        },
        "worker completed job",
      )
    })

    worker.on("error", ({ error, job }) => {
      childLogger.error(
        {
          error,
          jobId: job.id,
          jobName: job.name,
        },
        "worker failed job",
      )
    })
  }
}

const runExecutionScheduler = async () => {
  try {
    registerShutdownHandlers()
    registerWorkerEventHandlers()

    const sweepResult = await sweepStaleExecutions()
    logger.info(
      { sweptCount: sweepResult.sweptCount },
      "Completed stale execution sweep on startup",
    )

    const reconcileResult = await reconcileExecutions({ limit: 25 })
    logger.info(
      {
        recoveredCount: reconcileResult.recoveredCount,
        skippedCount: reconcileResult.skippedCount,
      },
      "Completed execution reconciliation on startup",
    )

    logger.info(
      {
        workers: schedulerWorkers.map((worker) => worker.name),
      },
      "starting execution scheduler",
    )

    await taskSchedulerTickQueue.schedule("*/1 * * * *", {
      limit: 10,
    })

    await taskRetryScanQueue.schedule("*/5 * * * *", {
      limit: 10,
    })

    await workspaceMaintenanceQueue.schedule("0 */6 * * *", {
      projectId: null,
    })

    await scheduleTaskExecutor()
  } catch (error) {
    logger.error({ error }, "failed to start execution scheduler")
    await stopExecutionScheduler()
    process.exit(1)
  }
}

void runExecutionScheduler()
