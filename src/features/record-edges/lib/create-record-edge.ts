import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { recordEdgeTable } from "@/features/record-edges/db"
import { ensureRecordInProject } from "@/features/record-edges/lib/ensure-record-in-project"
import {
  createRecordEdgeActor,
  getRecordEdgeActor,
} from "@/features/record-edges/lib/record-edge-machine"
import type { RelationCreateInput } from "@/features/record-edges/schemas/relation-input"
import { db } from "@/lib/db"
import { generateUuidV7Values } from "@/lib/db/generate-uuid-v7-values"

type CreateRecordEdgeParams = {
  input: RelationCreateInput
  organizationSlug: string
  projectSlug: string
  userId: string
}

export const createRecordEdge = async ({
  input,
  organizationSlug,
  projectSlug,
  userId,
}: CreateRecordEdgeParams) => {
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

  const sourceRecord = await ensureRecordInProject({
    projectId: sourceProject.id,
    recordId: input.recordId,
  })
  const targetRecord = await ensureRecordInProject({
    projectId: targetProject.id,
    recordId: input.targetRecordId,
  })

  const [recordEdgeId] = await generateUuidV7Values({ count: 1, database: db })

  await createRecordEdgeActor(recordEdgeId, {
    createdByTaskId: null,
    direction: input.direction,
    fromProjectId: sourceProject.id,
    fromRecordId: sourceRecord.id,
    metadata: {},
    relationType: input.relationType,
    toProjectId: targetProject.id,
    toRecordId: targetRecord.id,
  })

  const actor = await getRecordEdgeActor(recordEdgeId)

  await actor.send("activate", {
    byInternRunId: null,
    byUserId: userId,
    direction: input.direction,
    fromProjectId: sourceProject.id,
    fromRecordId: sourceRecord.id,
    fromRecordName: sourceRecord.name,
    metadata: input.metadata,
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
    .where(eq(recordEdgeTable.id, recordEdgeId))
    .then((rows) => rows[0] ?? null)

  if (!recordEdge) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Relation was not found after creation.",
    })
  }

  return recordEdge
}
