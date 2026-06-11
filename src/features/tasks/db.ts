import { relations, sql } from "drizzle-orm"
import {
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import { user } from "@/features/auth/db"
import { projectSchemaVersionTable } from "@/features/project-schema/db"
import { projectTable } from "@/features/projects/db"
import type { TaskState } from "@/features/tasks/lib/task-machine"

const createdAtColumn = () =>
  timestamp("created_at", { withTimezone: true }).defaultNow().notNull()

const updatedAtColumn = () =>
  timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull()

export const taskTable = pgTable(
  "task",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projectTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    state: text("state").$type<TaskState>().default("accepted").notNull(),
    sortOrder: integer("sort_order").notNull(),
    model: text("model"),
    temperature: numeric("temperature", {
      mode: "number",
      precision: 2,
      scale: 1,
    }),
    schemaVersion: integer("schema_version").notNull(),
    sourceSchemaVersionId: uuid("source_schema_version_id").references(
      () => projectSchemaVersionTable.id,
      { onDelete: "set null" },
    ),
    targetSchemaVersionId: uuid("target_schema_version_id").references(
      () => projectSchemaVersionTable.id,
      { onDelete: "set null" },
    ),
    idempotencyKey: text("idempotency_key").notNull(),
    descriptionMarkdown: text("description_markdown").notNull(),
    proposedBy: uuid("proposed_by").references(() => user.id, {
      onDelete: "set null",
    }),
    acceptedBy: uuid("accepted_by").references(() => user.id, {
      onDelete: "set null",
    }),
    rejectedBy: uuid("rejected_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index("task_project_state_idx").on(table.projectId, table.state),
    uniqueIndex("task_project_sort_order_unique_idx").on(
      table.projectId,
      table.sortOrder,
    ),
    index("task_project_updated_at_idx").on(table.projectId, table.updatedAt),
    index("task_target_schema_version_idx").on(table.targetSchemaVersionId),
  ],
)

export const taskDescriptionRevisionTable = pgTable(
  "task_description_revision",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => taskTable.id, { onDelete: "cascade" }),
    revisionNumber: integer("revision_number").notNull(),
    descriptionMarkdown: text("description_markdown").notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex("task_description_revision_task_revision_unique_idx").on(
      table.taskId,
      table.revisionNumber,
    ),
    index("task_description_revision_task_created_at_idx").on(
      table.taskId,
      table.createdAt,
    ),
  ],
)

export const taskDefinitionVersionTable = pgTable(
  "task_definition_version",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => taskTable.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    title: text("title").notNull(),
    descriptionMarkdown: text("description_markdown").notNull(),
    model: text("model"),
    temperature: numeric("temperature", {
      mode: "number",
      precision: 2,
      scale: 1,
    }),
    schemaVersion: integer("schema_version").notNull(),
    sourceSchemaVersionId: uuid("source_schema_version_id").references(
      () => projectSchemaVersionTable.id,
      { onDelete: "set null" },
    ),
    targetSchemaVersionId: uuid("target_schema_version_id").references(
      () => projectSchemaVersionTable.id,
      { onDelete: "set null" },
    ),
    createdByUserId: uuid("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex("task_definition_version_task_version_unique_idx").on(
      table.taskId,
      table.versionNumber,
    ),
    index("task_definition_version_task_created_at_idx").on(
      table.taskId,
      table.createdAt,
    ),
  ],
)

export const taskRelations = relations(taskTable, ({ one, many }) => ({
  definitionVersions: many(taskDefinitionVersionTable),
  descriptionRevisions: many(taskDescriptionRevisionTable),
  project: one(projectTable, {
    fields: [taskTable.projectId],
    references: [projectTable.id],
  }),
}))

export const taskDefinitionVersionRelations = relations(
  taskDefinitionVersionTable,
  ({ one }) => ({
    createdByUser: one(user, {
      fields: [taskDefinitionVersionTable.createdByUserId],
      references: [user.id],
    }),
    task: one(taskTable, {
      fields: [taskDefinitionVersionTable.taskId],
      references: [taskTable.id],
    }),
  }),
)

export const taskDescriptionRevisionRelations = relations(
  taskDescriptionRevisionTable,
  ({ one }) => ({
    createdByUser: one(user, {
      fields: [taskDescriptionRevisionTable.createdByUserId],
      references: [user.id],
    }),
    task: one(taskTable, {
      fields: [taskDescriptionRevisionTable.taskId],
      references: [taskTable.id],
    }),
  }),
)
