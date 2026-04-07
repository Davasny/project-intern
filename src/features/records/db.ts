import { relations, sql } from "drizzle-orm"
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import { projectTable } from "@/features/projects/db"
import type { RecordState } from "@/features/records/schemas/record-state"

const createdAtColumn = () =>
  timestamp("created_at", { withTimezone: true }).defaultNow().notNull()

const updatedAtColumn = () =>
  timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull()

export const recordTable = pgTable(
  "record",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projectTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    schemaVersion: integer("schema_version").notNull(),
    state: text("state").$type<RecordState>().notNull(),
    context: jsonb("context").$type<Record<string, unknown>>().notNull(),
    version: integer("version").default(1).notNull(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index("record_project_id_idx").on(table.projectId, table.id),
    uniqueIndex("record_project_name_unique_idx").on(
      table.projectId,
      table.name,
    ),
  ],
)

export const recordRelations = relations(recordTable, ({ one }) => ({
  project: one(projectTable, {
    fields: [recordTable.projectId],
    references: [projectTable.id],
  }),
}))
