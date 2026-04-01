import { and, desc, eq, inArray, or } from "drizzle-orm"
import { activityLogTable } from "@/features/observability/db"
import { projectSchemaVersionTable } from "@/features/project-schema/db"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { recordTable } from "@/features/records/db"
import { taskRecordTable } from "@/features/task-records/db"
import { taskTable } from "@/features/tasks/db"
import { db } from "@/lib/db"

type GetProjectSchemaSettingsReadModelParams = {
  organizationSlug: string
  projectSlug: string
  userId: string
}

const getMigrationStatus = ({
  failedCount,
  inProgressCount,
  pendingRecordCount,
  waitingCount,
}: {
  failedCount: number
  inProgressCount: number
  pendingRecordCount: number
  waitingCount: number
}): "completed" | "failed" | "in_progress" | "pending" | "queued" => {
  if (pendingRecordCount === 0) {
    return "completed"
  }

  if (failedCount > 0) {
    return "failed"
  }

  if (inProgressCount > 0) {
    return "in_progress"
  }

  if (waitingCount > 0) {
    return "queued"
  }

  return "pending"
}

export const getProjectSchemaSettingsReadModel = async ({
  organizationSlug,
  projectSlug,
  userId,
}: GetProjectSchemaSettingsReadModelParams) => {
  const project = await ensureProjectAccess({
    organizationSlug,
    projectSlug,
    userId,
  })

  if (!project) {
    return null
  }

  const versions = await db
    .select({
      createdAt: projectSchemaVersionTable.createdAt,
      id: projectSchemaVersionTable.id,
      parentVersionId: projectSchemaVersionTable.parentVersionId,
      schemaDefinition: projectSchemaVersionTable.schemaDefinition,
      version: projectSchemaVersionTable.version,
    })
    .from(projectSchemaVersionTable)
    .where(eq(projectSchemaVersionTable.projectId, project.id))
    .orderBy(desc(projectSchemaVersionTable.version))

  const versionIds = versions.map((version) => version.id)
  const records = await db
    .select({ id: recordTable.id, schemaVersion: recordTable.schemaVersion })
    .from(recordTable)
    .where(eq(recordTable.projectId, project.id))

  const migrationTasks =
    versionIds.length === 0
      ? []
      : await db
          .select({
            id: taskTable.id,
            schemaVersion: taskTable.schemaVersion,
            sortOrder: taskTable.sortOrder,
            sourceSchemaVersionId: taskTable.sourceSchemaVersionId,
            targetSchemaVersionId: taskTable.targetSchemaVersionId,
            title: taskTable.title,
          })
          .from(taskTable)
          .where(
            and(
              eq(taskTable.projectId, project.id),
              or(
                inArray(taskTable.sourceSchemaVersionId, versionIds),
                inArray(taskTable.targetSchemaVersionId, versionIds),
              ),
            ),
          )

  const migrationTaskIds = migrationTasks.map((task) => task.id)
  const migrationTaskRecords =
    migrationTaskIds.length === 0
      ? []
      : await db
          .select({
            state: taskRecordTable.state,
            taskId: taskRecordTable.taskId,
          })
          .from(taskRecordTable)
          .where(inArray(taskRecordTable.taskId, migrationTaskIds))

  const latestSchemaActivity =
    versionIds.length === 0 && migrationTaskIds.length === 0
      ? []
      : migrationTaskIds.length === 0
        ? await db
            .select({
              createdAt: activityLogTable.createdAt,
              entityId: activityLogTable.entityId,
              entityType: activityLogTable.entityType,
              eventType: activityLogTable.eventType,
              id: activityLogTable.id,
              payload: activityLogTable.payload,
              taskId: activityLogTable.taskId,
              taskTitle: taskTable.title,
            })
            .from(activityLogTable)
            .leftJoin(taskTable, eq(activityLogTable.taskId, taskTable.id))
            .where(
              and(
                eq(activityLogTable.projectId, project.id),
                eq(activityLogTable.entityType, "projectSchemaVersion"),
                inArray(activityLogTable.entityId, versionIds),
              ),
            )
            .orderBy(desc(activityLogTable.createdAt))
            .limit(10)
        : await db
            .select({
              createdAt: activityLogTable.createdAt,
              entityId: activityLogTable.entityId,
              entityType: activityLogTable.entityType,
              eventType: activityLogTable.eventType,
              id: activityLogTable.id,
              payload: activityLogTable.payload,
              taskId: activityLogTable.taskId,
              taskTitle: taskTable.title,
            })
            .from(activityLogTable)
            .leftJoin(taskTable, eq(activityLogTable.taskId, taskTable.id))
            .where(
              and(
                eq(activityLogTable.projectId, project.id),
                or(
                  and(
                    eq(activityLogTable.entityType, "projectSchemaVersion"),
                    inArray(activityLogTable.entityId, versionIds),
                  ),
                  inArray(activityLogTable.taskId, migrationTaskIds),
                ),
              ),
            )
            .orderBy(desc(activityLogTable.createdAt))
            .limit(10)

  const activeVersion = versions.find(
    (version) => version.id === project.activeSchemaVersionId,
  )

  return {
    activeVersion,
    latestSchemaActivity,
    totalRecordCount: records.length,
    versions: versions.map((version) => {
      const migrationTask =
        migrationTasks.find(
          (task) => task.targetSchemaVersionId === version.id,
        ) ?? null
      const linkedTaskRecords = migrationTask
        ? migrationTaskRecords.filter(
            (taskRecord) => taskRecord.taskId === migrationTask.id,
          )
        : []
      const pendingRecordCount = records.filter(
        (record) => record.schemaVersion < version.version,
      ).length
      const completedCount = linkedTaskRecords.filter(
        (taskRecord) => taskRecord.state === "completed",
      ).length
      const failedCount = linkedTaskRecords.filter(
        (taskRecord) => taskRecord.state === "failed",
      ).length
      const inProgressCount = linkedTaskRecords.filter(
        (taskRecord) =>
          taskRecord.state === "picked_up" ||
          taskRecord.state === "in_progress",
      ).length
      const waitingCount = linkedTaskRecords.filter(
        (taskRecord) => taskRecord.state === "waiting",
      ).length

      return {
        ...version,
        isActive: version.id === project.activeSchemaVersionId,
        migration: {
          affectedRecordCount:
            migrationTask === null
              ? pendingRecordCount
              : linkedTaskRecords.length,
          completedCount,
          failedCount,
          inProgressCount,
          pendingRecordCount,
          status: getMigrationStatus({
            failedCount,
            inProgressCount,
            pendingRecordCount,
            waitingCount,
          }),
          taskId: migrationTask?.id ?? null,
          taskTitle: migrationTask?.title ?? null,
          waitingCount,
        },
      }
    }),
  }
}
