import { TRPCError } from "@trpc/server"
import { and, asc, desc, eq } from "drizzle-orm"
import { listTaskRecordExecutionReadModels } from "@/features/execution/lib/list-task-record-execution-read-models"
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
      schemaVersion: taskTable.schemaVersion,
      sortOrder: taskTable.sortOrder,
      sourceSchemaVersionId: taskTable.sourceSchemaVersionId,
      targetSchemaVersionId: taskTable.targetSchemaVersionId,
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

  const executionReadModels = await listTaskRecordExecutionReadModels({
    projectId: project.id,
    recordId: null,
    taskId,
  })

  const executionReadModelMap = new Map(
    executionReadModels.map((executionReadModel) => [
      executionReadModel.taskRecordId,
      executionReadModel,
    ]),
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
      attemptCount: executionReadModelMap.get(taskRecord.id)?.attemptCount ?? 0,
      latestAgentRun:
        executionReadModelMap.get(taskRecord.id)?.latestAgentRun ?? null,
      latestFailurePayload:
        executionReadModelMap.get(taskRecord.id)?.latestFailurePayload ?? null,
    })),
  }
}
