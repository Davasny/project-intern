import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { recordEdgeTable } from "@/features/record-edges/db"
import { assertRelationCardinality } from "@/features/record-edges/lib/assert-relation-cardinality"
import { buildRecordEdgeMetadata } from "@/features/record-edges/lib/build-record-edge-metadata"
import { createActivityLog } from "@/features/record-edges/lib/create-activity-log"
import { createRecordEdgeMachineRow } from "@/features/record-edges/lib/create-record-edge-machine-row"
import { ensureRecordInProject } from "@/features/record-edges/lib/ensure-record-in-project"
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

  if (
    sourceProject.id === targetProject.id &&
    sourceRecord.id === targetRecord.id
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A record cannot relate to itself.",
    })
  }

  await assertRelationCardinality({
    excludeRecordEdgeId: null,
    fromRecordId: sourceRecord.id,
    relationType: input.relationType,
    toRecordId: targetRecord.id,
  })

  const metadata = buildRecordEdgeMetadata(input.metadata)
  const [recordEdgeId] = await generateUuidV7Values({ count: 1, database: db })

  await createRecordEdgeMachineRow({
    createdByTaskId: null,
    database: db,
    direction: input.direction,
    fromProjectId: sourceProject.id,
    fromRecordId: sourceRecord.id,
    id: recordEdgeId,
    metadata,
    relationType: input.relationType,
    toProjectId: targetProject.id,
    toRecordId: targetRecord.id,
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

  await createActivityLog({
    actorId: userId,
    actorType: "user",
    entityId: recordEdge.id,
    eventType: "recordEdge.created",
    payload: {
      direction: recordEdge.direction,
      relatedProjectDisplayName: targetProject.displayName,
      relatedProjectSlug: targetProject.slug,
      relatedRecordName: targetRecord.name,
      relationType: recordEdge.relationType,
      sourceRecordName: sourceRecord.name,
    },
    projectId: sourceProject.id,
    recordId: sourceRecord.id,
    relatedProjectId: targetProject.id,
    relatedRecordId: targetRecord.id,
  })

  return recordEdge
}
