import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { agentRunTable } from "@/features/agent-runs/db"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { recordTable } from "@/features/records/db"
import { taskRecordTable } from "@/features/task-records/db"
import { taskTable } from "@/features/tasks/db"
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

  const linkedTaskRecords = await db
    .select({
      agentRunId: taskRecordTable.agentRunId,
      errorCode: taskRecordTable.errorCode,
      lastTransitionAt: taskRecordTable.lastTransitionAt,
      state: taskRecordTable.state,
      taskId: taskTable.id,
      taskRecordId: taskRecordTable.id,
      title: taskTable.title,
    })
    .from(taskRecordTable)
    .innerJoin(taskTable, eq(taskRecordTable.taskId, taskTable.id))
    .where(eq(taskRecordTable.recordId, recordId))

  const agentRunIds = linkedTaskRecords
    .map((taskRecord) => taskRecord.agentRunId)
    .filter((agentRunId) => agentRunId !== null)

  const agentRuns =
    agentRunIds.length > 0
      ? await db
          .select({
            id: agentRunTable.id,
            selectedAgent: agentRunTable.selectedAgent,
            selectedModel: agentRunTable.selectedModel,
            state: agentRunTable.state,
            taskRecordId: agentRunTable.taskRecordId,
            updatedAt: agentRunTable.updatedAt,
          })
          .from(agentRunTable)
      : []

  const agentRunMap = new Map(
    agentRuns.map((agentRun) => [agentRun.id, agentRun]),
  )

  return {
    ...record,
    activeRunSummary:
      linkedTaskRecords
        .map((taskRecord) =>
          taskRecord.agentRunId !== null
            ? (agentRunMap.get(taskRecord.agentRunId) ?? null)
            : null,
        )
        .find((agentRun) => agentRun !== null) ?? null,
    linkedTasks: linkedTaskRecords.map((taskRecord) => ({
      ...taskRecord,
      latestAgentRun:
        taskRecord.agentRunId !== null
          ? (agentRunMap.get(taskRecord.agentRunId) ?? null)
          : null,
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
}
