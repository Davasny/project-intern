import { TRPCError } from "@trpc/server"
import { and, eq, inArray, sql } from "drizzle-orm"
import { createActivityLogEvent } from "@/features/observability/lib/create-activity-log-event"
import { projectSchemaVersionTable } from "@/features/project-schema/db"
import { projectTable } from "@/features/projects/db"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { recordTable } from "@/features/records/db"
import { taskTable } from "@/features/tasks/db"
import { db } from "@/lib/db"

type CollapseProjectSchemaHistoryParams = {
  organizationSlug: string
  projectSlug: string
  userId: string
}

export const collapseProjectSchemaHistory = async ({
  organizationSlug,
  projectSlug,
  userId,
}: CollapseProjectSchemaHistoryParams) => {
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

  return db.transaction(async (tx) => {
    const [{ count }] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(recordTable)
      .where(eq(recordTable.projectId, project.id))

    if (count > 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Cannot merge schema history while records exist. Remove all records first.",
      })
    }

    if (!project.activeSchemaVersionId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Active schema version not found.",
      })
    }

    const activeSchemaVersion = await tx
      .select()
      .from(projectSchemaVersionTable)
      .where(
        and(
          eq(projectSchemaVersionTable.projectId, project.id),
          eq(projectSchemaVersionTable.id, project.activeSchemaVersionId),
        ),
      )
      .then((rows) => rows[0] ?? null)

    if (!activeSchemaVersion) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Active schema version not found.",
      })
    }

    const allVersions = await tx
      .select({
        id: projectSchemaVersionTable.id,
        version: projectSchemaVersionTable.version,
      })
      .from(projectSchemaVersionTable)
      .where(eq(projectSchemaVersionTable.projectId, project.id))

    if (
      allVersions.length === 1 &&
      allVersions[0]?.id === activeSchemaVersion.id &&
      activeSchemaVersion.version === 1
    ) {
      return { success: true, merged: false }
    }

    const removableVersionIds = allVersions
      .map((v) => v.id)
      .filter((id) => id !== activeSchemaVersion.id)

    if (removableVersionIds.length > 0) {
      await tx
        .delete(taskTable)
        .where(
          and(
            eq(taskTable.projectId, project.id),
            inArray(taskTable.sourceSchemaVersionId, removableVersionIds),
          ),
        )
      await tx
        .delete(taskTable)
        .where(
          and(
            eq(taskTable.projectId, project.id),
            inArray(taskTable.targetSchemaVersionId, removableVersionIds),
          ),
        )
    }

    if (removableVersionIds.length > 0) {
      await tx
        .delete(projectSchemaVersionTable)
        .where(inArray(projectSchemaVersionTable.id, removableVersionIds))
    }

    await tx
      .update(projectSchemaVersionTable)
      .set({
        version: 1,
        parentVersionId: null,
        state: "accepted",
        proposedBy: null,
      })
      .where(eq(projectSchemaVersionTable.id, activeSchemaVersion.id))

    await tx
      .update(projectTable)
      .set({ activeSchemaVersionId: activeSchemaVersion.id })
      .where(eq(projectTable.id, project.id))

    await createActivityLogEvent({
      actorId: userId,
      actorType: "user",
      agentRunId: null,
      database: tx,
      entityId: activeSchemaVersion.id,
      entityType: "projectSchemaVersion",
      eventType: "schema.history_merged_to_v1",
      organizationId: project.organizationId,
      payload: {
        previousVersionCount: allVersions.length,
        removedVersionIds: removableVersionIds,
      },
      projectId: project.id,
      recordId: null,
      relatedProjectId: null,
      relatedRecordId: null,
      taskId: null,
      taskRecordId: null,
    })

    return { success: true, merged: true }
  })
}
