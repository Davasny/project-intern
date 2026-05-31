import { TRPCError } from "@trpc/server"
import { asc, eq, inArray, sql } from "drizzle-orm"
import { internRunTable } from "@/features/intern-runs/db"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { listRecordRelationSummaries } from "@/features/record-edges/lib/list-record-relation-summaries"
import { recordTable } from "@/features/records/db"
import { taskTable } from "@/features/tasks/db"
import { workRecordTable } from "@/features/work-records/db"
import { db } from "@/lib/db"

type ListRecordsParams = {
  organizationSlug: string
  projectSlug: string
  userId: string
}

export const listRecords = async ({
  organizationSlug,
  projectSlug,
  userId,
}: ListRecordsParams) => {
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

  const records = await db
    .select({
      context: recordTable.context,
      createdAt: recordTable.createdAt,
      id: recordTable.id,
      name: recordTable.name,
      schemaVersion: recordTable.schemaVersion,
      state: recordTable.state,
      updatedAt: recordTable.updatedAt,
      version: recordTable.version,
    })
    .from(recordTable)
    .where(eq(recordTable.projectId, project.id))
    .orderBy(
      asc(sql`lower(${recordTable.name})`),
      asc(recordTable.name),
      asc(recordTable.id),
    )

  const recordIds = records.map((record) => record.id)

  const workRecords =
    recordIds.length > 0
      ? await db
          .select({
            internRunId: workRecordTable.internRunId,
            recordId: workRecordTable.recordId,
            state: workRecordTable.state,
            taskId: workRecordTable.taskId,
          })
          .from(workRecordTable)
          .where(inArray(workRecordTable.recordId, recordIds))
      : []

  const activeInternRunIds = workRecords
    .map((workRecord) => workRecord.internRunId)
    .filter((internRunId) => internRunId !== null)

  const internRuns =
    activeInternRunIds.length > 0
      ? await db
          .select({
            id: internRunTable.id,
            selectedModel: internRunTable.selectedModel,
            state: internRunTable.state,
          })
          .from(internRunTable)
          .where(inArray(internRunTable.id, activeInternRunIds))
      : []

  const tasks = await db
    .select({
      id: taskTable.id,
      title: taskTable.title,
    })
    .from(taskTable)
    .where(eq(taskTable.projectId, project.id))

  const taskMap = new Map(tasks.map((task) => [task.id, task]))
  const internRunMap = new Map(
    internRuns.map((internRun) => [internRun.id, internRun]),
  )
  const relationSummaryMap = await listRecordRelationSummaries({
    projectId: project.id,
    recordIds,
  })

  return records.map((record) => {
    const linkedWorkRecords = workRecords.filter(
      (workRecord) => workRecord.recordId === record.id,
    )
    const activeRun =
      linkedWorkRecords
        .map((workRecord) =>
          workRecord.internRunId !== null
            ? (internRunMap.get(workRecord.internRunId) ?? null)
            : null,
        )
        .find((internRun) => internRun !== null) ?? null

    const relationSummary = relationSummaryMap.get(record.id) ?? {
      activeCount: 0,
      inboundCount: 0,
      outboundCount: 0,
      relatedRecords: [],
    }

    return {
      ...record,
      activeRun,
      linkedTasks: linkedWorkRecords.map((workRecord) => ({
        state: workRecord.state,
        taskId: workRecord.taskId,
        title: taskMap.get(workRecord.taskId)?.title ?? "Unknown task",
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
      relationSummary,
    }
  })
}
