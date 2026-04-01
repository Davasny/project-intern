import { TRPCError } from "@trpc/server"
import { and, desc, eq, inArray, or } from "drizzle-orm"
import { projectTable } from "@/features/projects/db"
import { recordEdgeTable } from "@/features/record-edges/db"
import { relationTypeRules } from "@/features/record-edges/lib/relation-type-rules"
import { recordTable } from "@/features/records/db"
import { db } from "@/lib/db"

const getRelationTypeLabel = (relationType: string) => {
  if (relationType in relationTypeRules) {
    return relationTypeRules[relationType as keyof typeof relationTypeRules]
      .label
  }

  return relationType
}

type ListRecordRelationsByProjectIdParams = {
  projectId: string
  recordId: string
}

export const listRecordRelationsByProjectId = async ({
  projectId,
  recordId,
}: ListRecordRelationsByProjectIdParams) => {
  const currentRecord = await db
    .select({ id: recordTable.id })
    .from(recordTable)
    .where(
      and(eq(recordTable.id, recordId), eq(recordTable.projectId, projectId)),
    )
    .then((rows) => rows[0] ?? null)

  if (!currentRecord) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Record was not found.",
    })
  }

  const recordEdges = await db
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
        eq(recordEdgeTable.state, "active"),
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
    .orderBy(desc(recordEdgeTable.updatedAt))

  const relatedRecordIds = Array.from(
    new Set(
      recordEdges.map((recordEdge) =>
        recordEdge.fromRecordId === recordId
          ? recordEdge.toRecordId
          : recordEdge.fromRecordId,
      ),
    ),
  )

  const relatedRecords =
    relatedRecordIds.length > 0
      ? await db
          .select({
            context: recordTable.context,
            id: recordTable.id,
            name: recordTable.name,
            projectDisplayName: projectTable.displayName,
            projectId: projectTable.id,
            projectSlug: projectTable.slug,
            schemaVersion: recordTable.schemaVersion,
            state: recordTable.state,
          })
          .from(recordTable)
          .innerJoin(projectTable, eq(recordTable.projectId, projectTable.id))
          .where(inArray(recordTable.id, relatedRecordIds))
      : []

  const relatedRecordMap = new Map(
    relatedRecords.map((relatedRecord) => [relatedRecord.id, relatedRecord]),
  )

  const relations = recordEdges.map((recordEdge) => {
    const isOutbound = recordEdge.fromRecordId === recordId
    const relatedRecordId = isOutbound
      ? recordEdge.toRecordId
      : recordEdge.fromRecordId
    const relatedRecord = relatedRecordMap.get(relatedRecordId)

    return {
      createdAt: recordEdge.createdAt,
      createdByTaskId: recordEdge.createdByTaskId,
      direction: recordEdge.direction,
      id: recordEdge.id,
      metadata: recordEdge.metadata,
      perspective: isOutbound ? "outbound" : "inbound",
      relatedRecord: relatedRecord ?? {
        context: {},
        id: relatedRecordId,
        name: "Deleted record",
        projectDisplayName: "Unknown project",
        projectId: isOutbound
          ? recordEdge.toProjectId
          : recordEdge.fromProjectId,
        projectSlug: "unknown-project",
        schemaVersion: 0,
        state: "archived",
      },
      relationType: recordEdge.relationType,
      relationTypeLabel: getRelationTypeLabel(recordEdge.relationType),
      state: recordEdge.state,
      updatedAt: recordEdge.updatedAt,
    }
  })

  return {
    relations,
    summary: {
      activeCount: relations.length,
      inboundCount: relations.filter(
        (relation) => relation.perspective === "inbound",
      ).length,
      outboundCount: relations.filter(
        (relation) => relation.perspective === "outbound",
      ).length,
      relationTypes: Array.from(
        new Set(relations.map((relation) => relation.relationType)),
      ),
    },
  }
}
