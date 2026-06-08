import { TRPCError } from "@trpc/server"
import { asc, eq } from "drizzle-orm"
import { calculateAverageCostUsd } from "@/features/intern-runs/lib/calculate-average-cost-usd"
import { emptyInternRunUsageSummary } from "@/features/intern-runs/lib/intern-run-usage-summary"
import { listProjectInternRunUsageSummaries } from "@/features/intern-runs/lib/list-project-intern-run-usage-summaries"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { taskTable } from "@/features/tasks/db"
import { getDerivedTaskSummaryState } from "@/features/tasks/lib/get-derived-task-summary-state"
import { workRecordTable } from "@/features/work-records/db"
import { db } from "@/lib/db"

type ListTasksParams = {
  organizationSlug: string
  projectSlug: string
  userId: string
}

export const listTasks = async ({
  organizationSlug,
  projectSlug,
  userId,
}: ListTasksParams) => {
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

  const tasks = await db
    .select({
      createdAt: taskTable.createdAt,
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
    .where(eq(taskTable.projectId, project.id))
    .orderBy(asc(taskTable.sortOrder))

  const [workRecordStates, usageSummaries] = await Promise.all([
    db
      .select({
        state: workRecordTable.state,
        taskId: workRecordTable.taskId,
      })
      .from(workRecordTable),
    listProjectInternRunUsageSummaries({ projectId: project.id }),
  ])

  return tasks.map((task) => {
    const states = workRecordStates
      .filter((workRecord) => workRecord.taskId === task.id)
      .map((workRecord) => workRecord.state)

    return {
      ...task,
      effectiveTemperature: task.temperature ?? project.defaultTemperature,
      progress: {
        completedCount: states.filter((state) => state === "completed").length,
        failedCount: states.filter((state) => state === "failed").length,
        inProgressCount: states.filter(
          (state) => state === "picked_up" || state === "in_progress",
        ).length,
        skippedCount: states.filter((state) => state === "skipped").length,
        totalCount: states.length,
        waitingCount: states.filter((state) => state === "waiting").length,
      },
      summaryState: getDerivedTaskSummaryState({ states }),
      usage: {
        ...(usageSummaries.taskUsageMap.get(task.id) ??
          emptyInternRunUsageSummary()),
        averageCostUsd: calculateAverageCostUsd({
          denominator: states.length,
          totalCostUsd:
            usageSummaries.taskUsageMap.get(task.id)?.totalCostUsd ?? 0,
        }),
      },
    }
  })
}
