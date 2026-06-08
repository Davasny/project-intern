import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { listWorkRecordExecutionReadModels } from "@/features/execution/lib/list-work-record-execution-read-models"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { recordTable } from "@/features/records/db"
import { taskTable } from "@/features/tasks/db"
import { workRecordTable } from "@/features/work-records/db"
import { db } from "@/lib/db"

type GetRecordByIdParams = {
  organizationSlug: string
  projectSlug: string
  recordId: string
  userId: string
}

export const getRecordById = async ({
  organizationSlug,
  projectSlug,
  recordId,
  userId,
}: GetRecordByIdParams) => {
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

  const record = await db
    .select({
      context: recordTable.context,
      createdAt: recordTable.createdAt,
      id: recordTable.id,
      name: recordTable.name,
      projectId: recordTable.projectId,
      schemaVersion: recordTable.schemaVersion,
      state: recordTable.state,
      updatedAt: recordTable.updatedAt,
      version: recordTable.version,
    })
    .from(recordTable)
    .where(
      and(eq(recordTable.id, recordId), eq(recordTable.projectId, project.id)),
    )
    .then((rows) => rows[0] ?? null)

  if (!record) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Record was not found.",
    })
  }

  const linkedWorkRecords = await db
    .select({
      errorCode: workRecordTable.errorCode,
      lastTransitionAt: workRecordTable.lastTransitionAt,
      sortOrder: taskTable.sortOrder,
      state: workRecordTable.state,
      taskId: taskTable.id,
      workRecordId: workRecordTable.id,
      title: taskTable.title,
    })
    .from(workRecordTable)
    .innerJoin(taskTable, eq(workRecordTable.taskId, taskTable.id))
    .where(eq(workRecordTable.recordId, recordId))

  const executionReadModels = await listWorkRecordExecutionReadModels({
    projectId: project.id,
    recordId,
    taskId: null,
  })
  const executionReadModelMap = new Map(
    executionReadModels.map((executionReadModel) => [
      executionReadModel.workRecordId,
      executionReadModel,
    ]),
  )

  return {
    ...record,
    activeRunSummary:
      linkedWorkRecords
        .map(
          (workRecord) =>
            executionReadModelMap.get(workRecord.workRecordId)
              ?.currentInternRun ?? null,
        )
        .find((internRun) => internRun !== null) ?? null,
    linkedTasks: linkedWorkRecords.map((workRecord) => ({
      ...workRecord,
      attemptCount:
        executionReadModelMap.get(workRecord.workRecordId)?.attemptCount ?? 0,
      latestInternRun:
        executionReadModelMap.get(workRecord.workRecordId)?.latestInternRun ??
        null,
      latestFailurePayload:
        executionReadModelMap.get(workRecord.workRecordId)
          ?.latestFailurePayload ?? null,
      sortOrder: workRecord.sortOrder,
    })),
    progress: {
      completedCount: linkedWorkRecords.filter(
        (workRecord) => workRecord.state === "completed",
      ).length,
      failedCount: linkedWorkRecords.filter(
        (workRecord) => workRecord.state === "failed",
      ).length,
      inProgressCount: linkedWorkRecords.filter(
        (workRecord) =>
          workRecord.state === "picked_up" ||
          workRecord.state === "in_progress",
      ).length,
      skippedCount: linkedWorkRecords.filter(
        (workRecord) => workRecord.state === "skipped",
      ).length,
      totalCount: linkedWorkRecords.length,
      waitingCount: linkedWorkRecords.filter(
        (workRecord) => workRecord.state === "waiting",
      ).length,
    },
  }
}
