import { desc, eq } from "drizzle-orm"
import { taskDefinitionVersionTable, taskTable } from "@/features/tasks/db"
import { createTaskDefinitionVersion } from "@/features/tasks/lib/create-task-definition-version"
import type { db } from "@/lib/db"

type DatabaseClient = Pick<typeof db, "insert" | "select">

type GetCurrentTaskDefinitionVersionParams = {
  createdByUserId: string | null
  database: DatabaseClient
  taskId: string
}

export const getCurrentTaskDefinitionVersion = async ({
  createdByUserId,
  database,
  taskId,
}: GetCurrentTaskDefinitionVersionParams) => {
  const currentVersion = await database
    .select({ id: taskDefinitionVersionTable.id })
    .from(taskDefinitionVersionTable)
    .where(eq(taskDefinitionVersionTable.taskId, taskId))
    .orderBy(desc(taskDefinitionVersionTable.versionNumber))
    .then((rows) => rows[0] ?? null)

  if (currentVersion) {
    return currentVersion
  }

  const task = await database
    .select({
      descriptionMarkdown: taskTable.descriptionMarkdown,
      id: taskTable.id,
      model: taskTable.model,
      schemaVersion: taskTable.schemaVersion,
      sourceSchemaVersionId: taskTable.sourceSchemaVersionId,
      targetSchemaVersionId: taskTable.targetSchemaVersionId,
      temperature: taskTable.temperature,
      title: taskTable.title,
    })
    .from(taskTable)
    .where(eq(taskTable.id, taskId))
    .then((rows) => rows[0] ?? null)

  if (!task) {
    return null
  }

  return createTaskDefinitionVersion({ createdByUserId, database, task })
}
