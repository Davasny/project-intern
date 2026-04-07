import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { taskTable } from "@/features/tasks/db"
import { getTaskActor } from "@/features/tasks/lib/task-machine"
import type { db } from "@/lib/db"

type DatabaseClient = Pick<typeof db, "select">

type RejectTaskDraftParams = {
  database: DatabaseClient
  projectId: string
  rejectedByUserId: string
  taskId: string
}

export const rejectTaskDraft = async ({
  database,
  projectId,
  rejectedByUserId,
  taskId,
}: RejectTaskDraftParams) => {
  const task = await database
    .select({
      id: taskTable.id,
      state: taskTable.state,
    })
    .from(taskTable)
    .where(and(eq(taskTable.id, taskId), eq(taskTable.projectId, projectId)))
    .then((rows) => rows[0] ?? null)

  if (!task) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Task draft was not found.",
    })
  }

  if (task.state !== "created") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only task drafts in created state can be rejected.",
    })
  }

  const actor = await getTaskActor(taskId)
  const rejectedActor = await actor.send("reject", {
    rejectedByUserId,
    taskId,
  })

  if (rejectedActor.state !== "rejected") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Task draft could not be rejected from its current state.",
    })
  }

  return database
    .select({
      createdAt: taskTable.createdAt,
      descriptionMarkdown: taskTable.descriptionMarkdown,
      id: taskTable.id,
      model: taskTable.model,
      schemaVersion: taskTable.schemaVersion,
      sortOrder: taskTable.sortOrder,
      sourceSchemaVersionId: taskTable.sourceSchemaVersionId,
      state: taskTable.state,
      targetSchemaVersionId: taskTable.targetSchemaVersionId,
      title: taskTable.title,
      updatedAt: taskTable.updatedAt,
    })
    .from(taskTable)
    .where(eq(taskTable.id, taskId))
    .then((rows) => rows[0] ?? null)
}
