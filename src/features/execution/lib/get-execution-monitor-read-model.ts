import { eq } from "drizzle-orm"
import { isFailedInternRunState } from "@/features/execution/lib/is-failed-intern-run-state"
import { listWorkRecordExecutionReadModels } from "@/features/execution/lib/list-work-record-execution-read-models"
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

  const workRecords = await listWorkRecordExecutionReadModels({
    projectId,
    recordId: null,
    taskId: null,
  })

  const summary = {
    activeCount: workRecords.filter(
      (workRecord) =>
        workRecord.state === "picked_up" || workRecord.state === "in_progress",
    ).length,
    failedCount: workRecords.filter((workRecord) => {
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
    retriedCount: workRecords.filter(
      (workRecord) => workRecord.attemptCount > 1,
    ).length,
    skippedCount: workRecords.filter(
      (workRecord) => workRecord.state === "skipped",
    ).length,
    waitingCount: workRecords.filter(
      (workRecord) => workRecord.state === "waiting",
    ).length,
  }

  return {
    project: {
      descriptionMarkdown: project.descriptionMarkdown,
    },
    isAutopickEnabled: project.isAutopickEnabled,
    summary,
    workRecords,
  }
}
