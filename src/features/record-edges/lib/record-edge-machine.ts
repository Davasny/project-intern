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

type RecordEdgeTransitionEvent = {
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
      entry: (_context, event: RecordEdgeTransitionEvent) => ({
        createdByTaskId: event.createdByTaskId,
        direction: event.direction,
        fromProjectId: event.fromProjectId,
        fromRecordId: event.fromRecordId,
        metadata: event.metadata,
        relationType: event.relationType,
        toProjectId: event.toProjectId,
        toRecordId: event.toRecordId,
      }),
      on: {
        deactivate: { target: "inactive" },
        edit: { target: "active" },
        invalidate: { target: "inactive" },
        supersede: { target: "inactive" },
      },
      onSuccess: { target: "active" },
    },
    inactive: {
      entry: (_context, event: RecordEdgeTransitionEvent) => ({
        createdByTaskId: event.createdByTaskId,
        direction: event.direction,
        fromProjectId: event.fromProjectId,
        fromRecordId: event.fromRecordId,
        metadata: event.metadata,
        relationType: event.relationType,
        toProjectId: event.toProjectId,
        toRecordId: event.toRecordId,
      }),
      on: {
        activate: { target: "active" },
      },
      onSuccess: { target: "inactive" },
    },
  },
})

export const recordEdgeMachine = withDrizzlePg(recordEdgeMachineDefinition, {
  db,
  table: recordEdgeTable,
})
