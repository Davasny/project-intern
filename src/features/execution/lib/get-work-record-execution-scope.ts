import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import { buildExecutionScopeErrorMessage } from "@/features/execution/lib/build-execution-scope-error-message"
import type { ExecutionRunScope } from "@/features/execution/schemas/execution-run-scope"
import type { ExecutionScopeValidationFailure } from "@/features/execution/schemas/execution-scope-validation-failure"
import { internRunTable } from "@/features/intern-runs/db"
import { projectTable } from "@/features/projects/db"
import { recordTable } from "@/features/records/db"
import { taskTable } from "@/features/tasks/db"
import { workRecordTable } from "@/features/work-records/db"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type GetWorkRecordExecutionScopeParams = ExecutionRunScope

export const getWorkRecordExecutionScope = async ({
  internRunId,
  projectId,
  recordId,
  taskId,
  workRecordId,
}: GetWorkRecordExecutionScopeParams) => {
  const executionScopeInput: ExecutionRunScope = {
    internRunId,
    projectId,
    recordId,
    taskId,
    workRecordId,
  }

  const [internRun, project, record, task, workRecord] = await Promise.all([
    db
      .select({
        attemptNumber: internRunTable.attemptNumber,
        directory: internRunTable.directory,
        id: internRunTable.id,
        selectedIntern: internRunTable.selectedIntern,
        selectedModel: internRunTable.selectedModel,
        sessionReference: internRunTable.sessionReference,
        state: internRunTable.state,
        workRecordId: internRunTable.workRecordId,
      })
      .from(internRunTable)
      .where(eq(internRunTable.id, internRunId))
      .then((rows) => rows[0] ?? null),
    db
      .select({
        defaultModel: projectTable.defaultModel,
        defaultTemperature: projectTable.defaultTemperature,
        descriptionMarkdown: projectTable.descriptionMarkdown,
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
        id: workRecordTable.id,
        recordId: workRecordTable.recordId,
        state: workRecordTable.state,
        taskId: workRecordTable.taskId,
      })
      .from(workRecordTable)
      .where(eq(workRecordTable.id, workRecordId))
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

  if (!workRecord) {
    throwScopeValidationError({
      invalidFields: ["workRecordId"],
      reason: "work_record_not_found",
    })
  }

  if (!internRun) {
    throwScopeValidationError({
      invalidFields: ["internRunId"],
      reason: "intern_run_not_found",
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

  if (workRecord.recordId !== record.id) {
    throwScopeValidationError({
      invalidFields: ["workRecordId", "recordId"],
      reason: "work_record_record_mismatch",
    })
  }

  if (workRecord.taskId !== task.id) {
    throwScopeValidationError({
      invalidFields: ["workRecordId", "taskId"],
      reason: "work_record_task_mismatch",
    })
  }

  if (internRun.workRecordId !== workRecord.id) {
    throwScopeValidationError({
      invalidFields: ["internRunId", "workRecordId"],
      reason: "intern_run_work_record_mismatch",
    })
  }

  return {
    internRun: {
      attemptNumber: internRun.attemptNumber,
      directory: internRun.directory,
      id: internRun.id,
      selectedIntern: internRun.selectedIntern,
      selectedModel: internRun.selectedModel,
      sessionReference: internRun.sessionReference,
      state: internRun.state,
    },
    project: {
      defaultModel: project.defaultModel,
      defaultTemperature: project.defaultTemperature,
      descriptionMarkdown: project.descriptionMarkdown,
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
    workRecord: {
      id: workRecord.id,
      state: workRecord.state,
    },
  }
}
