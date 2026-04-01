import { relations, sql } from "drizzle-orm"
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import type { OrganizationRole } from "@/features/auth/lib/organization-roles"

const createdAtColumn = () =>
  timestamp("created_at", { withTimezone: true }).defaultNow().notNull()

const updatedAtColumn = () =>
  timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull()

export const userTable = pgTable("user", {
  id: uuid("id").default(sql`uuidv7()`).primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  isAnonymous: boolean("is_anonymous").default(false).notNull(),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
})

export const organizationTable = pgTable(
  "organization",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    logo: text("logo"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown> | null>()
      .default(sql`'{}'::jsonb`),
    createdAt: createdAtColumn(),
  },
  (table) => [uniqueIndex("organization_slug_unique_idx").on(table.slug)],
)

export const sessionTable = pgTable(
  "session",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    activeOrganizationId: uuid("active_organization_id").references(
      () => organizationTable.id,
      {
        onDelete: "set null",
      },
    ),
  },
  (table) => [
    uniqueIndex("session_token_unique_idx").on(table.token),
    index("session_user_id_idx").on(table.userId),
  ],
)

export const accountTable = pgTable(
  "account",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
)

export const verificationTable = pgTable(
  "verification",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
)

export const organizationMembershipTable = pgTable(
  "organization_membership",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizationTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    role: text("role").$type<OrganizationRole>().notNull(),
    createdAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex("organization_membership_user_org_unique_idx").on(
      table.organizationId,
      table.userId,
    ),
    index("organization_membership_user_id_idx").on(table.userId),
  ],
)

export const userRelations = relations(userTable, ({ many }) => ({
  organizationMemberships: many(organizationMembershipTable),
}))

export const organizationRelations = relations(
  organizationTable,
  ({ many }) => ({
    memberships: many(organizationMembershipTable),
  }),
)

export const organizationMembershipRelations = relations(
  organizationMembershipTable,
  ({ one }) => ({
    organization: one(organizationTable, {
      fields: [organizationMembershipTable.organizationId],
      references: [organizationTable.id],
    }),
    user: one(userTable, {
      fields: [organizationMembershipTable.userId],
      references: [userTable.id],
    }),
  }),
)

export const authSchema = {
  account: accountTable,
  organization: organizationTable,
  organizationMembership: organizationMembershipTable,
  session: sessionTable,
  user: userTable,
  verification: verificationTable,
}
