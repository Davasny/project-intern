import { getAgentRunActor } from "@/features/agent-runs/lib/get-agent-run-actor"
import { getToolCallCount } from "@/features/agent-runs/lib/get-tool-call-count"
import { createActivityLogEvent } from "@/features/observability/lib/create-activity-log-event"
import { getAgentRunActivityScope } from "@/features/observability/lib/get-agent-run-activity-scope"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type MarkAgentRunBootingParams = {
  agentRunId: string
  model: string
  provider: string
  sessionReference: string | null
  toolActivitySummary: Record<string, unknown>
}

export const markAgentRunBooting = async ({
  agentRunId,
  model,
  provider,
  sessionReference,
  toolActivitySummary,
}: MarkAgentRunBootingParams) => {
  const actor = await getAgentRunActor(agentRunId)
  const startedAt = new Date()
  const toolCallCount = getToolCallCount(toolActivitySummary)
  const nextActor = await actor.send("boot", {
    model,
    provider,
    sessionReference,
    startedAt,
    toolActivitySummary,
    toolCallCount,
    toolSummary: toolActivitySummary,
  })

  const activityScope = await getAgentRunActivityScope(agentRunId)

  await createActivityLogEvent({
    actorId: agentRunId,
    actorType: "executor",
    agentRunId,
    database: db,
    entityId: agentRunId,
    entityType: "agentRun",
    eventType: "agentRun.started",
    organizationId: activityScope.organizationId,
    payload: {
      attemptNumber: activityScope.attemptNumber,
      model,
      provider,
      sessionReference,
      startedAt,
    },
    projectId: activityScope.projectId,
    recordId: activityScope.recordId,
    relatedProjectId: null,
    relatedRecordId: null,
    taskId: activityScope.taskId,
    taskRecordId: activityScope.taskRecordId,
  })

  logger.info(
    { agentRunId, model, provider, sessionReference },
    "Marked agent run booting",
  )

  return nextActor
}
