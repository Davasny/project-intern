import { executionScheduleService } from "@/features/execution/lib/execution-schedule-service"
import {
  scheduleTaskExecutor,
  taskRetryScanWorker,
  taskSchedulerWorker,
  workspaceMaintenanceWorker,
} from "@/features/execution/queues/schedule-task-executor"
import { taskExecutorWorker } from "@/features/execution/queues/task-executor-worker"
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
    name: "taskRetryScanWorker",
    worker: taskRetryScanWorker,
  },
  {
    name: "workspaceMaintenanceWorker",
    worker: workspaceMaintenanceWorker,
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

    logger.info(
      {
        workers: executionWorkers.map((worker) => worker.name),
      },
      "starting execution workers",
    )

    await executionScheduleService.registerSchedules()

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
