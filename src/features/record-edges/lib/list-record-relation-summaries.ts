import { and, eq, inArray, or } from "drizzle-orm"
import { projectTable } from "@/features/projects/db"
import { recordEdgeTable } from "@/features/record-edges/db"
import { recordTable } from "@/features/records/db"
import { db } from "@/lib/db"

type ListRecordRelationSummariesParams = {
  projectId: string
  recordIds: string[]
}

export const listRecordRelationSummaries = async ({
  projectId,
  recordIds,
}: ListRecordRelationSummariesParams) => {
  if (recordIds.length === 0) {
    return new Map<
      string,
      {
        activeCount: number
        inboundCount: number
        outboundCount: number
        relatedRecords: Array<{
          name: string
          projectDisplayName: string
          relationType: string
        }>
      }
    >()
  }

  const recordEdges = await db
    .select({
      fromProjectId: recordEdgeTable.fromProjectId,
      fromRecordId: recordEdgeTable.fromRecordId,
      relationType: recordEdgeTable.relationType,
      toProjectId: recordEdgeTable.toProjectId,
      toRecordId: recordEdgeTable.toRecordId,
    })
    .from(recordEdgeTable)
    .where(
      and(
        eq(recordEdgeTable.state, "active"),
        or(
          and(
            eq(recordEdgeTable.fromProjectId, projectId),
            inArray(recordEdgeTable.fromRecordId, recordIds),
          ),
          and(
            eq(recordEdgeTable.toProjectId, projectId),
            inArray(recordEdgeTable.toRecordId, recordIds),
          ),
        ),
      ),
    )

  const relatedRecordIds = Array.from(
    new Set(
      recordEdges.flatMap((recordEdge) => [
        recordEdge.fromRecordId,
        recordEdge.toRecordId,
      ]),
    ),
  )

  const relatedRecords =
    relatedRecordIds.length > 0
      ? await db
          .select({
            id: recordTable.id,
            name: recordTable.name,
            projectDisplayName: projectTable.displayName,
          })
          .from(recordTable)
          .innerJoin(projectTable, eq(recordTable.projectId, projectTable.id))
          .where(inArray(recordTable.id, relatedRecordIds))
      : []

  const relatedRecordMap = new Map(
    relatedRecords.map((relatedRecord) => [relatedRecord.id, relatedRecord]),
  )
  const summaryMap = new Map<
    string,
    {
      activeCount: number
      inboundCount: number
      outboundCount: number
      relatedRecords: Array<{
        name: string
        projectDisplayName: string
        relationType: string
      }>
    }
  >()

  for (const recordId of recordIds) {
    summaryMap.set(recordId, {
      activeCount: 0,
      inboundCount: 0,
      outboundCount: 0,
      relatedRecords: [],
    })
  }

  for (const recordEdge of recordEdges) {
    const scopedSides = [
      {
        currentRecordId: recordEdge.fromRecordId,
        isOutbound: true,
        relatedRecordId: recordEdge.toRecordId,
      },
      {
        currentRecordId: recordEdge.toRecordId,
        isOutbound: false,
        relatedRecordId: recordEdge.fromRecordId,
      },
    ].filter((side) => summaryMap.has(side.currentRecordId))

    for (const side of scopedSides) {
      const summary = summaryMap.get(side.currentRecordId)
      const relatedRecord = relatedRecordMap.get(side.relatedRecordId)

      if (!summary || !relatedRecord) {
        continue
      }

      summary.activeCount += 1

      if (side.isOutbound) {
        summary.outboundCount += 1
      } else {
        summary.inboundCount += 1
      }

      if (summary.relatedRecords.length < 3) {
        summary.relatedRecords.push({
          name: relatedRecord.name,
          projectDisplayName: relatedRecord.projectDisplayName,
          relationType: recordEdge.relationType,
        })
      }
    }
  }

  return summaryMap
}
