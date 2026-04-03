import { sql } from "drizzle-orm"
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
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

export const opencodeServerTable = pgTable(
  "opencode_server",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    port: integer("port").notNull(),
    apiKey: text("api_key").notNull(),
    type: text("type").$type<"execution" | "interactive">().notNull(),
    status: text("status").$type<"running" | "stopped" | "stale">().notNull(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index("opencode_server_organization_id_idx").on(table.organizationId),
    index("opencode_server_status_idx").on(table.status),
  ],
)
