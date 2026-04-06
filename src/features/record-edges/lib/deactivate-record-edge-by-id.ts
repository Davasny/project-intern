import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import { recordEdgeTable } from "@/features/record-edges/db"
import { getScopedRecordEdge } from "@/features/record-edges/lib/get-scoped-record-edge"
import { getRecordEdgeActor } from "@/features/record-edges/lib/record-edge-machine"
import { db } from "@/lib/db"

type DeactivateRecordEdgeByIdParams = {
  agentRunId: string
  projectId: string
  recordEdgeId: string
  recordId: string
}

export const deactivateRecordEdgeById = async ({
  agentRunId,
  projectId,
  recordEdgeId,
  recordId,
}: DeactivateRecordEdgeByIdParams) => {
  const recordEdge = await getScopedRecordEdge({
    projectId,
    recordEdgeId,
    recordId,
  })

  if (recordEdge.state !== "active") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only active relations can be deactivated.",
    })
  }

  const actor = await getRecordEdgeActor(recordEdge.id)

  await actor.send("deactivate", {
    byAgentRunId: agentRunId,
    byUserId: null,
    fromRecordId: recordId,
  })

  return db
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
    .where(eq(recordEdgeTable.id, recordEdge.id))
    .then((rows) => rows[0] ?? null)
}
