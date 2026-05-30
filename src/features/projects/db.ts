import { relations, sql } from "drizzle-orm"
import {
  boolean,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import { organization } from "@/features/auth/db"

const createdAtColumn = () =>
  timestamp("created_at", { withTimezone: true }).defaultNow().notNull()

const updatedAtColumn = () =>
  timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull()

export const projectTable = pgTable(
  "project",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    displayName: text("display_name").notNull(),
    defaultModel: text("default_model").notNull(),
    agentPythonRequirements: text("agent_python_requirements")
      .notNull()
      .default(""),
    defaultTemperature: numeric("default_temperature", {
      mode: "number",
      precision: 2,
      scale: 1,
    })
      .notNull()
      .default(0.5),
    disabledSkillNames: text("disabled_skill_names")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    activeSchemaVersionId: uuid("active_schema_version_id"),
    isAutopickEnabled: boolean("is_autopick_enabled").notNull().default(true),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("project_organization_slug_unique_idx").on(
      table.organizationId,
      table.slug,
    ),
  ],
)

export const projectRelations = relations(projectTable, ({ one }) => ({
  organization: one(organization, {
    fields: [projectTable.organizationId],
    references: [organization.id],
  }),
}))
