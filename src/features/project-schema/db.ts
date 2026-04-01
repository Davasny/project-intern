import { relations, sql } from "drizzle-orm"
import {
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import type { ProjectSchemaDefinition } from "@/features/project-schema/schemas/project-schema-version"
import { projectTable } from "@/features/projects/db"

const createdAtColumn = () =>
  timestamp("created_at", { withTimezone: true }).defaultNow().notNull()

export const projectSchemaVersionTable = pgTable(
  "project_schema_version",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projectTable.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    parentVersionId: uuid("parent_version_id"),
    schemaDefinition: jsonb("schema_definition")
      .$type<ProjectSchemaDefinition>()
      .notNull(),
    createdAt: createdAtColumn(),
  },
  (table) => [
    index("project_schema_version_project_id_idx").on(table.projectId),
    uniqueIndex("project_schema_version_project_version_unique_idx").on(
      table.projectId,
      table.version,
    ),
  ],
)

export const projectSchemaVersionRelations = relations(
  projectSchemaVersionTable,
  ({ one }) => ({
    parentVersion: one(projectSchemaVersionTable, {
      fields: [projectSchemaVersionTable.parentVersionId],
      references: [projectSchemaVersionTable.id],
      relationName: "project_schema_version_parent_version",
    }),
    project: one(projectTable, {
      fields: [projectSchemaVersionTable.projectId],
      references: [projectTable.id],
    }),
  }),
)
