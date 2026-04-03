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
import type { ProjectSchemaDefinition } from "@/features/project-schema/schemas/project-schema-version"
import type { ProjectSchemaVersionState } from "@/features/project-schema/schemas/project-schema-version-state"
import { projectTable } from "@/features/projects/db"

const createdAtColumn = () =>
  timestamp("created_at", { withTimezone: true }).defaultNow().notNull()

const updatedAtColumn = () =>
  timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull()

export const projectSchemaVersionTable = pgTable(
  "project_schema_version",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projectTable.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    parentVersionId: uuid("parent_version_id"),
    state: text("state")
      .$type<ProjectSchemaVersionState>()
      .default("accepted")
      .notNull(),
    schemaDefinition: jsonb("schema_definition")
      .$type<ProjectSchemaDefinition>()
      .notNull(),
    proposedBy: uuid("proposed_by"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index("project_schema_version_project_id_idx").on(table.projectId),
    uniqueIndex("project_schema_version_project_version_unique_idx").on(
      table.projectId,
      table.version,
    ),
    uniqueIndex("project_schema_version_one_created_proposal_idx")
      .on(table.projectId)
      .where(sql`${table.state} = 'created'`),
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
