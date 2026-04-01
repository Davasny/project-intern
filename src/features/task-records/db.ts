import { relations, sql } from "drizzle-orm"
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import { recordTable } from "@/features/records/db"
import type { TaskRecordState } from "@/features/task-records/schemas/task-record-state"
import { taskTable } from "@/features/tasks/db"

const createdAtColumn = () =>
  timestamp("created_at", { withTimezone: true }).defaultNow().notNull()

const updatedAtColumn = () =>
  timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull()

export const taskRecordTable = pgTable(
  "task_record",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => taskTable.id, { onDelete: "cascade" }),
    recordId: uuid("record_id")
      .notNull()
      .references(() => recordTable.id, { onDelete: "cascade" }),
    state: text("state").$type<TaskRecordState>().notNull(),
    agentRunId: uuid("agent_run_id"),
    lastTransitionAt: timestamp("last_transition_at", {
      withTimezone: true,
    }).notNull(),
    errorCode: text("error_code"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("task_record_task_record_unique_idx").on(
      table.taskId,
      table.recordId,
    ),
    index("task_record_record_state_idx").on(table.recordId, table.state),
    index("task_record_task_state_idx").on(table.taskId, table.state),
    uniqueIndex("task_record_one_active_execution_per_record_idx")
      .on(table.recordId)
      .where(sql`${table.state} in ('picked_up', 'in_progress')`),
  ],
)

export const taskRecordRelations = relations(taskRecordTable, ({ one }) => ({
  record: one(recordTable, {
    fields: [taskRecordTable.recordId],
    references: [recordTable.id],
  }),
  task: one(taskTable, {
    fields: [taskRecordTable.taskId],
    references: [taskTable.id],
  }),
}))
