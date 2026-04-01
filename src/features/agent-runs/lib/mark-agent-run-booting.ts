import { eq } from "drizzle-orm"
import { agentRunTable } from "@/features/agent-runs/db"
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
  await actor.send("boot")
  const startedAt = new Date()

  await db
    .update(agentRunTable)
    .set({
      model,
      provider,
      sessionReference,
      startedAt,
      toolActivitySummary,
      toolCallCount: getToolCallCount(toolActivitySummary),
      toolSummary: toolActivitySummary,
    })
    .where(eq(agentRunTable.id, agentRunId))

  const activityScope = await getAgentRunActivityScope(agentRunId)

  await createActivityLogEvent({
    actorId: agentRunId,
    actorType: "executor",
    agentRunId,
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

  return actor
}
