import { machine } from "machin"
import { withDrizzlePg } from "machin/drizzle/pg"
import { recordEdgeTable } from "@/features/record-edges/db"
import { db } from "@/lib/db"

type RecordEdgeMachineContext = {
  createdByTaskId: string | null
  direction: "bidirectional" | "outbound"
  fromProjectId: string
  fromRecordId: string
  metadata: Record<string, unknown>
  relationType: string
  toProjectId: string
  toRecordId: string
}

const recordEdgeMachineDefinition = machine<RecordEdgeMachineContext>().define({
  initial: "active",
  states: {
    active: {
      on: {
        deactivate: { target: "inactive" },
        invalidate: { target: "inactive" },
        supersede: { target: "inactive" },
      },
    },
    inactive: {
      on: {
        activate: { target: "active" },
      },
    },
  },
})

export const recordEdgeMachine = withDrizzlePg(recordEdgeMachineDefinition, {
  db,
  table: recordEdgeTable,
})
