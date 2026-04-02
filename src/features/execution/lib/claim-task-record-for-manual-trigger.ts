import { sql } from "drizzle-orm"
import { withDrizzlePg } from "machin/drizzle/pg"
import { agentRunTable } from "@/features/agent-runs/db"
import { agentRunMachineDefinition } from "@/features/agent-runs/lib/agent-run-machine"
import type { AgentRunState } from "@/features/agent-runs/schemas/agent-run-state"
import { createActivityLogEvent } from "@/features/observability/lib/create-activity-log-event"
import { taskRecordTable } from "@/features/task-records/db"
import { taskRecordMachineDefinition } from "@/features/task-records/lib/task-record-machine"
import type { TaskRecordState } from "@/features/task-records/schemas/task-record-state"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

const activeAgentRunStates = [
  "created",
  "booting",
  "running",
  "persisting_outputs",
] satisfies Array<AgentRunState>

const terminalTaskRecordStates = [
  "completed",
  "skipped",
] satisfies Array<TaskRecordState>

type ClaimedTaskRecordRow = {
  agentRunId: string
  organizationId: string
  projectId: string
  recordId: string
  taskId: string
  taskRecordId: string
}

type ClaimCandidateRow = {
  attemptNumber: number
  model: string | null
  organizationId: string
  projectId: string
  recordId: string
  taskId: string
  taskRecordId: string
}

type GeneratedIdRow = {
  id: string
}

const createPgArray = (values: string[]) =>
  sql.raw(`ARRAY[${values.map((value) => `'${value}'`).join(", ")}]`)

type ClaimTaskRecordForManualTriggerParams = {
  projectId: string
  taskRecordId: string
}

export const claimTaskRecordForManualTrigger = async ({
  projectId,
  taskRecordId,
}: ClaimTaskRecordForManualTriggerParams) => {
  const claimedTaskRecord = await db.transaction(async (tx) => {
    const candidateResult = await tx.execute<ClaimCandidateRow>(sql`
      select
        tr.id as "taskRecordId",
        tr.task_id as "taskId",
        tr.record_id as "recordId",
        t.project_id as "projectId",
        p.organization_id as "organizationId",
        t.model as "model",
        coalesce(
          (
            select max(existing_ar.attempt_number)
            from agent_run existing_ar
            where existing_ar.task_record_id = tr.id
          ),
          0
        ) + 1 as "attemptNumber"
      from task_record tr
      inner join task t on t.id = tr.task_id
      inner join project p on p.id = t.project_id
      where
        tr.id = ${taskRecordId}
        and t.project_id = ${projectId}
        and tr.state = 'waiting'
        and not exists (
          select 1
          from task_record earlier_tr
          inner join task earlier_t on earlier_t.id = earlier_tr.task_id
          where
            earlier_tr.record_id = tr.record_id
            and earlier_t.project_id = t.project_id
            and earlier_t.sort_order < t.sort_order
            and earlier_tr.state <> all(${createPgArray(terminalTaskRecordStates)})
        )
        and not exists (
          select 1
          from task_record active_tr
          where
            active_tr.record_id = tr.record_id
            and active_tr.state in ('picked_up', 'in_progress')
        )
        and not exists (
          select 1
          from agent_run active_ar
          inner join task_record active_ar_tr on active_ar_tr.id = active_ar.task_record_id
          where
            active_ar_tr.record_id = tr.record_id
            and active_ar.state = any(${createPgArray(activeAgentRunStates)})
        )
      for update of tr skip locked
    `)

    const candidate = candidateResult.rows[0] ?? null

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
