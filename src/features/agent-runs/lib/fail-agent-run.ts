import { eq } from "drizzle-orm"
import { agentRunTable } from "@/features/agent-runs/db"
import { getAgentRunActor } from "@/features/agent-runs/lib/get-agent-run-actor"
import { getToolCallCount } from "@/features/agent-runs/lib/get-tool-call-count"
import { createActivityLogEvent } from "@/features/observability/lib/create-activity-log-event"
import { getAgentRunActivityScope } from "@/features/observability/lib/get-agent-run-activity-scope"
import { failTaskRecord } from "@/features/task-records/lib/fail-task-record"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type FailAgentRunParams = {
  agentRunId: string
  costUsd: string | null
  errorCode: string
  failurePayload: Record<string, unknown>
  latencyMs: number | null
  taskRecordId: string
  tokenInput: number | null
  tokenOutput: number | null
  toolActivitySummary: Record<string, unknown>
}

export const failAgentRun = async ({
  agentRunId,
  costUsd,
  errorCode,
  failurePayload,
  latencyMs,
  taskRecordId,
  tokenInput,
  tokenOutput,
  toolActivitySummary,
}: FailAgentRunParams) => {
  const actor = await getAgentRunActor(agentRunId)
  await actor.send("fail")
  const finishedAt = new Date()

  await db
    .update(agentRunTable)
    .set({
      costUsd,
      estimatedCostUsd: costUsd,
      failurePayload,
      finishedAt,
      inputTokens: tokenInput,
      latencyMs,
      outputTokens: tokenOutput,
      tokenInput,
      tokenOutput,
      toolActivitySummary,
      toolCallCount: getToolCallCount(toolActivitySummary),
      toolSummary: toolActivitySummary,
    })
    .where(eq(agentRunTable.id, agentRunId))
  await failTaskRecord({ agentRunId, errorCode, taskRecordId })

  const activityScope = await getAgentRunActivityScope(agentRunId)

  await createActivityLogEvent({
    actorId: agentRunId,
    actorType: "executor",
    agentRunId,
    entityId: agentRunId,
    entityType: "agentRun",
    eventType: "agentRun.failed",
    organizationId: activityScope.organizationId,
    payload: {
      attemptNumber: activityScope.attemptNumber,
      errorCode,
      failurePayload,
      finishedAt,
      latencyMs,
    },
    projectId: activityScope.projectId,
    recordId: activityScope.recordId,
    relatedProjectId: null,
    relatedRecordId: null,
    taskId: activityScope.taskId,
    taskRecordId: activityScope.taskRecordId,
  })

  logger.warn(
    { agentRunId, errorCode, finishedAt, taskRecordId },
    "Failed agent run",
  )

  return actor
}
