import { and, desc, eq, inArray, or } from "drizzle-orm"
import { projectSchemaVersionTable } from "@/features/project-schema/db"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { recordTable } from "@/features/records/db"
import { taskTable } from "@/features/tasks/db"
import { workRecordTable } from "@/features/work-records/db"
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
      state: projectSchemaVersionTable.state,
      version: projectSchemaVersionTable.version,
    })
    .from(projectSchemaVersionTable)
    .where(
      and(
        eq(projectSchemaVersionTable.projectId, project.id),
        or(
          eq(projectSchemaVersionTable.state, "accepted"),
          eq(projectSchemaVersionTable.state, "rejected"),
        ),
      ),
    )
    .orderBy(desc(projectSchemaVersionTable.version))

  const pendingProposals = await db
    .select({
      createdAt: projectSchemaVersionTable.createdAt,
      id: projectSchemaVersionTable.id,
      parentVersionId: projectSchemaVersionTable.parentVersionId,
      proposedBy: projectSchemaVersionTable.proposedBy,
      schemaDefinition: projectSchemaVersionTable.schemaDefinition,
      state: projectSchemaVersionTable.state,
      version: projectSchemaVersionTable.version,
    })
    .from(projectSchemaVersionTable)
    .where(
      and(
        eq(projectSchemaVersionTable.projectId, project.id),
        eq(projectSchemaVersionTable.state, "created"),
      ),
    )
    .orderBy(desc(projectSchemaVersionTable.version))

  const acceptedVersionIds = versions
    .filter((version) => version.state === "accepted")
    .map((version) => version.id)
  const records = await db
    .select({ id: recordTable.id, schemaVersion: recordTable.schemaVersion })
    .from(recordTable)
    .where(eq(recordTable.projectId, project.id))

  const migrationTasks =
    acceptedVersionIds.length === 0
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
                inArray(taskTable.sourceSchemaVersionId, acceptedVersionIds),
                inArray(taskTable.targetSchemaVersionId, acceptedVersionIds),
              ),
            ),
          )

  const migrationTaskIds = migrationTasks.map((task) => task.id)
  const migrationWorkRecords =
    migrationTaskIds.length === 0
      ? []
      : await db
          .select({
            state: workRecordTable.state,
            taskId: workRecordTable.taskId,
          })
          .from(workRecordTable)
          .where(inArray(workRecordTable.taskId, migrationTaskIds))

  const activeVersion = versions.find(
    (version) => version.id === project.activeSchemaVersionId,
  )

  return {
    activeVersion,
    pendingProposals,
    totalRecordCount: records.length,
    versions: versions.map((version) => {
      const migrationTask =
        migrationTasks.find(
          (task) => task.targetSchemaVersionId === version.id,
        ) ?? null
      const linkedWorkRecords = migrationTask
        ? migrationWorkRecords.filter(
            (workRecord) => workRecord.taskId === migrationTask.id,
          )
        : []
      const pendingRecordCount = records.filter(
        (record) => record.schemaVersion < version.version,
      ).length
      const completedCount = linkedWorkRecords.filter(
        (workRecord) => workRecord.state === "completed",
      ).length
      const failedCount = linkedWorkRecords.filter(
        (workRecord) => workRecord.state === "failed",
      ).length
      const inProgressCount = linkedWorkRecords.filter(
        (workRecord) =>
          workRecord.state === "picked_up" ||
          workRecord.state === "in_progress",
      ).length
      const waitingCount = linkedWorkRecords.filter(
        (workRecord) => workRecord.state === "waiting",
      ).length

      return {
        ...version,
        isActive: version.id === project.activeSchemaVersionId,
        migration: {
          ...(version.state === "rejected"
            ? {
                affectedRecordCount: 0,
                completedCount: 0,
                failedCount: 0,
                inProgressCount: 0,
                pendingRecordCount: 0,
                status: "rejected" as const,
                taskId: null,
                taskTitle: null,
                waitingCount: 0,
              }
            : {
                affectedRecordCount:
                  migrationTask === null
                    ? pendingRecordCount
                    : linkedWorkRecords.length,
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
              }),
        },
      }
    }),
  }
}
