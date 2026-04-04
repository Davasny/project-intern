import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import { recordEdgeTable } from "@/features/record-edges/db"
import { assertRelationCardinality } from "@/features/record-edges/lib/assert-relation-cardinality"
import { buildRecordEdgeMetadata } from "@/features/record-edges/lib/build-record-edge-metadata"
import { createActivityLog } from "@/features/record-edges/lib/create-activity-log"
import { createRecordEdgeMachineRow } from "@/features/record-edges/lib/create-record-edge-machine-row"
import { ensureRecordInProject } from "@/features/record-edges/lib/ensure-record-in-project"
import { relationMetadataInputSchema } from "@/features/record-edges/schemas/relation-metadata"
import { db } from "@/lib/db"
import { generateUuidV7Values } from "@/lib/db/generate-uuid-v7-values"

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

  const [recordEdgeId] = await generateUuidV7Values({ count: 1, database: db })
  const nextMetadata = buildRecordEdgeMetadata(
    relationMetadataInputSchema.parse(metadata),
  )

  await createRecordEdgeMachineRow({
    createdByTaskId: taskId,
    direction,
    fromProjectId: sourceProjectId,
    fromRecordId: sourceRecord.id,
    id: recordEdgeId,
    metadata: nextMetadata,
    relationType,
    toProjectId: targetProjectId,
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
