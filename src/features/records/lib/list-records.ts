import { TRPCError } from "@trpc/server"
import { desc, eq } from "drizzle-orm"
import { agentRunTable } from "@/features/agent-runs/db"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { recordTable } from "@/features/records/db"
import { taskRecordTable } from "@/features/task-records/db"
import { taskTable } from "@/features/tasks/db"
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
    .orderBy(desc(recordTable.updatedAt))

  const recordIds = records.map((record) => record.id)

  const taskRecords =
    recordIds.length > 0
      ? await db
          .select({
            agentRunId: taskRecordTable.agentRunId,
            recordId: taskRecordTable.recordId,
            state: taskRecordTable.state,
            taskId: taskRecordTable.taskId,
          })
          .from(taskRecordTable)
      : []

  const activeAgentRunIds = taskRecords
    .map((taskRecord) => taskRecord.agentRunId)
    .filter((agentRunId) => agentRunId !== null)

  const agentRuns =
    activeAgentRunIds.length > 0
      ? await db
          .select({
            id: agentRunTable.id,
            selectedModel: agentRunTable.selectedModel,
            state: agentRunTable.state,
          })
          .from(agentRunTable)
      : []

  const tasks = await db
    .select({
      id: taskTable.id,
      title: taskTable.title,
    })
    .from(taskTable)
    .where(eq(taskTable.projectId, project.id))

  const taskMap = new Map(tasks.map((task) => [task.id, task]))
  const agentRunMap = new Map(
    agentRuns.map((agentRun) => [agentRun.id, agentRun]),
  )

  return records.map((record) => {
    const linkedTaskRecords = taskRecords.filter(
      (taskRecord) => taskRecord.recordId === record.id,
    )
    const activeRun =
      linkedTaskRecords
        .map((taskRecord) =>
          taskRecord.agentRunId !== null
            ? (agentRunMap.get(taskRecord.agentRunId) ?? null)
            : null,
        )
        .find((agentRun) => agentRun !== null) ?? null

    return {
      ...record,
      activeRun,
      linkedTasks: linkedTaskRecords.map((taskRecord) => ({
        state: taskRecord.state,
        taskId: taskRecord.taskId,
        title: taskMap.get(taskRecord.taskId)?.title ?? "Unknown task",
      })),
      progress: {
        completedCount: linkedTaskRecords.filter(
          (taskRecord) => taskRecord.state === "completed",
        ).length,
        failedCount: linkedTaskRecords.filter(
          (taskRecord) => taskRecord.state === "failed",
        ).length,
        inProgressCount: linkedTaskRecords.filter(
          (taskRecord) =>
            taskRecord.state === "picked_up" ||
            taskRecord.state === "in_progress",
        ).length,
        totalCount: linkedTaskRecords.length,
        waitingCount: linkedTaskRecords.filter(
          (taskRecord) => taskRecord.state === "waiting",
        ).length,
      },
    }
  })
}
