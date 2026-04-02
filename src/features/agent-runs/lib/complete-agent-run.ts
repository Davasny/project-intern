import { getAgentRunActor } from "@/features/agent-runs/lib/get-agent-run-actor"
import { getToolCallCount } from "@/features/agent-runs/lib/get-tool-call-count"
import { persistAgentRunOutputs } from "@/features/agent-runs/lib/persist-agent-run-outputs"
import { createActivityLogEvent } from "@/features/observability/lib/create-activity-log-event"
import { getAgentRunActivityScope } from "@/features/observability/lib/get-agent-run-activity-scope"
import { completeTaskRecord } from "@/features/task-records/lib/complete-task-record"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type CompleteAgentRunParams = {
  agentRunId: string
  costUsd: string | null
  latencyMs: number | null
  resultPayload: Record<string, unknown> | null
  taskRecordId: string
  tokenInput: number | null
  tokenOutput: number | null
  toolActivitySummary: Record<string, unknown>
}

export const completeAgentRun = async ({
  agentRunId,
  costUsd,
  latencyMs,
  resultPayload,
  taskRecordId,
  tokenInput,
  tokenOutput,
  toolActivitySummary,
}: CompleteAgentRunParams) => {
  const actor = await getAgentRunActor(agentRunId)
  const toolCallCount = getToolCallCount(toolActivitySummary)

  if (actor.state === "running") {
    await persistAgentRunOutputs({
      agentRunId,
      resultPayload,
      tokenOutput,
      toolActivitySummary,
    })
  }

  if (actor.state !== "running" && actor.state !== "persisting_outputs") {
    throw new Error(
      `Agent run ${agentRunId} cannot complete from state ${actor.state}.`,
    )
  }

  const finishedAt = new Date()
  const completionActor = await getAgentRunActor(agentRunId)

  if (completionActor.state !== "persisting_outputs") {
    throw new Error(
      `Agent run ${agentRunId} must persist outputs before completion. Current state: ${completionActor.state}.`,
    )
  }

  const nextActor = await completionActor.send("complete", {
    costUsd,
    estimatedCostUsd: costUsd,
    finishedAt,
    inputTokens: tokenInput,
    latencyMs,
    outputTokens: tokenOutput,
    resultPayload,
    tokenInput,
    tokenOutput,
    toolActivitySummary,
    toolCallCount,
    toolSummary: toolActivitySummary,
  })

  await completeTaskRecord({ agentRunId, taskRecordId })

  const activityScope = await getAgentRunActivityScope(agentRunId)

  await createActivityLogEvent({
    actorId: agentRunId,
    actorType: "executor",
    agentRunId,
    database: db,
    entityId: agentRunId,
    entityType: "agentRun",
    eventType: "agentRun.completed",
    organizationId: activityScope.organizationId,
    payload: {
      attemptNumber: activityScope.attemptNumber,
      estimatedCostUsd: costUsd,
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

  logger.info({ agentRunId, finishedAt, taskRecordId }, "Completed agent run")

  return nextActor
}
