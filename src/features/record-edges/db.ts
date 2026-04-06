import { relations, sql } from "drizzle-orm"
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"
import { projectTable } from "@/features/projects/db"
import type { RecordEdgeState } from "@/features/record-edges/lib/record-edge-machine"
import type { RelationType } from "@/features/record-edges/lib/relation-type-rules"
import type { RecordEdgeDirection } from "@/features/record-edges/schemas/record-edge-direction"
import { recordTable } from "@/features/records/db"
import { taskTable } from "@/features/tasks/db"

const createdAtColumn = () =>
  timestamp("created_at", { withTimezone: true }).defaultNow().notNull()

const updatedAtColumn = () =>
  timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull()

export const recordEdgeTable = pgTable(
  "record_edge",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey(),
    fromProjectId: uuid("from_project_id")
      .notNull()
      .references(() => projectTable.id, { onDelete: "cascade" }),
    fromRecordId: uuid("from_record_id")
      .notNull()
      .references(() => recordTable.id, { onDelete: "cascade" }),
    toProjectId: uuid("to_project_id")
      .notNull()
      .references(() => projectTable.id, { onDelete: "cascade" }),
    toRecordId: uuid("to_record_id")
      .notNull()
      .references(() => recordTable.id, { onDelete: "cascade" }),
    relationType: text("relation_type").$type<RelationType>().notNull(),
    direction: text("direction").$type<RecordEdgeDirection>().notNull(),
    state: text("state").$type<RecordEdgeState>().notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdByTaskId: uuid("created_by_task_id").references(() => taskTable.id, {
      onDelete: "set null",
    }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index("record_edge_source_idx").on(table.fromProjectId, table.fromRecordId),
    index("record_edge_target_idx").on(table.toProjectId, table.toRecordId),
    index("record_edge_project_relation_type_idx").on(
      table.fromProjectId,
      table.toProjectId,
      table.relationType,
    ),
    index("record_edge_from_record_relation_state_idx").on(
      table.fromRecordId,
      table.relationType,
      table.state,
    ),
    index("record_edge_to_record_relation_state_idx").on(
      table.toRecordId,
      table.relationType,
      table.state,
    ),
  ],
)

export const recordEdgeRelations = relations(recordEdgeTable, ({ one }) => ({
  createdByTask: one(taskTable, {
    fields: [recordEdgeTable.createdByTaskId],
    references: [taskTable.id],
  }),
  fromProject: one(projectTable, {
    fields: [recordEdgeTable.fromProjectId],
    references: [projectTable.id],
    relationName: "record_edge_from_project",
  }),
  fromRecord: one(recordTable, {
    fields: [recordEdgeTable.fromRecordId],
    references: [recordTable.id],
    relationName: "record_edge_from_record",
  }),
  toProject: one(projectTable, {
    fields: [recordEdgeTable.toProjectId],
    references: [projectTable.id],
    relationName: "record_edge_to_project",
  }),
  toRecord: one(recordTable, {
    fields: [recordEdgeTable.toRecordId],
    references: [recordTable.id],
    relationName: "record_edge_to_record",
  }),
}))
