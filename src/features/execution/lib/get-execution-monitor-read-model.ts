import { eq } from "drizzle-orm"
import { isFailedInternRunState } from "@/features/execution/lib/is-failed-intern-run-state"
import { listExecutionMatrixRecords } from "@/features/execution/lib/list-execution-matrix-records"
import { listExecutionMatrixTasks } from "@/features/execution/lib/list-execution-matrix-tasks"
import { listWorkRecordExecutionReadModels } from "@/features/execution/lib/list-work-record-execution-read-models"
import { listProjectInternRunUsageSummaries } from "@/features/intern-runs/lib/list-project-intern-run-usage-summaries"
import { projectTable } from "@/features/projects/db"
import { db } from "@/lib/db"

type GetExecutionMonitorReadModelParams = {
  projectId: string
}

export const getExecutionMonitorReadModel = async ({
  projectId,
}: GetExecutionMonitorReadModelParams) => {
  const project = await db
    .select({
      descriptionMarkdown: projectTable.descriptionMarkdown,
      id: projectTable.id,
      isAutopickEnabled: projectTable.isAutopickEnabled,
    })
    .from(projectTable)
    .where(eq(projectTable.id, projectId))
    .then((rows) => rows[0] ?? null)

  if (!project) {
    return null
  }

  const [records, tasks, workRecords, usageSummaries] = await Promise.all([
    listExecutionMatrixRecords({ projectId }),
    listExecutionMatrixTasks({ projectId }),
    listWorkRecordExecutionReadModels({
      projectId,
      recordId: null,
      taskId: null,
    }),
    listProjectInternRunUsageSummaries({ projectId }),
  ])
  const matrixWorkRecords = workRecords.map((workRecord) => ({
    ...workRecord,
    latestInternRun: workRecord.currentInternRun,
  }))

  const summary = {
    activeCount: matrixWorkRecords.filter(
      (workRecord) =>
        workRecord.state === "picked_up" || workRecord.state === "in_progress",
    ).length,
    failedCount: matrixWorkRecords.filter((workRecord) => {
      if (
        workRecord.state === "failed" ||
        workRecord.state === "picked_up_failed" ||
        workRecord.state === "completed_failed" ||
        workRecord.state === "failed_failed"
      ) {
        return true
      }

      return workRecord.latestInternRun
        ? isFailedInternRunState(workRecord.latestInternRun.state)
        : false
    }).length,
    retriedCount: matrixWorkRecords.filter(
      (workRecord) => workRecord.attemptCount > 1,
    ).length,
    skippedCount: matrixWorkRecords.filter(
      (workRecord) => workRecord.state === "skipped",
    ).length,
    waitingCount: matrixWorkRecords.filter(
      (workRecord) => workRecord.state === "waiting",
    ).length,
  }

  return {
    project: {
      descriptionMarkdown: project.descriptionMarkdown,
    },
    isAutopickEnabled: project.isAutopickEnabled,
    records,
    summary,
    usage: usageSummaries.projectUsage,
    tasks,
    workRecords: matrixWorkRecords,
  }
}
