import type PgBoss from "pg-boss"
import { failAgentRun } from "@/features/agent-runs/lib/fail-agent-run"
import { createTaskFailureFromError } from "@/features/execution/lib/create-task-failure-from-error"
import { taskExecutorQueuePayloadSchema } from "@/features/execution/queues/task-executor-queue"
import { logger } from "@/lib/logger"

type HandleTaskExecutorWorkerErrorParams = {
  error: unknown
  job: PgBoss.Job<unknown>
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
      "Task executor worker error could not be mapped to task record payload",
    )

    return
  }

  const failure = createTaskFailureFromError(error)

  await failAgentRun({
    agentRunId: payloadResult.data.agentRunId,
    costUsd: null,
    errorCode: failure.code,
    failurePayload: failure,
    latencyMs: null,
    taskRecordId: payloadResult.data.taskRecordId,
    tokenInput: null,
    tokenOutput: null,
    toolActivitySummary: {},
  })

  logger.warn(
    {
      agentRunId: payloadResult.data.agentRunId,
      error,
      errorCode: failure.code,
      jobId: job.id,
      jobName: job.name,
      taskRecordId: payloadResult.data.taskRecordId,
    },
    "Mapped task executor worker error to failed agent run",
  )
}
