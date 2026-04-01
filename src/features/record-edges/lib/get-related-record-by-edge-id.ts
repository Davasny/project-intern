import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import { recordEdgeTable } from "@/features/record-edges/db"
import { listRecordRelationsByProjectId } from "@/features/record-edges/lib/list-record-relations-by-project-id"
import { db } from "@/lib/db"

type GetRelatedRecordByEdgeIdParams = {
  projectId: string
  recordEdgeId: string
  recordId: string
}

export const getRelatedRecordByEdgeId = async ({
  projectId,
  recordEdgeId,
  recordId,
}: GetRelatedRecordByEdgeIdParams) => {
  const relationList = await listRecordRelationsByProjectId({
    projectId,
    recordId,
  })
  const relation = relationList.relations.find(
    (currentRelation) => currentRelation.id === recordEdgeId,
  )

  if (!relation) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Relation was not found.",
    })
  }

  const recordEdge = await db
    .select({
      createdAt: recordEdgeTable.createdAt,
      direction: recordEdgeTable.direction,
      id: recordEdgeTable.id,
      metadata: recordEdgeTable.metadata,
      relationType: recordEdgeTable.relationType,
      state: recordEdgeTable.state,
      updatedAt: recordEdgeTable.updatedAt,
    })
    .from(recordEdgeTable)
    .where(eq(recordEdgeTable.id, recordEdgeId))
    .then((rows) => rows[0] ?? null)

  if (!recordEdge) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Relation was not found.",
    })
  }

  return {
    edge: recordEdge,
    relatedRecord: relation.relatedRecord,
  }
}
