import { TRPCError } from "@trpc/server"
import { and, eq, ne } from "drizzle-orm"
import { recordEdgeTable } from "@/features/record-edges/db"
import {
  type RelationType,
  relationTypeRules,
} from "@/features/record-edges/lib/relation-type-rules"
import { db } from "@/lib/db"

type AssertRelationCardinalityParams = {
  excludeRecordEdgeId: string | null
  fromRecordId: string
  relationType: RelationType
  toRecordId: string
}

export const assertRelationCardinality = async ({
  excludeRecordEdgeId,
  fromRecordId,
  relationType,
  toRecordId,
}: AssertRelationCardinalityParams) => {
  const duplicateRelation = await db
    .select({ id: recordEdgeTable.id })
    .from(recordEdgeTable)
    .where(
      excludeRecordEdgeId === null
        ? and(
            eq(recordEdgeTable.fromRecordId, fromRecordId),
            eq(recordEdgeTable.toRecordId, toRecordId),
            eq(recordEdgeTable.relationType, relationType),
            eq(recordEdgeTable.state, "active"),
          )
        : and(
            eq(recordEdgeTable.fromRecordId, fromRecordId),
            eq(recordEdgeTable.toRecordId, toRecordId),
            eq(recordEdgeTable.relationType, relationType),
            eq(recordEdgeTable.state, "active"),
            ne(recordEdgeTable.id, excludeRecordEdgeId),
          ),
    )
    .then((rows) => rows[0] ?? null)

  if (duplicateRelation) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This active relation already exists.",
    })
  }

  const rule = relationTypeRules[relationType]

  if (rule.maxActiveOutboundEdges === null) {
    return
  }

  const activeRelations = await db
    .select({ id: recordEdgeTable.id })
    .from(recordEdgeTable)
    .where(
      excludeRecordEdgeId === null
        ? and(
            eq(recordEdgeTable.fromRecordId, fromRecordId),
            eq(recordEdgeTable.relationType, relationType),
            eq(recordEdgeTable.state, "active"),
          )
        : and(
            eq(recordEdgeTable.fromRecordId, fromRecordId),
            eq(recordEdgeTable.relationType, relationType),
            eq(recordEdgeTable.state, "active"),
            ne(recordEdgeTable.id, excludeRecordEdgeId),
          ),
    )

  if (activeRelations.length >= rule.maxActiveOutboundEdges) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${rule.label} allows only ${rule.maxActiveOutboundEdges} active outbound relation for this record.`,
    })
  }
}
