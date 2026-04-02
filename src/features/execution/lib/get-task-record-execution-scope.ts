import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { agentRunTable } from "@/features/agent-runs/db"
import type { ExecutionRunScope } from "@/features/execution/schemas/execution-run-scope"
import { projectTable } from "@/features/projects/db"
import { recordTable } from "@/features/records/db"
import { taskRecordTable } from "@/features/task-records/db"
import { taskTable } from "@/features/tasks/db"
import { db } from "@/lib/db"

type GetTaskRecordExecutionScopeParams = ExecutionRunScope

export const getTaskRecordExecutionScope = async ({
  agentRunId,
  projectId,
  recordId,
  taskId,
  taskRecordId,
}: GetTaskRecordExecutionScopeParams) => {
  const executionScope = await db
    .select({
      agentRunAttemptNumber: agentRunTable.attemptNumber,
      agentRunId: agentRunTable.id,
      agentRunSelectedAgent: agentRunTable.selectedAgent,
      agentRunSelectedModel: agentRunTable.selectedModel,
      agentRunSessionReference: agentRunTable.sessionReference,
      agentRunState: agentRunTable.state,
      projectDisplayName: projectTable.displayName,
      projectId: projectTable.id,
      projectOrganizationId: projectTable.organizationId,
      projectSlug: projectTable.slug,
      recordContext: recordTable.context,
      recordCreatedAt: recordTable.createdAt,
      recordId: recordTable.id,
      recordName: recordTable.name,
      recordSchemaVersion: recordTable.schemaVersion,
      recordState: recordTable.state,
      recordUpdatedAt: recordTable.updatedAt,
      recordVersion: recordTable.version,
      taskDescriptionMarkdown: taskTable.descriptionMarkdown,
      taskId: taskTable.id,
      taskModel: taskTable.model,
      taskSchemaVersion: taskTable.schemaVersion,
      taskSortOrder: taskTable.sortOrder,
      taskTargetSchemaVersionId: taskTable.targetSchemaVersionId,
      taskTitle: taskTable.title,
      taskRecordId: taskRecordTable.id,
      taskRecordState: taskRecordTable.state,
    })
    .from(taskRecordTable)
    .innerJoin(taskTable, eq(taskRecordTable.taskId, taskTable.id))
    .innerJoin(recordTable, eq(taskRecordTable.recordId, recordTable.id))
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .innerJoin(
      agentRunTable,
      eq(agentRunTable.taskRecordId, taskRecordTable.id),
    )
    .where(
      and(
        eq(agentRunTable.id, agentRunId),
        eq(projectTable.id, projectId),
        eq(recordTable.id, recordId),
        eq(taskTable.id, taskId),
        eq(taskRecordTable.id, taskRecordId),
      ),
    )
    .then((rows) => rows[0] ?? null)

  if (!executionScope) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Execution scope is invalid.",
    })
  }

  return {
    agentRun: {
      attemptNumber: executionScope.agentRunAttemptNumber,
      id: executionScope.agentRunId,
      selectedAgent: executionScope.agentRunSelectedAgent,
      selectedModel: executionScope.agentRunSelectedModel,
      sessionReference: executionScope.agentRunSessionReference,
      state: executionScope.agentRunState,
    },
    project: {
      displayName: executionScope.projectDisplayName,
      id: executionScope.projectId,
      organizationId: executionScope.projectOrganizationId,
      slug: executionScope.projectSlug,
    },
    record: {
      context: executionScope.recordContext,
      createdAt: executionScope.recordCreatedAt,
      id: executionScope.recordId,
      name: executionScope.recordName,
      schemaVersion: executionScope.recordSchemaVersion,
      state: executionScope.recordState,
      updatedAt: executionScope.recordUpdatedAt,
      version: executionScope.recordVersion,
    },
    task: {
      descriptionMarkdown: executionScope.taskDescriptionMarkdown,
      id: executionScope.taskId,
      model: executionScope.taskModel,
      schemaVersion: executionScope.taskSchemaVersion,
      sortOrder: executionScope.taskSortOrder,
      targetSchemaVersionId: executionScope.taskTargetSchemaVersionId,
      title: executionScope.taskTitle,
    },
    taskRecord: {
      id: executionScope.taskRecordId,
      state: executionScope.taskRecordState,
    },
  }
}
