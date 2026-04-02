import { withDrizzlePg } from "machin/drizzle/pg"
import { recordEdgeTable } from "@/features/record-edges/db"
import { recordEdgeMachineDefinition } from "@/features/record-edges/lib/record-edge-machine"
import type { db } from "@/lib/db"

type DatabaseClient = Pick<typeof db, "insert" | "select" | "update">

type CreateRecordEdgeMachineRowParams = {
  createdByTaskId: string | null
  database: DatabaseClient
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
  database,
  direction,
  fromProjectId,
  fromRecordId,
  id,
  metadata,
  relationType,
  toProjectId,
  toRecordId,
}: CreateRecordEdgeMachineRowParams) => {
  const recordEdgeMachine = withDrizzlePg(recordEdgeMachineDefinition, {
    db: database,
    table: recordEdgeTable,
  })

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
