import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { recordEdgeTable } from "@/features/record-edges/db"
import { ensureRecordInProject } from "@/features/record-edges/lib/ensure-record-in-project"
import { getScopedRecordEdge } from "@/features/record-edges/lib/get-scoped-record-edge"
import { getRecordEdgeActor } from "@/features/record-edges/lib/record-edge-machine"
import type { RelationUpdateInput } from "@/features/record-edges/schemas/relation-input"
import { db } from "@/lib/db"

type UpdateRecordEdgeParams = {
  input: RelationUpdateInput
  organizationSlug: string
  projectSlug: string
  userId: string
}

export const updateRecordEdge = async ({
  input,
  organizationSlug,
  projectSlug,
  userId,
}: UpdateRecordEdgeParams) => {
  const sourceProject = await ensureProjectAccess({
    organizationSlug,
    projectSlug,
    userId,
  })
  const targetProject = await ensureProjectAccess({
    organizationSlug,
    projectSlug: input.targetProjectSlug,
    userId,
  })

  if (!sourceProject || !targetProject) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to both relation projects.",
    })
  }

  const existingRecordEdge = await getScopedRecordEdge({
    projectId: sourceProject.id,
    recordEdgeId: input.recordEdgeId,
    recordId: input.recordId,
  })

  if (existingRecordEdge.fromRecordId !== input.recordId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only the source record can edit this relation.",
    })
  }

  if (existingRecordEdge.state !== "active") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only active relations can be edited.",
    })
  }

  const sourceRecord = await ensureRecordInProject({
    projectId: sourceProject.id,
    recordId: input.recordId,
  })
  const targetRecord = await ensureRecordInProject({
    projectId: targetProject.id,
    recordId: input.targetRecordId,
  })

  const actor = await getRecordEdgeActor(existingRecordEdge.id)

  await actor.send("edit", {
    byUserId: userId,
    direction: input.direction,
    edgeId: existingRecordEdge.id,
    fromProjectId: existingRecordEdge.fromProjectId,
    fromRecordId: existingRecordEdge.fromRecordId,
    fromRecordName: sourceRecord.name,
    metadata: input.metadata,
    previousRelationType: existingRecordEdge.relationType,
    relationType: input.relationType,
    toProjectDisplayName: targetProject.displayName,
    toProjectId: targetProject.id,
    toProjectSlug: targetProject.slug,
    toRecordId: targetRecord.id,
    toRecordName: targetRecord.name,
  })

  const recordEdge = await db
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
    .where(eq(recordEdgeTable.id, existingRecordEdge.id))
    .then((rows) => rows[0] ?? null)

  if (!recordEdge) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Relation was not found after update.",
    })
  }

  return recordEdge
}
