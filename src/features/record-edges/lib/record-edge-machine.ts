import { and, eq, ne } from "drizzle-orm"
import { type InferStates, machine } from "machin"
import { withDrizzlePg } from "machin/drizzle/pg"
import { recordEdgeTable } from "@/features/record-edges/db"
import { buildRecordEdgeMetadata } from "@/features/record-edges/lib/build-record-edge-metadata"
import {
  type RelationType,
  relationTypeRules,
} from "@/features/record-edges/lib/relation-type-rules"
import type { RelationMetadataInput } from "@/features/record-edges/schemas/relation-metadata"
import { db } from "@/lib/db"

type RecordEdgeMachineContext = {
  createdByTaskId: string | null
  direction: "bidirectional" | "outbound"
  fromProjectId: string
  fromRecordId: string
  metadata: Record<string, unknown>
  relationType: RelationType
  toProjectId: string
  toRecordId: string
}

type CreateEdgeEvent = {
  byAgentRunId: string | null
  byUserId: string | null
  direction: "bidirectional" | "outbound"
  fromProjectId: string
  fromRecordName: string
  fromRecordId: string
  metadata: RelationMetadataInput
  relationType: RelationType
  toProjectDisplayName: string
  toProjectSlug: string
  toProjectId: string
  toRecordName: string
  toRecordId: string
}

type EditEdgeEvent = {
  byUserId: string
  direction: "bidirectional" | "outbound"
  edgeId: string
  fromProjectId: string
  fromRecordName: string
  fromRecordId: string
  metadata: RelationMetadataInput
  previousRelationType: RelationType
  relationType: RelationType
  toProjectDisplayName: string
  toProjectSlug: string
  toProjectId: string
  toRecordName: string
  toRecordId: string
}

type DeactivateEdgeEvent = {
  byAgentRunId: string | null
  byUserId: string | null
  fromRecordId: string
}

const recordEdgeMachineDefinition = machine<RecordEdgeMachineContext>().define({
  initial: "created",
  states: {
    created: {
      on: {
        activate: { target: "activating" },
      },
    },
    activating: {
      entry: async (_context, event: CreateEdgeEvent) => {
        const metadata = buildRecordEdgeMetadata(event.metadata)

        if (event.fromRecordId === event.toRecordId) {
          throw new Error("A record cannot relate to itself.")
        }

        const duplicateRelation = await db
          .select({ id: recordEdgeTable.id })
          .from(recordEdgeTable)
          .where(
            and(
              eq(recordEdgeTable.fromRecordId, event.fromRecordId),
              eq(recordEdgeTable.toRecordId, event.toRecordId),
              eq(recordEdgeTable.relationType, event.relationType),
              eq(recordEdgeTable.state, "active"),
            ),
          )
          .then((rows) => rows[0] ?? null)

        if (duplicateRelation) {
          throw new Error("This active relation already exists.")
        }

        const rule = relationTypeRules[event.relationType]

        if (rule.maxActiveOutboundEdges !== null) {
          const activeRelations = await db
            .select({ id: recordEdgeTable.id })
            .from(recordEdgeTable)
            .where(
              and(
                eq(recordEdgeTable.fromRecordId, event.fromRecordId),
                eq(recordEdgeTable.relationType, event.relationType),
                eq(recordEdgeTable.state, "active"),
              ),
            )

          if (activeRelations.length >= rule.maxActiveOutboundEdges) {
            throw new Error(
              `${rule.label} allows only ${rule.maxActiveOutboundEdges} active outbound relation for this record.`,
            )
          }
        }

        return {
          createdByTaskId: null,
          direction: event.direction,
          fromProjectId: event.fromProjectId,
          fromRecordId: event.fromRecordId,
          metadata,
          relationType: event.relationType,
          toProjectId: event.toProjectId,
          toRecordId: event.toRecordId,
        }
      },
      onSuccess: { target: "active" },
      onError: { target: "create_failed" },
    },
    active: {
      on: {
        deactivate: { target: "deactivating" },
        edit: { target: "editing" },
      },
    },
    editing: {
      entry: async (context, event: EditEdgeEvent) => {
        const metadata = buildRecordEdgeMetadata(event.metadata)

        if (event.fromRecordId === event.toRecordId) {
          throw new Error("A record cannot relate to itself.")
        }

        const duplicateRelation = await db
          .select({ id: recordEdgeTable.id })
          .from(recordEdgeTable)
          .where(
            and(
              eq(recordEdgeTable.fromRecordId, event.fromRecordId),
              eq(recordEdgeTable.toRecordId, event.toRecordId),
              eq(recordEdgeTable.relationType, event.relationType),
              eq(recordEdgeTable.state, "active"),
              ne(recordEdgeTable.id, event.edgeId),
            ),
          )
          .then((rows) => rows[0] ?? null)

        if (duplicateRelation) {
          throw new Error("This active relation already exists.")
        }

        const rule = relationTypeRules[event.relationType]

        if (rule.maxActiveOutboundEdges !== null) {
          const activeRelations = await db
            .select({ id: recordEdgeTable.id })
            .from(recordEdgeTable)
            .where(
              and(
                eq(recordEdgeTable.fromRecordId, event.fromRecordId),
                eq(recordEdgeTable.relationType, event.relationType),
                eq(recordEdgeTable.state, "active"),
                ne(recordEdgeTable.id, event.edgeId),
              ),
            )

          if (activeRelations.length >= rule.maxActiveOutboundEdges) {
            throw new Error(
              `${rule.label} allows only ${rule.maxActiveOutboundEdges} active outbound relation for this record.`,
            )
          }
        }

        return {
          ...context,
          direction: event.direction,
          metadata,
          relationType: event.relationType,
          toProjectId: event.toProjectId,
          toRecordId: event.toRecordId,
        }
      },
      onSuccess: { target: "active" },
      onError: { target: "edit_failed" },
    },
    edit_failed: {
      on: { retry: { target: "editing" } },
    },
    deactivating: {
      entry: async (context, event: DeactivateEdgeEvent) => {
        const nextMetadata: Record<string, unknown> = { ...context.metadata }

        if (event.byUserId) {
          nextMetadata.deactivatedByUserId = event.byUserId
          nextMetadata.deactivatedFromRecordId = event.fromRecordId
        }

        if (event.byAgentRunId) {
          nextMetadata.deactivatedByAgentRunId = event.byAgentRunId
          nextMetadata.deactivatedFromRecordId = event.fromRecordId
        }

        return {
          ...context,
          metadata: nextMetadata,
        }
      },
      onSuccess: { target: "inactive" },
      onError: { target: "deactivate_failed" },
    },
    deactivate_failed: {
      on: { retry: { target: "deactivating" } },
    },
    inactive: {
      on: {
        activate: { target: "activating" },
      },
    },
    create_failed: {
      on: { retry: { target: "activating" } },
    },
  },
})

export type RecordEdgeState = InferStates<typeof recordEdgeMachineDefinition>

const recordEdgeMachine = withDrizzlePg(recordEdgeMachineDefinition, {
  db,
  table: recordEdgeTable,
})

export const createRecordEdgeActor = async (
  id: string,
  context: RecordEdgeMachineContext,
) => recordEdgeMachine.createActor(id, context)

export const getRecordEdgeActor = async (recordEdgeId: string) => {
  const actor = await recordEdgeMachine.getActor(recordEdgeId)

  if (!actor) {
    throw new Error(`Relation edge ${recordEdgeId} not found.`)
  }

  return actor
}
