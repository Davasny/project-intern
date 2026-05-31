import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import { recordEdgeTable } from "@/features/record-edges/db"
import { ensureRecordInProject } from "@/features/record-edges/lib/ensure-record-in-project"
import {
  createRecordEdgeActor,
  getRecordEdgeActor,
} from "@/features/record-edges/lib/record-edge-machine"
import { relationMetadataInputSchema } from "@/features/record-edges/schemas/relation-metadata"
import { db } from "@/lib/db"
import { generateUuidV7Values } from "@/lib/db/generate-uuid-v7-values"

type CreateRecordEdgeByIdParams = {
  internRunId: string
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
  internRunId,
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

  const parsedMetadata = relationMetadataInputSchema.parse(metadata)

  const [recordEdgeId] = await generateUuidV7Values({ count: 1, database: db })

  await createRecordEdgeActor(recordEdgeId, {
    createdByTaskId: taskId,
    direction,
    fromProjectId: sourceProjectId,
    fromRecordId: sourceRecord.id,
    metadata: {},
    relationType,
    toProjectId: targetProjectId,
    toRecordId: targetRecord.id,
  })

  const actor = await getRecordEdgeActor(recordEdgeId)

  await actor.send("activate", {
    byInternRunId: internRunId,
    byUserId: null,
    direction,
    fromProjectId: sourceProjectId,
    fromRecordId: sourceRecord.id,
    fromRecordName: sourceRecord.name,
    metadata: parsedMetadata,
    relationType,
    toProjectDisplayName: "",
    toProjectId: targetProjectId,
    toProjectSlug: "",
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
