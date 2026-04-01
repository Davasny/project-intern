import { relations, sql } from "drizzle-orm"
import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import type { AgentRunState } from "@/features/agent-runs/schemas/agent-run-state"
import { taskRecordTable } from "@/features/task-records/db"

const createdAtColumn = () =>
  timestamp("created_at", { withTimezone: true }).defaultNow().notNull()

const updatedAtColumn = () =>
  timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull()

export const agentRunTable = pgTable(
  "agent_run",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey(),
    taskRecordId: uuid("task_record_id")
      .notNull()
      .references(() => taskRecordTable.id, { onDelete: "cascade" }),
    attemptNumber: integer("attempt_number").notNull(),
    state: text("state").$type<AgentRunState>().notNull(),
    selectedModel: text("selected_model"),
    selectedAgent: text("selected_agent"),
    sessionReference: text("session_reference"),
    toolActivitySummary: jsonb("tool_activity_summary")
      .$type<Record<string, unknown>>()
      .notNull(),
    resultPayload: jsonb("result_payload").$type<Record<
      string,
      unknown
    > | null>(),
    failurePayload: jsonb("failure_payload").$type<Record<
      string,
      unknown
    > | null>(),
    tokenInput: integer("token_input"),
    tokenOutput: integer("token_output"),
    latencyMs: integer("latency_ms"),
    costUsd: numeric("cost_usd", { precision: 12, scale: 6 }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("agent_run_task_record_attempt_unique_idx").on(
      table.taskRecordId,
      table.attemptNumber,
    ),
    index("agent_run_task_record_created_at_idx").on(
      table.taskRecordId,
      table.createdAt,
    ),
  ],
)

export const agentRunRelations = relations(agentRunTable, ({ one }) => ({
  taskRecord: one(taskRecordTable, {
    fields: [agentRunTable.taskRecordId],
    references: [taskRecordTable.id],
  }),
}))
