import { TRPCError } from "@trpc/server"
import { and, desc, eq, or } from "drizzle-orm"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { activityLogTable } from "@/features/record-edges/db"
import { db } from "@/lib/db"

type ListRecordEdgeActivityForRecordParams = {
  organizationSlug: string
  projectSlug: string
  recordId: string
  userId: string
}

export const listRecordEdgeActivityForRecord = async ({
  organizationSlug,
  projectSlug,
  recordId,
  userId,
}: ListRecordEdgeActivityForRecordParams) => {
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

  return db
    .select({
      actorId: activityLogTable.actorId,
      actorType: activityLogTable.actorType,
      createdAt: activityLogTable.createdAt,
      entityId: activityLogTable.entityId,
      eventType: activityLogTable.eventType,
      id: activityLogTable.id,
      payload: activityLogTable.payload,
    })
    .from(activityLogTable)
    .where(
      or(
        and(
          eq(activityLogTable.projectId, project.id),
          eq(activityLogTable.recordId, recordId),
        ),
        and(
          eq(activityLogTable.relatedProjectId, project.id),
          eq(activityLogTable.relatedRecordId, recordId),
        ),
      ),
    )
    .orderBy(desc(activityLogTable.createdAt))
}
