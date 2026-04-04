import { sql } from "drizzle-orm"
import { agentRunMachine } from "@/features/agent-runs/lib/agent-run-machine"
import { claimTaskRecordCandidate } from "@/features/execution/lib/claim-task-record-candidate"
import { createActivityLogEvent } from "@/features/observability/lib/create-activity-log-event"
import { taskRecordMachine } from "@/features/task-records/lib/task-record-machine"
import { db } from "@/lib/db"
import { resolveEffectiveModel } from "@/lib/llm/resolve-effective-model"
import { logger } from "@/lib/logger"

type GeneratedIdRow = {
  id: string
}

export const claimNextTaskRecord = async () => {
  try {
    const claimedTaskRecord = await db.transaction(async (tx) => {
      const candidate = await claimTaskRecordCandidate({
        database: tx,
        mode: "autopick",
      })

      if (!candidate) {
        return null
      }

      const agentRunIdResult = await tx.execute<GeneratedIdRow>(sql`
        select uuidv7() as id
      `)
      const agentRunId = agentRunIdResult.rows[0]?.id ?? null

      if (!agentRunId) {
        return null
      }
      await agentRunMachine.createActor(agentRunId, {
        attemptNumber: candidate.attemptNumber,
        costUsd: null,
        directory: null,
        estimatedCostUsd: null,
        failurePayload: null,
        finishedAt: null,
        inputTokens: null,
        latencyMs: null,
        model: null,
        outputTokens: null,
        provider: null,
        resultPayload: null,
        selectedAgent: "record-worker",
        selectedModel: resolveEffectiveModel({
          projectDefaultModel: candidate.projectDefaultModel,
          taskModel: candidate.model,
        }),
        sessionReference: null,
        startedAt: null,
        taskRecordId: candidate.taskRecordId,
        tokenInput: null,
        tokenOutput: null,
        toolActivitySummary: {},
        toolCallCount: 0,
        toolSummary: {},
      })

      const taskRecordActor = await taskRecordMachine.getActor(
        candidate.taskRecordId,
      )

      if (!taskRecordActor) {
        return null
      }

      await taskRecordActor.send("claim", {
        agentRunId,
        errorCode: null,
        lastTransitionAt: new Date(),
      })

      return {
        agentRunId,
        organizationId: candidate.organizationId,
        projectId: candidate.projectId,
        recordId: candidate.recordId,
        taskId: candidate.taskId,
        taskRecordId: candidate.taskRecordId,
      }
    })

    if (!claimedTaskRecord) {
      return null
    }

    await createActivityLogEvent({
      actorId: claimedTaskRecord.agentRunId,
      actorType: "executor",
      agentRunId: claimedTaskRecord.agentRunId,
      database: db,
      entityId: claimedTaskRecord.taskRecordId,
      entityType: "taskRecord",
      eventType: "taskRecord.claimed",
      organizationId: claimedTaskRecord.organizationId,
      payload: {
        recordId: claimedTaskRecord.recordId,
        taskId: claimedTaskRecord.taskId,
      },
      projectId: claimedTaskRecord.projectId,
      recordId: claimedTaskRecord.recordId,
      relatedProjectId: null,
      relatedRecordId: null,
      taskId: claimedTaskRecord.taskId,
      taskRecordId: claimedTaskRecord.taskRecordId,
    })

    logger.info(claimedTaskRecord, "Claimed next task record")

    return claimedTaskRecord
  } catch (error) {
    const databaseError = error as { code?: string }

    if (databaseError.code === "23505") {
      logger.warn({ error }, "Skipped conflicting task record claim")
      return null
    }

    throw error
  }
}
