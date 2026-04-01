import { TRPCError } from "@trpc/server"
import { desc, eq } from "drizzle-orm"
import { agentRunTable } from "@/features/agent-runs/db"
import { activeAgentRunStates } from "@/features/agent-runs/schemas/agent-run-state"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { recordTable } from "@/features/records/db"
import { taskRecordTable } from "@/features/task-records/db"
import { taskTable } from "@/features/tasks/db"
import { getDerivedTaskSummaryState } from "@/features/tasks/lib/get-derived-task-summary-state"
import { db } from "@/lib/db"

const isActiveAgentRunState = (state: string) =>
  activeAgentRunStates.some((activeState) => activeState === state)

type GetProjectOverviewParams = {
  organizationSlug: string
  projectSlug: string
  userId: string
}

export const getProjectOverview = async ({
  organizationSlug,
  projectSlug,
  userId,
}: GetProjectOverviewParams) => {
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

  const [records, tasks, taskRecords, agentRuns] = await Promise.all([
    db
      .select({
        createdAt: recordTable.createdAt,
        id: recordTable.id,
        name: recordTable.name,
        updatedAt: recordTable.updatedAt,
      })
      .from(recordTable)
      .where(eq(recordTable.projectId, project.id))
      .orderBy(desc(recordTable.updatedAt)),
    db
      .select({
        createdAt: taskTable.createdAt,
        id: taskTable.id,
        title: taskTable.title,
        updatedAt: taskTable.updatedAt,
      })
      .from(taskTable)
      .where(eq(taskTable.projectId, project.id))
      .orderBy(desc(taskTable.updatedAt)),
    db
      .select({
        id: taskRecordTable.id,
        recordId: taskRecordTable.recordId,
        state: taskRecordTable.state,
        taskId: taskRecordTable.taskId,
      })
      .from(taskRecordTable),
    db
      .select({
        id: agentRunTable.id,
        state: agentRunTable.state,
        taskRecordId: agentRunTable.taskRecordId,
        updatedAt: agentRunTable.updatedAt,
      })
      .from(agentRunTable)
      .orderBy(desc(agentRunTable.updatedAt)),
  ])

  const recordIds = new Set(records.map((record) => record.id))
  const taskIds = new Set(tasks.map((task) => task.id))
  const scopedTaskRecords = taskRecords.filter(
    (taskRecord) =>
      recordIds.has(taskRecord.recordId) && taskIds.has(taskRecord.taskId),
  )
  const scopedTaskRecordIds = new Set(
    scopedTaskRecords.map((taskRecord) => taskRecord.id),
  )
  const activeRunCount = agentRuns.filter(
    (agentRun) =>
      scopedTaskRecordIds.has(agentRun.taskRecordId) &&
      isActiveAgentRunState(agentRun.state),
  ).length

  const recentActivity = [
    ...tasks.slice(0, 3).map((task) => ({
      id: task.id,
      label: task.title,
      timestamp: task.updatedAt,
      tone: "info",
      type: "task.updated",
    })),
    ...records.slice(0, 3).map((record) => ({
      id: record.id,
      label: record.name,
      timestamp: record.updatedAt,
      tone: "muted",
      type: "record.updated",
    })),
  ]
    .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime())
    .slice(0, 6)

  const taskSummaries = tasks.slice(0, 5).map((task) => {
    const states = scopedTaskRecords
      .filter((taskRecord) => taskRecord.taskId === task.id)
      .map((taskRecord) => taskRecord.state)

    return {
      id: task.id,
      title: task.title,
      updatedAt: task.updatedAt,
      summaryState: getDerivedTaskSummaryState({ states }),
    }
  })

  return {
    activeRunCount,
    metrics: {
      recordCount: records.length,
      taskCount: tasks.length,
      taskRecordCount: scopedTaskRecords.length,
    },
    recentActivity,
    recentRecords: records.slice(0, 5),
    recentTasks: taskSummaries,
  }
}
