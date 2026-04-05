import { and, eq } from "drizzle-orm"
import { machine } from "machin"
import { withDrizzlePg } from "machin/drizzle/pg"
import { agentRunTable } from "@/features/agent-runs/db"
import { createAgentRun } from "@/features/agent-runs/lib/create-agent-run"
import { claimTaskRecordCandidate } from "@/features/execution/lib/claim-task-record-candidate"
import { createActivityLogEvent } from "@/features/observability/lib/create-activity-log-event"
import { getTaskRecordActivityScope } from "@/features/observability/lib/get-task-record-activity-scope"
import { finalizeProjectSchemaMigration } from "@/features/project-schema/lib/finalize-project-schema-migration"
import { taskRecordTable } from "@/features/task-records/db"
import { taskTable } from "@/features/tasks/db"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type TaskRecordMachineContext = {
  agentRunId: string | null
  errorCode: string | null
  lastTransitionAt: Date
  recordId: string
  taskId: string
}

const lookupTaskRecordInfo = async (context: TaskRecordMachineContext) => {
  const info = await db
    .select({
      id: taskRecordTable.id,
      projectId: taskTable.projectId,
    })
    .from(taskRecordTable)
    .innerJoin(taskTable, eq(taskRecordTable.taskId, taskTable.id))
    .where(
      and(
        eq(taskRecordTable.taskId, context.taskId),
        eq(taskRecordTable.recordId, context.recordId),
      ),
    )
    .then((rows) => rows[0] ?? null)

  if (!info) {
    throw new Error(
      `Task record not found for taskId=${context.taskId}, recordId=${context.recordId}`,
    )
  }

  return info
}

type ClaimEvent = {
  lastTransitionAt: Date
}

type StartEvent = {
  agentRunId: string
  lastTransitionAt: Date
}

type CompleteEvent = {
  agentRunId: string
  lastTransitionAt: Date
}

type FailEvent = {
  agentRunId: string | null
  errorCode: string
  lastTransitionAt: Date
}

type SkipEvent = {
  agentRunId: string | null
  errorCode: string | null
  lastTransitionAt: Date
}

type ReleaseEvent = {
  lastTransitionAt: Date
}

type RetryEvent = {
  lastTransitionAt: Date
}

