import { recordEdgeMachine } from "@/features/record-edges/lib/record-edge-machine"

type CreateRecordEdgeMachineRowParams = {
  createdByTaskId: string | null
  direction: "bidirectional" | "outbound"
  fromProjectId: string
  fromRecordId: string
  id: string
  metadata: Record<string, unknown>
  relationType: string
  toProjectId: string
  toRecordId: string
}

export const createRecordEdgeMachineRow = async ({
  createdByTaskId,
  direction,
  fromProjectId,
  fromRecordId,
  id,
  metadata,
  relationType,
  toProjectId,
  toRecordId,
}: CreateRecordEdgeMachineRowParams) => {
  return recordEdgeMachine.createActor(id, {
    createdByTaskId,
    direction,
    fromProjectId,
    fromRecordId,
    metadata,
    relationType,
    toProjectId,
    toRecordId,
  })
}
