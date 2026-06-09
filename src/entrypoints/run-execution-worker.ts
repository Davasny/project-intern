import { createTaskExecutorWorker } from "@/features/execution/queues/create-task-executor-worker"
import { logger } from "@/lib/logger"

let isShuttingDown = false
let activeJobPromise: Promise<void> | null = null
let resolveActiveJob: (() => void) | null = null

const lifecycle = {
  onJobFinished: () => {
    resolveActiveJob?.()
    activeJobPromise = null
    resolveActiveJob = null
  },
  onJobStarted: () => {
    activeJobPromise = new Promise<void>((resolve) => {
      resolveActiveJob = resolve
    })
  },
}

const taskExecutorWorker = createTaskExecutorWorker({
  lifecycle,
  workerName: "taskExecutorWorker",
})

const stopExecutionWorker = async () => {
  if (isShuttingDown) {
    return
  }

  isShuttingDown = true
  logger.info("stopping task executor worker")

  await taskExecutorWorker.stop()

  const activeJob = activeJobPromise

  if (activeJob) {
    logger.info("waiting for active task executor job")
    await activeJob
  }
}

const registerShutdownHandlers = () => {
  const signals: readonly NodeJS.Signals[] = ["SIGINT", "SIGTERM"]

  for (const signal of signals) {
    process.on(signal, () => {
      logger.info({ signal }, "received shutdown signal")
      void stopExecutionWorker().then(() => process.exit(0))
    })
  }
}

const registerWorkerEventHandlers = () => {
  const childLogger = logger.child({ worker: "taskExecutorWorker" })

  taskExecutorWorker.on("ready", () => {
    childLogger.info("worker is ready")
  })

  taskExecutorWorker.on("done", ({ job }) => {
    childLogger.info(
      {
        jobId: job.id,
        jobName: job.name,
      },
      "worker completed job",
    )
  })

  taskExecutorWorker.on("error", ({ error, job }) => {
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

const runExecutionWorker = async () => {
  try {
    registerShutdownHandlers()
    registerWorkerEventHandlers()

    logger.info("starting task executor worker")
    await taskExecutorWorker.work()
  } catch (error) {
    logger.error({ error }, "failed to start task executor worker")
    await stopExecutionWorker()
    process.exit(1)
  }
}

void runExecutionWorker()
