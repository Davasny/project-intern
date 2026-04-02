import { sql } from "drizzle-orm"
import { withDrizzlePg } from "machin/drizzle/pg"
import { agentRunTable } from "@/features/agent-runs/db"
import { agentRunMachineDefinition } from "@/features/agent-runs/lib/agent-run-machine"
import { claimTaskRecordCandidate } from "@/features/execution/lib/claim-task-record-candidate"
import { createActivityLogEvent } from "@/features/observability/lib/create-activity-log-event"
import { taskRecordTable } from "@/features/task-records/db"
import { taskRecordMachineDefinition } from "@/features/task-records/lib/task-record-machine"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type GeneratedIdRow = {
  id: string
}

type ClaimTaskRecordForManualTriggerParams = {
  projectId: string
  taskRecordId: string
}

export const claimTaskRecordForManualTrigger = async ({
  projectId,
  taskRecordId,
}: ClaimTaskRecordForManualTriggerParams) => {
  const claimedTaskRecord = await db.transaction(async (tx) => {
    const candidate = await claimTaskRecordCandidate({
      database: tx,
      mode: "manual",
      projectId,
      taskRecordId,
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

    const transactionAgentRunMachine = withDrizzlePg(
      agentRunMachineDefinition,
      {
        db: tx,
        table: agentRunTable,
      },
    )
    const transactionTaskRecordMachine = withDrizzlePg(
      taskRecordMachineDefinition,
      {
        db: tx,
        table: taskRecordTable,
      },
    )

    await transactionAgentRunMachine.createActor(agentRunId, {
      attemptNumber: candidate.attemptNumber,
      costUsd: null,
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
      selectedModel: candidate.model,
      sessionReference: null,
      startedAt: null,
      taskRecordId: candidate.taskRecordId,
      tokenInput: null,
      tokenOutput: null,
      toolActivitySummary: {},
      toolCallCount: 0,
      toolSummary: {},
    })

    const taskRecordActor = await transactionTaskRecordMachine.getActor(
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
      manualTrigger: true,
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

  logger.info(claimedTaskRecord, "Claimed task record for manual trigger")

  return claimedTaskRecord
}
