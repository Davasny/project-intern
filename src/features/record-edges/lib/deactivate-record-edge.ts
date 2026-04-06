import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { recordEdgeTable } from "@/features/record-edges/db"
import { getScopedRecordEdge } from "@/features/record-edges/lib/get-scoped-record-edge"
import { getRecordEdgeActor } from "@/features/record-edges/lib/record-edge-machine"
import type { RelationDeactivateInput } from "@/features/record-edges/schemas/relation-input"
import { db } from "@/lib/db"

type DeactivateRecordEdgeParams = {
  input: RelationDeactivateInput
  organizationSlug: string
  projectSlug: string
  userId: string
}

export const deactivateRecordEdge = async ({
  input,
  organizationSlug,
  projectSlug,
  userId,
}: DeactivateRecordEdgeParams) => {
  const project = await ensureProjectAccess({
    organizationSlug,
    projectSlug,
    userId,
  })

  if (!project) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this project.",
    })
  }

  const recordEdge = await getScopedRecordEdge({
    projectId: project.id,
    recordEdgeId: input.recordEdgeId,
    recordId: input.recordId,
  })

  if (recordEdge.state !== "active") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only active relations can be deactivated.",
    })
  }

  const actor = await getRecordEdgeActor(recordEdge.id)

  await actor.send("deactivate", {
    byAgentRunId: null,
    byUserId: userId,
    fromRecordId: input.recordId,
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
