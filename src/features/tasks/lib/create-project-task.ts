import { eq, sql } from "drizzle-orm"
import { taskTable } from "@/features/tasks/db"
import { publishTask } from "@/features/tasks/lib/publish-task"
import type { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type DatabaseClient = Pick<
  typeof db,
  "execute" | "insert" | "select" | "update"
>

type CreateProjectTaskParams = {
  createdByUserId: string | null
  database: DatabaseClient
  descriptionMarkdown: string
  model: string | null
  temperature: number | null
  organizationId: string
  projectId: string
  schemaVersion: number
  sourceSchemaVersionId: string | null
  targetSchemaVersionId: string | null
  title: string
}

export const createProjectTask = async ({
  createdByUserId,
  database,
  descriptionMarkdown,
  model,
  temperature,
  organizationId,
  projectId,
  schemaVersion,
  sourceSchemaVersionId,
  targetSchemaVersionId,
  title,
}: CreateProjectTaskParams) => {
  const nextSortOrder = await database
    .select({
      sortOrder: sql<number>`coalesce(max(${taskTable.sortOrder}), 0) + 1`,
    })
    .from(taskTable)
    .where(eq(taskTable.projectId, projectId))
    .then((rows) => rows[0]?.sortOrder ?? 1)

  const [task] = await database
    .insert(taskTable)
    .values({
      descriptionMarkdown,
      idempotencyKey: crypto.randomUUID(),
      model,
      temperature,
      projectId,
      schemaVersion,
      sortOrder: nextSortOrder,
      sourceSchemaVersionId,
      targetSchemaVersionId,
      title,
    })
    .returning({
      createdAt: taskTable.createdAt,
      descriptionMarkdown: taskTable.descriptionMarkdown,
      id: taskTable.id,
      model: taskTable.model,
      temperature: taskTable.temperature,
      projectId: taskTable.projectId,
      schemaVersion: taskTable.schemaVersion,
      sortOrder: taskTable.sortOrder,
      sourceSchemaVersionId: taskTable.sourceSchemaVersionId,
      state: taskTable.state,
      targetSchemaVersionId: taskTable.targetSchemaVersionId,
      title: taskTable.title,
      updatedAt: taskTable.updatedAt,
    })

  await database
    .update(taskTable)
    .set({ acceptedBy: createdByUserId, proposedBy: null, state: "accepted" })
    .where(eq(taskTable.id, task.id))

  const publishedTask = await publishTask({
    createdByUserId,
    database,
    organizationId,
    task,
  })

  logger.info({ projectId, taskId: task.id }, "Created project task")

  return publishedTask ?? task
}
