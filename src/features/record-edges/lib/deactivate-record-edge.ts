import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { recordEdgeTable } from "@/features/record-edges/db"
import { createActivityLog } from "@/features/record-edges/lib/create-activity-log"
import { ensureRecordInProject } from "@/features/record-edges/lib/ensure-record-in-project"
import { getRecordEdgeActor } from "@/features/record-edges/lib/get-record-edge-actor"
import { getScopedRecordEdge } from "@/features/record-edges/lib/get-scoped-record-edge"
import type { RelationDeactivateInput } from "@/features/record-edges/schemas/relation-input"
import { db } from "@/lib/db"

type DeactivateRecordEdgeParams = {
  input: RelationDeactivateInput
  organizationSlug: string
  projectSlug: string
  userId: string
}

export const deactivateRecordEdge = async ({
  input,
  organizationSlug,
  projectSlug,
  userId,
}: DeactivateRecordEdgeParams) => {
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

  const recordEdge = await getScopedRecordEdge({
    projectId: project.id,
    recordEdgeId: input.recordEdgeId,
    recordId: input.recordId,
  })

  if (recordEdge.state !== "active") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only active relations can be deactivated.",
    })
  }

  const actor = await getRecordEdgeActor(recordEdge.id)
  const nextMetadata = {
    ...recordEdge.metadata,
    deactivatedByUserId: userId,
    deactivatedFromRecordId: input.recordId,
  }
  await actor.send("deactivate", {
    createdByTaskId: recordEdge.createdByTaskId,
    direction: recordEdge.direction,
    fromProjectId: recordEdge.fromProjectId,
    fromRecordId: recordEdge.fromRecordId,
    metadata: nextMetadata,
    relationType: recordEdge.relationType,
    toProjectId: recordEdge.toProjectId,
    toRecordId: recordEdge.toRecordId,
  })

  const sourceRecord = await ensureRecordInProject({
    projectId: recordEdge.fromProjectId,
    recordId: recordEdge.fromRecordId,
  })
  const targetRecord = await ensureRecordInProject({
    projectId: recordEdge.toProjectId,
    recordId: recordEdge.toRecordId,
  })

  await createActivityLog({
    actorId: userId,
    actorType: "user",
    entityId: recordEdge.id,
    eventType: "recordEdge.deactivated",
    payload: {
      direction: recordEdge.direction,
      relatedProjectId: recordEdge.toProjectId,
      relatedRecordName: targetRecord.name,
      relationType: recordEdge.relationType,
      sourceRecordName: sourceRecord.name,
    },
    projectId: recordEdge.fromProjectId,
    recordId: recordEdge.fromRecordId,
    relatedProjectId: recordEdge.toProjectId,
    relatedRecordId: recordEdge.toRecordId,
  })

  return db
    .select({
      createdAt: recordEdgeTable.createdAt,
      direction: recordEdgeTable.direction,
      fromProjectId: recordEdgeTable.fromProjectId,
      fromRecordId: recordEdgeTable.fromRecordId,
      id: recordEdgeTable.id,
      metadata: recordEdgeTable.metadata,
      relationType: recordEdgeTable.relationType,
      state: recordEdgeTable.state,
      toProjectId: recordEdgeTable.toProjectId,
      toRecordId: recordEdgeTable.toRecordId,
      updatedAt: recordEdgeTable.updatedAt,
    })
    .from(recordEdgeTable)
    .where(eq(recordEdgeTable.id, recordEdge.id))
    .then((rows) => rows[0] ?? null)
}
