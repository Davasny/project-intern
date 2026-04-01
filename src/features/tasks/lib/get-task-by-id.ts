import { TRPCError } from "@trpc/server"
import { and, asc, desc, eq, inArray } from "drizzle-orm"
import { agentRunTable } from "@/features/agent-runs/db"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { recordTable } from "@/features/records/db"
import { taskRecordTable } from "@/features/task-records/db"
import { taskDescriptionRevisionTable, taskTable } from "@/features/tasks/db"
import { getDerivedTaskSummaryState } from "@/features/tasks/lib/get-derived-task-summary-state"
import { db } from "@/lib/db"

type GetTaskByIdParams = {
  organizationSlug: string
  projectSlug: string
  taskId: string
  userId: string
}

export const getTaskById = async ({
  organizationSlug,
  projectSlug,
  taskId,
  userId,
}: GetTaskByIdParams) => {
  const project = await ensureProjectAccess({
    organizationSlug,
    projectSlug,
    userId,
  })

  if (!project) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this project.",
    })
  }

  const task = await db
    .select({
      createdAt: taskTable.createdAt,
      descriptionMarkdown: taskTable.descriptionMarkdown,
      id: taskTable.id,
      model: taskTable.model,
      pipelineVersion: taskTable.pipelineVersion,
      schemaVersion: taskTable.schemaVersion,
      sortOrder: taskTable.sortOrder,
      title: taskTable.title,
      updatedAt: taskTable.updatedAt,
    })
    .from(taskTable)
    .where(and(eq(taskTable.id, taskId), eq(taskTable.projectId, project.id)))
    .then((rows) => rows[0] ?? null)

  if (!task) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Task was not found.",
    })
  }

  const revisions = await db
    .select({
      createdAt: taskDescriptionRevisionTable.createdAt,
      createdByUserId: taskDescriptionRevisionTable.createdByUserId,
      descriptionMarkdown: taskDescriptionRevisionTable.descriptionMarkdown,
      id: taskDescriptionRevisionTable.id,
      revisionNumber: taskDescriptionRevisionTable.revisionNumber,
    })
    .from(taskDescriptionRevisionTable)
    .where(eq(taskDescriptionRevisionTable.taskId, taskId))
    .orderBy(desc(taskDescriptionRevisionTable.revisionNumber))

  const taskRecords = await db
    .select({
      agentRunId: taskRecordTable.agentRunId,
      errorCode: taskRecordTable.errorCode,
      id: taskRecordTable.id,
      lastTransitionAt: taskRecordTable.lastTransitionAt,
      recordId: taskRecordTable.recordId,
      recordName: recordTable.name,
      state: taskRecordTable.state,
    })
    .from(taskRecordTable)
    .innerJoin(recordTable, eq(taskRecordTable.recordId, recordTable.id))
    .where(eq(taskRecordTable.taskId, taskId))
    .orderBy(asc(recordTable.name))

  const agentRunIds = taskRecords
    .map((taskRecord) => taskRecord.agentRunId)
    .filter((agentRunId) => agentRunId !== null)

  const agentRuns =
    agentRunIds.length > 0
      ? await db
          .select({
            attemptNumber: agentRunTable.attemptNumber,
            id: agentRunTable.id,
            selectedAgent: agentRunTable.selectedAgent,
            selectedModel: agentRunTable.selectedModel,
            state: agentRunTable.state,
            taskRecordId: agentRunTable.taskRecordId,
            updatedAt: agentRunTable.updatedAt,
          })
          .from(agentRunTable)
          .where(inArray(agentRunTable.id, agentRunIds))
      : []

  const agentRunMap = new Map(
    agentRuns.map((agentRun) => [agentRun.id, agentRun]),
  )
  const taskRecordStates = taskRecords.map((taskRecord) => taskRecord.state)

  return {
    ...task,
    progress: {
      completedCount: taskRecordStates.filter((state) => state === "completed")
        .length,
      failedCount: taskRecordStates.filter((state) => state === "failed")
        .length,
      inProgressCount: taskRecordStates.filter(
        (state) => state === "picked_up" || state === "in_progress",
      ).length,
      skippedCount: taskRecordStates.filter((state) => state === "skipped")
        .length,
      totalCount: taskRecordStates.length,
      waitingCount: taskRecordStates.filter((state) => state === "waiting")
        .length,
    },
    revisions,
    summaryState: getDerivedTaskSummaryState({ states: taskRecordStates }),
    taskRecords: taskRecords.map((taskRecord) => ({
      ...taskRecord,
      latestAgentRun:
        taskRecord.agentRunId !== null
          ? (agentRunMap.get(taskRecord.agentRunId) ?? null)
          : null,
    })),
  }
}
