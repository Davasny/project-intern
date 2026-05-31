import { and, eq, sql } from "drizzle-orm"
import { recordTable } from "@/features/records/db"
import { taskTable } from "@/features/tasks/db"
import { workRecordTable } from "@/features/work-records/db"
import { db } from "@/lib/db"

type FinalizeProjectSchemaMigrationParams = {
  taskId: string
}

export const finalizeProjectSchemaMigration = async ({
  taskId,
}: FinalizeProjectSchemaMigrationParams) => {
  const task = await db
    .select({
      id: taskTable.id,
      projectId: taskTable.projectId,
      schemaVersion: taskTable.schemaVersion,
      targetSchemaVersionId: taskTable.targetSchemaVersionId,
    })
    .from(taskTable)
    .where(eq(taskTable.id, taskId))
    .then((rows) => rows[0] ?? null)

  if (!task?.targetSchemaVersionId) {
    return null
  }

  const workRecords = await db
    .select({ state: workRecordTable.state })
    .from(workRecordTable)
    .where(eq(workRecordTable.taskId, task.id))

  if (
    workRecords.some(
      (workRecord) =>
        workRecord.state !== "completed" && workRecord.state !== "skipped",
    )
  ) {
    return null
  }

  const outdatedRecord = await db
    .select({ id: recordTable.id })
    .from(recordTable)
    .where(
      and(
        eq(recordTable.projectId, task.projectId),
        sql`${recordTable.schemaVersion} < ${task.schemaVersion}`,
      ),
    )
    .then((rows) => rows[0] ?? null)

  if (outdatedRecord) {
    return null
  }

  return { schemaVersion: task.schemaVersion, taskId: task.id }
}
