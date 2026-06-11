import { desc, eq } from "drizzle-orm"
import { taskDefinitionVersionTable } from "@/features/tasks/db"
import type { TaskDefinitionVersionSource } from "@/features/tasks/lib/task-definition-version-types"
import type { db } from "@/lib/db"

type DatabaseClient = Pick<typeof db, "insert" | "select">

type CreateTaskDefinitionVersionParams = {
  createdByUserId: string | null
  database: DatabaseClient
  task: TaskDefinitionVersionSource
}

export const createTaskDefinitionVersion = async ({
  createdByUserId,
  database,
  task,
}: CreateTaskDefinitionVersionParams) => {
  const latestVersion = await database
    .select({ versionNumber: taskDefinitionVersionTable.versionNumber })
    .from(taskDefinitionVersionTable)
    .where(eq(taskDefinitionVersionTable.taskId, task.id))
    .orderBy(desc(taskDefinitionVersionTable.versionNumber))
    .then((rows) => rows[0] ?? null)

  const versionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1

  return database
    .insert(taskDefinitionVersionTable)
    .values({
      createdByUserId,
      descriptionMarkdown: task.descriptionMarkdown,
      model: task.model,
      schemaVersion: task.schemaVersion,
      sourceSchemaVersionId: task.sourceSchemaVersionId,
      targetSchemaVersionId: task.targetSchemaVersionId,
      taskId: task.id,
      temperature: task.temperature,
      title: task.title,
      versionNumber,
    })
    .returning()
    .then((rows) => rows[0] ?? null)
}
