import { TRPCError } from "@trpc/server"
import { recordEdgeTable } from "@/features/record-edges/db"
import { assertRelationCardinality } from "@/features/record-edges/lib/assert-relation-cardinality"
import { buildRecordEdgeMetadata } from "@/features/record-edges/lib/build-record-edge-metadata"
import { createActivityLog } from "@/features/record-edges/lib/create-activity-log"
import { ensureRecordInProject } from "@/features/record-edges/lib/ensure-record-in-project"
import { relationMetadataInputSchema } from "@/features/record-edges/schemas/relation-metadata"
import { db } from "@/lib/db"

type CreateRecordEdgeByIdParams = {
  agentRunId: string
  direction: "bidirectional" | "outbound"
  metadata: Record<string, unknown>
  relationType: "belongs_to" | "depends_on" | "duplicates" | "related_to"
  sourceProjectId: string
  sourceRecordId: string
  targetProjectId: string
  targetRecordId: string
  taskId: string
}

export const createRecordEdgeById = async ({
  agentRunId,
  direction,
  metadata,
  relationType,
  sourceProjectId,
  sourceRecordId,
  targetProjectId,
  targetRecordId,
  taskId,
}: CreateRecordEdgeByIdParams) => {
  const sourceRecord = await ensureRecordInProject({
    projectId: sourceProjectId,
    recordId: sourceRecordId,
  })
  const targetRecord = await ensureRecordInProject({
    projectId: targetProjectId,
    recordId: targetRecordId,
  })

  if (
    sourceProjectId === targetProjectId &&
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
    relationType,
    toRecordId: targetRecord.id,
  })

  const [recordEdge] = await db
    .insert(recordEdgeTable)
    .values({
      createdByTaskId: taskId,
      direction,
      fromProjectId: sourceProjectId,
      fromRecordId: sourceRecord.id,
      metadata: buildRecordEdgeMetadata(
        relationMetadataInputSchema.parse(metadata),
      ),
      relationType,
      state: "active",
      toProjectId: targetProjectId,
      toRecordId: targetRecord.id,
    })
    .returning({
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

  await createActivityLog({
    actorId: agentRunId,
    actorType: "executor",
    entityId: recordEdge.id,
    eventType: "recordEdge.created",
    payload: {
      direction: recordEdge.direction,
      relationType: recordEdge.relationType,
      sourceRecordName: sourceRecord.name,
      targetRecordName: targetRecord.name,
    },
    projectId: sourceProjectId,
    recordId: sourceRecord.id,
    relatedProjectId: targetProjectId,
    relatedRecordId: targetRecord.id,
  })

  return recordEdge
}
