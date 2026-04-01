import { relations, sql } from "drizzle-orm"
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import { agentRunTable } from "@/features/agent-runs/db"
import type { PipelineRunState } from "@/features/pipelines/schemas/pipeline-run-state"
import { projectTable } from "@/features/projects/db"
import { recordTable } from "@/features/records/db"
import { taskRecordTable } from "@/features/task-records/db"
import { taskTable } from "@/features/tasks/db"

const createdAtColumn = () =>
  timestamp("created_at", { withTimezone: true }).defaultNow().notNull()

const updatedAtColumn = () =>
  timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull()

export const pipelineDefinitionTable = pgTable(
  "pipeline_definition",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projectTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    version: text("version").notNull(),
    stages: jsonb("stages").$type<string[]>().notNull(),
    parserAssetVersion: text("parser_asset_version").notNull(),
    createdAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex("pipeline_definition_project_version_unique_idx").on(
      table.projectId,
      table.version,
    ),
    index("pipeline_definition_project_created_at_idx").on(
      table.projectId,
      table.createdAt,
    ),
  ],
)

export const pipelineRunTable = pgTable(
  "pipeline_run",
  {
    id: uuid("id").default(sql`uuidv7()`).primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projectTable.id, { onDelete: "cascade" }),
    recordId: uuid("record_id")
      .notNull()
      .references(() => recordTable.id, { onDelete: "cascade" }),
    taskId: uuid("task_id")
      .notNull()
      .references(() => taskTable.id, { onDelete: "cascade" }),
    taskRecordId: uuid("task_record_id")
      .notNull()
      .references(() => taskRecordTable.id, { onDelete: "cascade" }),
    agentRunId: uuid("agent_run_id").references(() => agentRunTable.id, {
      onDelete: "set null",
    }),
    pipelineDefinitionId: uuid("pipeline_definition_id").references(
      () => pipelineDefinitionTable.id,
      { onDelete: "set null" },
    ),
    pipelineVersion: text("pipeline_version").notNull(),
    stage: text("stage").notNull(),
    state: text("state").$type<PipelineRunState>().notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index("pipeline_run_project_record_created_at_idx").on(
      table.projectId,
      table.recordId,
      table.createdAt,
    ),
    index("pipeline_run_task_record_created_at_idx").on(
      table.taskRecordId,
      table.createdAt,
    ),
  ],
)

export const pipelineDefinitionRelations = relations(
  pipelineDefinitionTable,
  ({ one, many }) => ({
    project: one(projectTable, {
      fields: [pipelineDefinitionTable.projectId],
      references: [projectTable.id],
    }),
    runs: many(pipelineRunTable),
  }),
)

export const pipelineRunRelations = relations(pipelineRunTable, ({ one }) => ({
  agentRun: one(agentRunTable, {
    fields: [pipelineRunTable.agentRunId],
    references: [agentRunTable.id],
  }),
  pipelineDefinition: one(pipelineDefinitionTable, {
    fields: [pipelineRunTable.pipelineDefinitionId],
    references: [pipelineDefinitionTable.id],
  }),
  project: one(projectTable, {
    fields: [pipelineRunTable.projectId],
    references: [projectTable.id],
  }),
  record: one(recordTable, {
    fields: [pipelineRunTable.recordId],
    references: [recordTable.id],
  }),
  task: one(taskTable, {
    fields: [pipelineRunTable.taskId],
    references: [taskTable.id],
  }),
  taskRecord: one(taskRecordTable, {
    fields: [pipelineRunTable.taskRecordId],
    references: [taskRecordTable.id],
  }),
}))
