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
import { taskTable } from "@/features/tasks/db"
import type { WorkRecordState } from "@/features/work-records/schemas/work-record-state"

const createdAtColumn = () =>
  timestamp("created_at", { withTimezone: true }).defaultNow().notNull()

const updatedAtColumn = () =>
  timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull()

export const workRecordTable = pgTable(
  "work_record",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => taskTable.id, { onDelete: "cascade" }),
    recordId: uuid("record_id")
      .notNull()
      .references(() => recordTable.id, { onDelete: "cascade" }),
    state: text("state").$type<WorkRecordState>().notNull(),
    internRunId: uuid("intern_run_id"),
    lastTransitionAt: timestamp("last_transition_at", {
      withTimezone: true,
    }).notNull(),
    errorCode: text("error_code"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("work_record_work_record_unique_idx").on(
      table.taskId,
      table.recordId,
    ),
    index("work_record_record_state_idx").on(table.recordId, table.state),
    index("work_record_task_state_idx").on(table.taskId, table.state),
    uniqueIndex("work_record_one_active_execution_per_record_idx")
      .on(table.recordId)
      .where(sql`${table.state} in ('picked_up', 'in_progress')`),
  ],
)

export const workRecordRelations = relations(workRecordTable, ({ one }) => ({
  record: one(recordTable, {
    fields: [workRecordTable.recordId],
    references: [recordTable.id],
  }),
  task: one(taskTable, {
    fields: [workRecordTable.taskId],
    references: [taskTable.id],
  }),
}))
