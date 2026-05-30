import { eq, sql } from "drizzle-orm"
import { taskTable } from "@/features/tasks/db"
import { createTaskActor } from "@/features/tasks/lib/task-machine"
import type { TaskInput } from "@/features/tasks/schemas/task-input"
import type { db } from "@/lib/db"
import { generateUuidV7Values } from "@/lib/db/generate-uuid-v7-values"

type DatabaseClient = Pick<typeof db, "execute" | "insert" | "select">

type CreateTaskDraftParams = {
  database: DatabaseClient
  input: TaskInput
  projectId: string
  proposedByUserId: string | null
}

export const createTaskDraft = async ({
  database,
  input,
  projectId,
  proposedByUserId,
}: CreateTaskDraftParams) => {
  const nextSortOrder = await database
    .select({
      sortOrder: sql<number>`coalesce(max(${taskTable.sortOrder}), 0) + 1`,
    })
    .from(taskTable)
    .where(eq(taskTable.projectId, projectId))
    .then((rows) => rows[0]?.sortOrder ?? 1)

  const generatedIds = await generateUuidV7Values({ count: 1, database })
  const taskId = generatedIds[0]

  if (!taskId) {
    throw new Error("Task id could not be generated.")
  }

  await createTaskActor(taskId, {
    acceptedBy: null,
    descriptionMarkdown: input.descriptionMarkdown,
    idempotencyKey: crypto.randomUUID(),
    model: input.model,
    temperature: input.temperature,
    projectId,
    proposedBy: proposedByUserId,
    rejectedBy: null,
    schemaVersion: input.schemaVersion,
    sortOrder: nextSortOrder,
    sourceSchemaVersionId: null,
    targetSchemaVersionId: null,
    title: input.title,
  })

  return database
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
    .where(eq(taskTable.id, taskId))
    .then((rows) => rows[0] ?? null)
}
