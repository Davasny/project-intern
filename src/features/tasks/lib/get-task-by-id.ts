import { TRPCError } from "@trpc/server"
import { and, asc, desc, eq } from "drizzle-orm"
import { listWorkRecordExecutionReadModels } from "@/features/execution/lib/list-work-record-execution-read-models"
import { calculateAverageCostUsd } from "@/features/intern-runs/lib/calculate-average-cost-usd"
import { emptyInternRunUsageSummary } from "@/features/intern-runs/lib/intern-run-usage-summary"
import { listProjectInternRunUsageSummaries } from "@/features/intern-runs/lib/list-project-intern-run-usage-summaries"
import { projectTable } from "@/features/projects/db"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { recordTable } from "@/features/records/db"
import { taskDescriptionRevisionTable, taskTable } from "@/features/tasks/db"
import { getDerivedTaskSummaryState } from "@/features/tasks/lib/get-derived-task-summary-state"
import { workRecordTable } from "@/features/work-records/db"
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

  const taskWithProject = await db
    .select({
      createdAt: taskTable.createdAt,
      defaultModel: projectTable.defaultModel,
      defaultTemperature: projectTable.defaultTemperature,
      descriptionMarkdown: taskTable.descriptionMarkdown,
      id: taskTable.id,
      model: taskTable.model,
      temperature: taskTable.temperature,
      schemaVersion: taskTable.schemaVersion,
      sortOrder: taskTable.sortOrder,
      sourceSchemaVersionId: taskTable.sourceSchemaVersionId,
      state: taskTable.state,
      targetSchemaVersionId: taskTable.targetSchemaVersionId,
      title: taskTable.title,
      updatedAt: taskTable.updatedAt,
    })
    .from(taskTable)
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .where(and(eq(taskTable.id, taskId), eq(taskTable.projectId, project.id)))
    .then((rows) => rows[0] ?? null)

  if (!taskWithProject) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Task was not found.",
    })
  }

  const {
    defaultModel: projectDefaultModel,
    defaultTemperature: projectDefaultTemperature,
    ...task
  } = taskWithProject

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

  const workRecords = await db
    .select({
      errorCode: workRecordTable.errorCode,
      id: workRecordTable.id,
      lastTransitionAt: workRecordTable.lastTransitionAt,
      recordId: workRecordTable.recordId,
      recordName: recordTable.name,
      state: workRecordTable.state,
    })
    .from(workRecordTable)
    .innerJoin(recordTable, eq(workRecordTable.recordId, recordTable.id))
    .where(eq(workRecordTable.taskId, taskId))
    .orderBy(asc(recordTable.name))

  const [executionReadModels, usageSummaries] = await Promise.all([
    listWorkRecordExecutionReadModels({
      projectId: project.id,
      recordId: null,
      taskId,
    }),
    listProjectInternRunUsageSummaries({ projectId: project.id }),
  ])

  const executionReadModelMap = new Map(
    executionReadModels.map((executionReadModel) => [
      executionReadModel.workRecordId,
      executionReadModel,
    ]),
  )
  const workRecordStates = workRecords.map((workRecord) => workRecord.state)

  return {
    ...task,
    effectiveModel: task.model ?? projectDefaultModel,
    effectiveTemperature: task.temperature ?? projectDefaultTemperature,
    progress: {
      completedCount: workRecordStates.filter((state) => state === "completed")
        .length,
      failedCount: workRecordStates.filter((state) => state === "failed")
        .length,
      inProgressCount: workRecordStates.filter(
        (state) => state === "picked_up" || state === "in_progress",
      ).length,
      skippedCount: workRecordStates.filter((state) => state === "skipped")
        .length,
      totalCount: workRecordStates.length,
      waitingCount: workRecordStates.filter((state) => state === "waiting")
        .length,
    },
    revisions,
    summaryState: getDerivedTaskSummaryState({ states: workRecordStates }),
    usage: {
      ...(usageSummaries.taskUsageMap.get(task.id) ??
        emptyInternRunUsageSummary()),
      averageCostUsd: calculateAverageCostUsd({
        runCount: usageSummaries.taskUsageMap.get(task.id)?.runCount ?? 0,
        totalCostUsd:
          usageSummaries.taskUsageMap.get(task.id)?.totalCostUsd ?? 0,
      }),
    },
    workRecords: workRecords.map((workRecord) => ({
      ...workRecord,
      attemptCount: executionReadModelMap.get(workRecord.id)?.attemptCount ?? 0,
      latestInternRun:
        executionReadModelMap.get(workRecord.id)?.latestInternRun ?? null,
      latestFailurePayload:
        executionReadModelMap.get(workRecord.id)?.latestFailurePayload ?? null,
      usage:
        usageSummaries.workRecordUsageMap.get(workRecord.id) ??
        emptyInternRunUsageSummary(),
    })),
  }
}
