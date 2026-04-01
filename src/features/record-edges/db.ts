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
import type { RecordEdgeDirection } from "@/features/record-edges/schemas/record-edge-direction"
import type { RecordEdgeState } from "@/features/record-edges/schemas/record-edge-state"
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
    relationType: text("relation_type").notNull(),
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

export const activityLogTable = pgTable(
  "activity_log",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projectTable.id, { onDelete: "cascade" }),
    recordId: uuid("record_id")
      .notNull()
      .references(() => recordTable.id, { onDelete: "cascade" }),
    relatedProjectId: uuid("related_project_id")
      .notNull()
      .references(() => projectTable.id, { onDelete: "cascade" }),
    relatedRecordId: uuid("related_record_id")
      .notNull()
      .references(() => recordTable.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    eventType: text("event_type").notNull(),
    actorType: text("actor_type").notNull(),
    actorId: uuid("actor_id"),
    payload: jsonb("payload")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: createdAtColumn(),
  },
  (table) => [
    index("activity_log_project_record_created_at_idx").on(
      table.projectId,
      table.recordId,
      table.createdAt,
    ),
    index("activity_log_related_project_record_created_at_idx").on(
      table.relatedProjectId,
      table.relatedRecordId,
      table.createdAt,
    ),
    index("activity_log_entity_idx").on(
      table.entityType,
      table.entityId,
      table.createdAt,
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

export const activityLogRelations = relations(activityLogTable, ({ one }) => ({
  project: one(projectTable, {
    fields: [activityLogTable.projectId],
    references: [projectTable.id],
    relationName: "activity_log_project",
  }),
  record: one(recordTable, {
    fields: [activityLogTable.recordId],
    references: [recordTable.id],
    relationName: "activity_log_record",
  }),
  relatedProject: one(projectTable, {
    fields: [activityLogTable.relatedProjectId],
    references: [projectTable.id],
    relationName: "activity_log_related_project",
  }),
  relatedRecord: one(recordTable, {
    fields: [activityLogTable.relatedRecordId],
    references: [recordTable.id],
    relationName: "activity_log_related_record",
  }),
}))
