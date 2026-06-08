import type { Job } from "pg-bosser"
import { createTaskFailureFromError } from "@/features/execution/lib/create-task-failure-from-error"
import { taskExecutorQueuePayloadSchema } from "@/features/execution/queues/task-executor-queue"
import { failInternRunCommand } from "@/features/intern-runs/lib/intern-run-commands"
import { logger } from "@/lib/logger"

type HandleTaskExecutorWorkerErrorParams = {
  error: unknown
  job: Job<unknown>
}

export const handleTaskExecutorWorkerError = async ({
  error,
  job,
}: HandleTaskExecutorWorkerErrorParams) => {
  const payloadResult = taskExecutorQueuePayloadSchema.safeParse(job.data)

  if (!payloadResult.success) {
    logger.error(
      {
        error,
        jobId: job.id,
        jobName: job.name,
        payloadError: payloadResult.error.flatten(),
      },
      "Task executor worker error could not be mapped to work record payload",
    )

    return
  }

  const failure = createTaskFailureFromError(error)

  await failInternRunCommand({
    internRunId: payloadResult.data.internRunId,
    cachedInputTokens: null,
    cacheWriteTokens: null,
    costUsd: null,
    errorCode: failure.code,
    failurePayload: failure,
    latencyMs: null,
    workRecordId: payloadResult.data.workRecordId,
    tokenInput: null,
    tokenOutput: null,
    toolActivitySummary: {},
  })

  logger.warn(
    {
      internRunId: payloadResult.data.internRunId,
      error,
      errorCode: failure.code,
      jobId: job.id,
      jobName: job.name,
      workRecordId: payloadResult.data.workRecordId,
    },
    "Mapped task executor worker error to failed intern run",
  )
}
