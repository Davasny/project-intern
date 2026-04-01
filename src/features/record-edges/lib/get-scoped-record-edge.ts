import { TRPCError } from "@trpc/server"
import { and, eq, or } from "drizzle-orm"
import { recordEdgeTable } from "@/features/record-edges/db"
import { db } from "@/lib/db"

type GetScopedRecordEdgeParams = {
  projectId: string
  recordEdgeId: string
  recordId: string
}

export const getScopedRecordEdge = async ({
  projectId,
  recordEdgeId,
  recordId,
}: GetScopedRecordEdgeParams) => {
  const recordEdge = await db
    .select({
      createdAt: recordEdgeTable.createdAt,
      createdByTaskId: recordEdgeTable.createdByTaskId,
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
    .where(
      and(
        eq(recordEdgeTable.id, recordEdgeId),
        or(
          and(
            eq(recordEdgeTable.fromProjectId, projectId),
            eq(recordEdgeTable.fromRecordId, recordId),
          ),
          and(
            eq(recordEdgeTable.toProjectId, projectId),
            eq(recordEdgeTable.toRecordId, recordId),
          ),
        ),
      ),
    )
    .then((rows) => rows[0] ?? null)

  if (!recordEdge) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Relation edge was not found in this record scope.",
    })
  }

  return recordEdge
}
