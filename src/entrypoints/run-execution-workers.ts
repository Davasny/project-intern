import { handleTaskExecutorWorkerError } from "@/features/execution/lib/handle-task-executor-worker-error"
import { sweepStaleExecutions } from "@/features/execution/lib/sweep-stale-executions"
import {
  scheduleTaskExecutor,
  taskRetryScanWorker,
  taskSchedulerWorker,
  workspaceMaintenanceWorker,
} from "@/features/execution/queues/schedule-task-executor"
import { taskExecutorWorker } from "@/features/execution/queues/task-executor-worker"
import { taskRetryScanQueue } from "@/features/execution/queues/task-retry-scan-queue"
import { taskSchedulerTickQueue } from "@/features/execution/queues/task-scheduler-tick-queue"
import { workspaceMaintenanceQueue } from "@/features/execution/queues/workspace-maintenance-queue"
import { logger } from "@/lib/logger"

const executionWorkers = [
  {
    name: "scheduleTaskExecutor",
    run: scheduleTaskExecutor,
  },
  {
    name: "taskExecutorWorker",
    run: () => taskExecutorWorker.work(),
  },
]

const stoppableWorkers = [
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
  {
    name: "taskExecutorWorker",
    worker: taskExecutorWorker,
  },
]

let isShuttingDown = false

const stopExecutionWorkers = () => {
  if (isShuttingDown) {
    return
  }

  isShuttingDown = true

  for (const { name, worker } of stoppableWorkers) {
    logger.info({ worker: name }, "stopping worker")
    worker.stop()
  }
}

const registerShutdownHandlers = () => {
  const signals = ["SIGINT", "SIGTERM"] as const

  for (const signal of signals) {
    process.on(signal, () => {
      logger.info({ signal }, "received shutdown signal")
      stopExecutionWorkers()
      process.exit(0)
    })
  }
}

const registerWorkerEventHandlers = () => {
  taskExecutorWorker.on("error", ({ error, job }) => {
    void handleTaskExecutorWorkerError({ error, job }).catch(
      (taskExecutorWorkerError) => {
        logger.error(
          {
            error: taskExecutorWorkerError,
            jobId: job.id,
            jobName: job.name,
          },
          "Failed to map task executor worker error to task record failure",
        )
      },
    )
  })

  for (const { name, worker } of stoppableWorkers) {
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

const runExecutionWorkers = async () => {
  try {
    registerShutdownHandlers()
    registerWorkerEventHandlers()

    const sweepResult = await sweepStaleExecutions()
    logger.info(
      { sweptCount: sweepResult.sweptCount },
      "Completed stale execution sweep on startup",
    )

    logger.info(
      {
        workers: executionWorkers.map((worker) => worker.name),
      },
      "starting execution workers",
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

    await Promise.all(
      executionWorkers.map(async (worker) => {
        logger.info({ worker: worker.name }, "starting worker")
        await worker.run()
      }),
    )
  } catch (error) {
    logger.error({ error }, "failed to start execution workers")
    stopExecutionWorkers()
    process.exit(1)
  }
}

void runExecutionWorkers()
