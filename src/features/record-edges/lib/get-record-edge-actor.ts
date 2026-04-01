import { TRPCError } from "@trpc/server"
import { recordEdgeMachine } from "@/features/record-edges/lib/record-edge-machine"

export const getRecordEdgeActor = async (recordEdgeId: string) => {
  const actor = await recordEdgeMachine.getActor(recordEdgeId)

  if (!actor) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Relation edge was not found.",
    })
  }

  return actor
}
