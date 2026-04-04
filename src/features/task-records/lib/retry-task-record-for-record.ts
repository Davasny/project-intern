import { TRPCError } from "@trpc/server"
import { and, eq, sql } from "drizzle-orm"
import { withDrizzlePg } from "machin/drizzle/pg"
import { agentRunTable } from "@/features/agent-runs/db"
import { agentRunMachineDefinition } from "@/features/agent-runs/lib/agent-run-machine"
import { claimTaskRecordCandidate } from "@/features/execution/lib/claim-task-record-candidate"
import { executionQueueService } from "@/features/execution/lib/execution-queue-service"
import { createActivityLogEvent } from "@/features/observability/lib/create-activity-log-event"
import { getTaskRecordActivityScope } from "@/features/observability/lib/get-task-record-activity-scope"
import { taskRecordTable } from "@/features/task-records/db"
import { taskRecordMachineDefinition } from "@/features/task-records/lib/task-record-machine"
import { taskTable } from "@/features/tasks/db"
import { db } from "@/lib/db"
import { resolveEffectiveModel } from "@/lib/llm/resolve-effective-model"

type GeneratedIdRow = {
  id: string
}

type RetryTaskRecordForRecordParams = {
  actorId: string
  organizationId: string
  projectId: string
  recordId: string
  taskRecordId: string
}

export const retryTaskRecordForRecord = async ({
  actorId,
  organizationId,
  projectId,
  recordId,
  taskRecordId,
}: RetryTaskRecordForRecordParams) => {
  const claimedTaskRecord = await db.transaction(async (tx) => {
    const taskRecord = await tx
      .select({
        id: taskRecordTable.id,
        state: taskRecordTable.state,
      })
      .from(taskRecordTable)
      .innerJoin(taskTable, eq(taskRecordTable.taskId, taskTable.id))
      .where(
        and(
          eq(taskRecordTable.id, taskRecordId),
          eq(taskRecordTable.recordId, recordId),
          eq(taskTable.projectId, projectId),
        ),
      )
      .then((rows) => rows[0] ?? null)

    if (!taskRecord) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Task record was not found.",
      })
    }

    if (taskRecord.state !== "failed" && taskRecord.state !== "skipped") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Only failed or skipped task records can be retried.",
      })
    }

    const transactionTaskRecordMachine = withDrizzlePg(
      taskRecordMachineDefinition,
      {
        db: tx,
        table: taskRecordTable,
      },
    )
    const taskRecordActor = await transactionTaskRecordMachine.getActor(
      taskRecord.id,
    )

    if (!taskRecordActor) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Task record was not found.",
      })
    }

    const waitingTaskRecordActor = await taskRecordActor.send("retry", {
      agentRunId: taskRecordActor.context.agentRunId,
      errorCode: null,
      lastTransitionAt: new Date(),
    })

    const candidate = await claimTaskRecordCandidate({
      database: tx,
      mode: "manual",
      projectId,
      taskRecordId: taskRecord.id,
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

    await transactionAgentRunMachine.createActor(agentRunId, {
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

    await waitingTaskRecordActor.send("claim", {
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
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Task record could not be scheduled for retry.",
    })
  }

  const activityScope = await getTaskRecordActivityScope(
    claimedTaskRecord.taskRecordId,
  )

  await createActivityLogEvent({
    actorId,
    actorType: "user",
    agentRunId: null,
    database: db,
    entityId: claimedTaskRecord.taskRecordId,
    entityType: "taskRecord",
    eventType: "taskRecord.retried",
    organizationId,
    payload: {
      recordName: activityScope.recordName,
      taskTitle: activityScope.taskTitle,
    },
    projectId,
    recordId,
    relatedProjectId: null,
    relatedRecordId: null,
    taskId: activityScope.taskId,
    taskRecordId: activityScope.taskRecordId,
  })

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
      retry: true,
      taskId: claimedTaskRecord.taskId,
    },
    projectId: claimedTaskRecord.projectId,
    recordId: claimedTaskRecord.recordId,
    relatedProjectId: null,
    relatedRecordId: null,
    taskId: claimedTaskRecord.taskId,
    taskRecordId: claimedTaskRecord.taskRecordId,
  })

  const jobId = await executionQueueService.enqueueTaskRecordExecution({
    agentRunId: claimedTaskRecord.agentRunId,
    taskRecordId: claimedTaskRecord.taskRecordId,
  })

  if (jobId === null) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Task retry could not enqueue execution.",
    })
  }

  return {
    ...claimedTaskRecord,
    jobId,
  }
}
