import { relations, sql } from "drizzle-orm"
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"
import { organizationTable, userTable } from "@/features/auth/db"
import { projectTable } from "@/features/projects/db"
import { recordTable } from "@/features/records/db"

const createdAtColumn = () =>
  timestamp("created_at", { withTimezone: true }).defaultNow().notNull()

const updatedAtColumn = () =>
  timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull()

export const sourceFileTable = pgTable(
  "source_file",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizationTable.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projectTable.id, { onDelete: "cascade" }),
    recordId: uuid("record_id")
      .notNull()
      .references(() => recordTable.id, { onDelete: "cascade" }),
    createdByUserId: uuid("created_by_user_id").references(() => userTable.id, {
      onDelete: "set null",
    }),
    originalFileName: text("original_file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sha256: text("sha256").notNull(),
    storagePath: text("storage_path").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index("source_file_project_record_created_at_idx").on(
      table.projectId,
      table.recordId,
      table.createdAt,
    ),
    index("source_file_record_sha256_idx").on(table.recordId, table.sha256),
  ],
)

export const sourceFileRelations = relations(sourceFileTable, ({ one }) => ({
  createdByUser: one(userTable, {
    fields: [sourceFileTable.createdByUserId],
    references: [userTable.id],
  }),
  organization: one(organizationTable, {
    fields: [sourceFileTable.organizationId],
    references: [organizationTable.id],
  }),
  project: one(projectTable, {
    fields: [sourceFileTable.projectId],
    references: [projectTable.id],
  }),
  record: one(recordTable, {
    fields: [sourceFileTable.recordId],
    references: [recordTable.id],
  }),
}))
