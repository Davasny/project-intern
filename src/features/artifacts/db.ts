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
import type { ArtifactState } from "@/features/artifacts/schemas/artifact-state"
import { organizationTable, userTable } from "@/features/auth/db"
import { sourceFileTable } from "@/features/files/db"
import { projectTable } from "@/features/projects/db"
import { recordTable } from "@/features/records/db"

const createdAtColumn = () =>
  timestamp("created_at", { withTimezone: true }).defaultNow().notNull()

const updatedAtColumn = () =>
  timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull()

export const artifactTable = pgTable(
  "artifact",
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
    fileId: uuid("file_id")
      .notNull()
      .references(() => sourceFileTable.id, { onDelete: "cascade" }),
    createdByUserId: uuid("created_by_user_id").references(() => userTable.id, {
      onDelete: "set null",
    }),
    stage: text("stage").notNull(),
    state: text("state").$type<ArtifactState>().notNull(),
    sourceHash: text("source_hash").notNull(),
    pipelineVersion: text("pipeline_version").notNull(),
    format: text("format").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    storagePath: text("storage_path").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("artifact_lineage_unique_idx").on(
      table.recordId,
      table.fileId,
      table.stage,
      table.sourceHash,
      table.pipelineVersion,
    ),
    index("artifact_project_record_created_at_idx").on(
      table.projectId,
      table.recordId,
      table.createdAt,
    ),
  ],
)

export const artifactRelations = relations(artifactTable, ({ one }) => ({
  createdByUser: one(userTable, {
    fields: [artifactTable.createdByUserId],
    references: [userTable.id],
  }),
  file: one(sourceFileTable, {
    fields: [artifactTable.fileId],
    references: [sourceFileTable.id],
  }),
  organization: one(organizationTable, {
    fields: [artifactTable.organizationId],
    references: [organizationTable.id],
  }),
  project: one(projectTable, {
    fields: [artifactTable.projectId],
    references: [projectTable.id],
  }),
  record: one(recordTable, {
    fields: [artifactTable.recordId],
    references: [recordTable.id],
  }),
}))
