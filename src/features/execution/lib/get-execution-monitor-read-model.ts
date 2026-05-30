import { eq } from "drizzle-orm"
import { isFailedAgentRunState } from "@/features/execution/lib/is-failed-agent-run-state"
import { listTaskRecordExecutionReadModels } from "@/features/execution/lib/list-task-record-execution-read-models"
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
      id: projectTable.id,
      isAutopickEnabled: projectTable.isAutopickEnabled,
    })
    .from(projectTable)
    .where(eq(projectTable.id, projectId))
    .then((rows) => rows[0] ?? null)

  if (!project) {
    return null
  }

  const taskRecords = await listTaskRecordExecutionReadModels({
    projectId,
    recordId: null,
    taskId: null,
  })

  const summary = {
    activeCount: taskRecords.filter(
      (taskRecord) =>
        taskRecord.state === "picked_up" || taskRecord.state === "in_progress",
    ).length,
    failedCount: taskRecords.filter((taskRecord) => {
      if (
        taskRecord.state === "failed" ||
        taskRecord.state === "picked_up_failed" ||
        taskRecord.state === "completed_failed" ||
        taskRecord.state === "failed_failed"
      ) {
        return true
      }

      return taskRecord.latestAgentRun
        ? isFailedAgentRunState(taskRecord.latestAgentRun.state)
        : false
    }).length,
    retriedCount: taskRecords.filter(
      (taskRecord) => taskRecord.attemptCount > 1,
    ).length,
    waitingCount: taskRecords.filter(
      (taskRecord) => taskRecord.state === "waiting",
    ).length,
  }

  return {
    isAutopickEnabled: project.isAutopickEnabled,
    summary,
    taskRecords,
  }
}
