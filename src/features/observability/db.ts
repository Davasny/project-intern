import { relations, sql } from "drizzle-orm"
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"
import { agentRunTable } from "@/features/agent-runs/db"
import { projectTable } from "@/features/projects/db"
import { recordTable } from "@/features/records/db"
import { taskRecordTable } from "@/features/task-records/db"
import { taskTable } from "@/features/tasks/db"

const createdAtColumn = () =>
  timestamp("created_at", { withTimezone: true }).defaultNow().notNull()

export const activityLogTable = pgTable(
  "activity_log",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey(),
    organizationId: uuid("organization_id"),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projectTable.id, { onDelete: "cascade" }),
    recordId: uuid("record_id").references(() => recordTable.id, {
      onDelete: "set null",
    }),
    relatedProjectId: uuid("related_project_id").references(
      () => projectTable.id,
      { onDelete: "set null" },
    ),
    relatedRecordId: uuid("related_record_id").references(
      () => recordTable.id,
      { onDelete: "set null" },
    ),
    taskId: uuid("task_id").references(() => taskTable.id, {
      onDelete: "set null",
    }),
    taskRecordId: uuid("task_record_id").references(() => taskRecordTable.id, {
      onDelete: "set null",
    }),
    agentRunId: uuid("agent_run_id").references(() => agentRunTable.id, {
      onDelete: "set null",
    }),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    eventType: text("event_type").notNull(),
    actorType: text("actor_type").notNull(),
    actorId: uuid("actor_id"),
    payload: jsonb("payload")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: createdAtColumn(),
  },
  (table) => [
    index("activity_log_project_created_at_idx").on(
      table.projectId,
      table.createdAt,
    ),
    index("activity_log_project_record_created_at_idx").on(
      table.projectId,
      table.recordId,
      table.createdAt,
    ),
    index("activity_log_project_task_created_at_idx").on(
      table.projectId,
      table.taskId,
      table.createdAt,
    ),
    index("activity_log_task_record_created_at_idx").on(
      table.taskRecordId,
      table.createdAt,
    ),
    index("activity_log_agent_run_created_at_idx").on(
      table.agentRunId,
      table.createdAt,
    ),
    index("activity_log_related_project_record_created_at_idx").on(
      table.relatedProjectId,
      table.relatedRecordId,
      table.createdAt,
    ),
    index("activity_log_entity_idx").on(
      table.entityType,
      table.entityId,
      table.createdAt,
    ),
  ],
)

export const activityLogRelations = relations(activityLogTable, ({ one }) => ({
  agentRun: one(agentRunTable, {
    fields: [activityLogTable.agentRunId],
    references: [agentRunTable.id],
  }),
  project: one(projectTable, {
    fields: [activityLogTable.projectId],
    references: [projectTable.id],
    relationName: "activity_log_project",
  }),
  record: one(recordTable, {
    fields: [activityLogTable.recordId],
    references: [recordTable.id],
    relationName: "activity_log_record",
  }),
  relatedProject: one(projectTable, {
    fields: [activityLogTable.relatedProjectId],
    references: [projectTable.id],
    relationName: "activity_log_related_project",
  }),
  relatedRecord: one(recordTable, {
    fields: [activityLogTable.relatedRecordId],
    references: [recordTable.id],
    relationName: "activity_log_related_record",
  }),
  task: one(taskTable, {
    fields: [activityLogTable.taskId],
    references: [taskTable.id],
  }),
  taskRecord: one(taskRecordTable, {
    fields: [activityLogTable.taskRecordId],
    references: [taskRecordTable.id],
  }),
}))