const taskRecordMachineDefinition = machine<TaskRecordMachineContext>().define({
  initial: "waiting",
  states: {
    waiting: {
      entry: (context, event: ReleaseEvent | RetryEvent) => ({
        ...context,
        agentRunId: null,
        errorCode: null,
        lastTransitionAt: event.lastTransitionAt,
      }),
      on: {
        claim: { target: "picked_up" },
        skip: { target: "skipped" },
      },
      onSuccess: { target: "waiting" },
    },
    picked_up: {
      entry: async (context, event: ClaimEvent) => {
        if (context.agentRunId) {
          return {
            ...context,
            agentRunId: context.agentRunId,
            errorCode: null,
            lastTransitionAt: event.lastTransitionAt,
          }
        }

        const existingAgentRun = await db
          .select({ id: agentRunTable.id })
          .from(agentRunTable)
          .where(eq(agentRunTable.taskRecordId, context.taskId))
          .orderBy(agentRunTable.createdAt)
          .then((rows) => rows[0] ?? null)

        if (existingAgentRun) {
          return {
            ...context,
            agentRunId: existingAgentRun.id,
            errorCode: null,
            lastTransitionAt: event.lastTransitionAt,
          }
        }

        const taskRecordInfo = await lookupTaskRecordInfo(context)

        const candidate = await claimTaskRecordCandidate({
          mode: "manual",
          projectId: taskRecordInfo.projectId,
          taskRecordId: taskRecordInfo.id,
        })

        if (!candidate) {
          throw new Error(
            `No claimable candidate found for task record ${taskRecordInfo.id}`,
          )
        }

        const agentRunResult = await createAgentRun({
          attemptNumber: candidate.attemptNumber,
          model: candidate.model,
          projectDefaultModel: candidate.projectDefaultModel,
          taskRecordId: taskRecordInfo.id,
        })

        if (!agentRunResult) {
          throw new Error(
            `Failed to create agent run for task record ${taskRecordInfo.id}`,
          )
        }

        return {
          ...context,
          agentRunId: agentRunResult.agentRunId,
          errorCode: null,
          lastTransitionAt: event.lastTransitionAt,
        }
      },
      on: {
        cancel: { target: "skipped" },
        fail: { target: "failed" },
        release: { target: "waiting" },
        start: { target: "in_progress" },
      },
      onSuccess: { target: "picked_up" },
      onError: { target: "picked_up_failed" },
    },
    picked_up_failed: {
      entry: (context, event: RetryEvent) => ({
        ...context,
        lastTransitionAt: event.lastTransitionAt,
      }),
      on: {
        retry: { target: "picked_up" },
        skip: { target: "skipped" },
      },
      onSuccess: { target: "picked_up_failed" },
    },
    in_progress: {
      entry: (context, event: StartEvent) => ({
        ...context,
        agentRunId: event.agentRunId,
        errorCode: null,
        lastTransitionAt: event.lastTransitionAt,
      }),
      on: {
        cancel: { target: "skipped" },
        complete: { target: "completed" },
        fail: { target: "failed" },
      },
      onSuccess: { target: "in_progress" },
    },
    completed: {
      entry: async (context, event: CompleteEvent) => {
        const taskRecordInfo = await lookupTaskRecordInfo(context)

        const activityScope = await getTaskRecordActivityScope(
          taskRecordInfo.id,
        )

        await createActivityLogEvent({
          actorId: event.agentRunId,
          actorType: "executor",
          agentRunId: event.agentRunId,
          database: db,
          entityId: activityScope.taskRecordId,
          entityType: "taskRecord",
          eventType: "taskRecord.completed",
          organizationId: activityScope.organizationId,
          payload: {
            recordName: activityScope.recordName,
            taskTitle: activityScope.taskTitle,
          },
          projectId: activityScope.projectId,
          recordId: activityScope.recordId,
          relatedProjectId: null,
          relatedRecordId: null,
          taskId: activityScope.taskId,
          taskRecordId: activityScope.taskRecordId,
        })

        await finalizeProjectSchemaMigration({ taskId: context.taskId })

        return {
          ...context,
          agentRunId: event.agentRunId,
          errorCode: null,
          lastTransitionAt: event.lastTransitionAt,
        }
      },
      onSuccess: { target: "completed" },
      onError: { target: "completed_failed" },
    },
    completed_failed: {
      entry: (context, event: RetryEvent) => ({
        ...context,
        lastTransitionAt: event.lastTransitionAt,
      }),
      on: {
        retry: { target: "completed" },
      },
      onSuccess: { target: "completed_failed" },
    },
    failed: {
      entry: async (context, event: FailEvent) => {
        const taskRecordInfo = await lookupTaskRecordInfo(context)

        const activityScope = await getTaskRecordActivityScope(
          taskRecordInfo.id,
        )

        await createActivityLogEvent({
          actorId: event.agentRunId,
          actorType: "executor",
          agentRunId: event.agentRunId,
          database: db,
          entityId: activityScope.taskRecordId,
          entityType: "taskRecord",
          eventType: "taskRecord.failed",
          organizationId: activityScope.organizationId,
          payload: {
            errorCode: event.errorCode,
            recordName: activityScope.recordName,
            taskTitle: activityScope.taskTitle,
          },
          projectId: activityScope.projectId,
          recordId: activityScope.recordId,
          relatedProjectId: null,
          relatedRecordId: null,
          taskId: activityScope.taskId,
          taskRecordId: activityScope.taskRecordId,
        })

        logger.warn(
          { agentRunId: event.agentRunId, taskId: context.taskId },
          "Failed task record",
        )

        return {
          ...context,
          agentRunId: event.agentRunId,
          errorCode: event.errorCode,
          lastTransitionAt: event.lastTransitionAt,
        }
      },
      on: {
        retry: { target: "waiting" },
        skip: { target: "skipped" },
      },
      onSuccess: { target: "failed" },
      onError: { target: "failed_failed" },
    },
    failed_failed: {
      entry: (context, event: RetryEvent) => ({
        ...context,
        lastTransitionAt: event.lastTransitionAt,
      }),
      on: {
        retry: { target: "failed" },
        skip: { target: "skipped" },
      },
      onSuccess: { target: "failed_failed" },
    },
    skipped: {
      entry: (context, event: SkipEvent) => ({
        ...context,
        agentRunId: event.agentRunId,
        errorCode: event.errorCode,
        lastTransitionAt: event.lastTransitionAt,
      }),
      on: {
        retry: { target: "waiting" },
      },
      onSuccess: { target: "skipped" },
    },
  },
})

export const taskRecordMachine = withDrizzlePg(taskRecordMachineDefinition, {
  db,
  table: taskRecordTable,
})
