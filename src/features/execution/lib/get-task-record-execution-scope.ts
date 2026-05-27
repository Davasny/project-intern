import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import { agentRunTable } from "@/features/agent-runs/db"
import { buildExecutionScopeErrorMessage } from "@/features/execution/lib/build-execution-scope-error-message"
import type { ExecutionRunScope } from "@/features/execution/schemas/execution-run-scope"
import type { ExecutionScopeValidationFailure } from "@/features/execution/schemas/execution-scope-validation-failure"
import { projectTable } from "@/features/projects/db"
import { recordTable } from "@/features/records/db"
import { taskRecordTable } from "@/features/task-records/db"
import { taskTable } from "@/features/tasks/db"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type GetTaskRecordExecutionScopeParams = ExecutionRunScope

export const getTaskRecordExecutionScope = async ({
  agentRunId,
  projectId,
  recordId,
  taskId,
  taskRecordId,
}: GetTaskRecordExecutionScopeParams) => {
  const executionScopeInput: ExecutionRunScope = {
    agentRunId,
    projectId,
    recordId,
    taskId,
    taskRecordId,
  }

  const [agentRun, project, record, task, taskRecord] = await Promise.all([
    db
      .select({
        attemptNumber: agentRunTable.attemptNumber,
        id: agentRunTable.id,
        selectedAgent: agentRunTable.selectedAgent,
        selectedModel: agentRunTable.selectedModel,
        sessionReference: agentRunTable.sessionReference,
        state: agentRunTable.state,
        taskRecordId: agentRunTable.taskRecordId,
      })
      .from(agentRunTable)
      .where(eq(agentRunTable.id, agentRunId))
      .then((rows) => rows[0] ?? null),
    db
      .select({
        defaultModel: projectTable.defaultModel,
        defaultTemperature: projectTable.defaultTemperature,
        displayName: projectTable.displayName,
        id: projectTable.id,
        organizationId: projectTable.organizationId,
        slug: projectTable.slug,
      })
      .from(projectTable)
      .where(eq(projectTable.id, projectId))
      .then((rows) => rows[0] ?? null),
    db
      .select({
        context: recordTable.context,
        createdAt: recordTable.createdAt,
        id: recordTable.id,
        name: recordTable.name,
        projectId: recordTable.projectId,
        schemaVersion: recordTable.schemaVersion,
        state: recordTable.state,
        updatedAt: recordTable.updatedAt,
        version: recordTable.version,
      })
      .from(recordTable)
      .where(eq(recordTable.id, recordId))
      .then((rows) => rows[0] ?? null),
    db
      .select({
        descriptionMarkdown: taskTable.descriptionMarkdown,
        id: taskTable.id,
        model: taskTable.model,
        temperature: taskTable.temperature,
        projectId: taskTable.projectId,
        schemaVersion: taskTable.schemaVersion,
        sortOrder: taskTable.sortOrder,
        targetSchemaVersionId: taskTable.targetSchemaVersionId,
        title: taskTable.title,
      })
      .from(taskTable)
      .where(eq(taskTable.id, taskId))
      .then((rows) => rows[0] ?? null),
    db
      .select({
        id: taskRecordTable.id,
        recordId: taskRecordTable.recordId,
        state: taskRecordTable.state,
        taskId: taskRecordTable.taskId,
      })
      .from(taskRecordTable)
      .where(eq(taskRecordTable.id, taskRecordId))
      .then((rows) => rows[0] ?? null),
  ])

  const throwScopeValidationError = (
    failure: ExecutionScopeValidationFailure,
  ) => {
    logger.warn(
      {
        eventFamily: "execution.scope_validation",
        failure,
        scope: executionScopeInput,
      },
      "Execution scope validation failed",
    )

    const message = buildExecutionScopeErrorMessage({
      failure,
      scope: executionScopeInput,
    })

    throw new TRPCError({
      code: "FORBIDDEN",
      message,
    })
  }

  if (!project) {
    throwScopeValidationError({
      invalidFields: ["projectId"],
      reason: "project_not_found",
    })
  }

  if (!record) {
    throwScopeValidationError({
      invalidFields: ["recordId"],
      reason: "record_not_found",
    })
  }

  if (!task) {
    throwScopeValidationError({
      invalidFields: ["taskId"],
      reason: "task_not_found",
    })
  }

  if (!taskRecord) {
    throwScopeValidationError({
      invalidFields: ["taskRecordId"],
      reason: "task_record_not_found",
    })
  }

  if (!agentRun) {
    throwScopeValidationError({
      invalidFields: ["agentRunId"],
      reason: "agent_run_not_found",
    })
  }

  if (record.projectId !== project.id) {
    throwScopeValidationError({
      invalidFields: ["recordId", "projectId"],
      reason: "record_project_mismatch",
    })
  }

  if (task.projectId !== project.id) {
    throwScopeValidationError({
      invalidFields: ["taskId", "projectId"],
      reason: "task_project_mismatch",
    })
  }

  if (taskRecord.recordId !== record.id) {
    throwScopeValidationError({
      invalidFields: ["taskRecordId", "recordId"],
      reason: "task_record_record_mismatch",
    })
  }

  if (taskRecord.taskId !== task.id) {
    throwScopeValidationError({
      invalidFields: ["taskRecordId", "taskId"],
      reason: "task_record_task_mismatch",
    })
  }

  if (agentRun.taskRecordId !== taskRecord.id) {
    throwScopeValidationError({
      invalidFields: ["agentRunId", "taskRecordId"],
      reason: "agent_run_task_record_mismatch",
    })
  }

  return {
    agentRun: {
      attemptNumber: agentRun.attemptNumber,
      id: agentRun.id,
      selectedAgent: agentRun.selectedAgent,
      selectedModel: agentRun.selectedModel,
      sessionReference: agentRun.sessionReference,
      state: agentRun.state,
    },
    project: {
      defaultModel: project.defaultModel,
      defaultTemperature: project.defaultTemperature,
      displayName: project.displayName,
      id: project.id,
      organizationId: project.organizationId,
      slug: project.slug,
    },
    record: {
      context: record.context,
      createdAt: record.createdAt,
      id: record.id,
      name: record.name,
      schemaVersion: record.schemaVersion,
      state: record.state,
      updatedAt: record.updatedAt,
      version: record.version,
    },
    task: {
      descriptionMarkdown: task.descriptionMarkdown,
      id: task.id,
      model: task.model,
      temperature: task.temperature,
      schemaVersion: task.schemaVersion,
      sortOrder: task.sortOrder,
      targetSchemaVersionId: task.targetSchemaVersionId,
      title: task.title,
    },
    taskRecord: {
      id: taskRecord.id,
      state: taskRecord.state,
    },
  }
}
