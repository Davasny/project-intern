import { TRPCError } from "@trpc/server"
import { asc, eq, sql } from "drizzle-orm"
import { validateApprovedTaskModel } from "@/features/execution/lib/validate-approved-task-model"
import { createActivityLogEvent } from "@/features/observability/lib/create-activity-log-event"
import { getActiveProjectSchemaVersion } from "@/features/project-schema/lib/get-active-project-schema-version"
import { fanOutTaskRecordsForTask } from "@/features/task-records/lib/fan-out-task-records-for-task"
import { taskDescriptionRevisionTable, taskTable } from "@/features/tasks/db"
import type { TaskInput } from "@/features/tasks/schemas/task-input"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type CreateTaskParams = {
  input: TaskInput
  organizationSlug: string
  projectSlug: string
  userId: string
}

export const createTask = async ({
  input,
  organizationSlug,
  projectSlug,
  userId,
}: CreateTaskParams) => {
  const activeSchemaVersion = await getActiveProjectSchemaVersion({
    organizationSlug,
    projectSlug,
    userId,
  })

  if (!activeSchemaVersion.project) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this project.",
    })
  }

  const model = validateApprovedTaskModel({ model: input.model })

  const nextSortOrder = await db
    .select({
      sortOrder: sql<number>`coalesce(max(${taskTable.sortOrder}), 0) + 1`,
    })
    .from(taskTable)
    .where(eq(taskTable.projectId, activeSchemaVersion.project.id))
    .then((rows) => rows[0]?.sortOrder ?? 1)

  const [task] = await db
    .insert(taskTable)
    .values({
      descriptionMarkdown: input.descriptionMarkdown,
      idempotencyKey: crypto.randomUUID(),
      model,
      pipelineVersion: input.pipelineVersion,
      projectId: activeSchemaVersion.project.id,
      schemaVersion: input.schemaVersion,
      sortOrder: nextSortOrder,
      title: input.title,
    })
    .returning({
      createdAt: taskTable.createdAt,
      descriptionMarkdown: taskTable.descriptionMarkdown,
      id: taskTable.id,
      idempotencyKey: taskTable.idempotencyKey,
      model: taskTable.model,
      pipelineVersion: taskTable.pipelineVersion,
      projectId: taskTable.projectId,
      schemaVersion: taskTable.schemaVersion,
      sortOrder: taskTable.sortOrder,
      title: taskTable.title,
      updatedAt: taskTable.updatedAt,
    })

  await db.insert(taskDescriptionRevisionTable).values({
    createdByUserId: userId,
    descriptionMarkdown: task.descriptionMarkdown,
    revisionNumber: 1,
    taskId: task.id,
  })

  await fanOutTaskRecordsForTask({
    projectId: activeSchemaVersion.project.id,
    taskId: task.id,
  })

  await createActivityLogEvent({
    actorId: userId,
    actorType: "user",
    agentRunId: null,
    entityId: task.id,
    entityType: "task",
    eventType: "task.created",
    organizationId: activeSchemaVersion.project.organizationId,
    payload: {
      schemaVersion: task.schemaVersion,
      sortOrder: task.sortOrder,
      title: task.title,
    },
    projectId: activeSchemaVersion.project.id,
    recordId: null,
    relatedProjectId: null,
    relatedRecordId: null,
    taskId: task.id,
    taskRecordId: null,
  })

  logger.info(
    { projectId: activeSchemaVersion.project.id, taskId: task.id, userId },
    "Created task and task records",
  )

  return db
    .select({
      createdAt: taskTable.createdAt,
      descriptionMarkdown: taskTable.descriptionMarkdown,
      id: taskTable.id,
      model: taskTable.model,
      pipelineVersion: taskTable.pipelineVersion,
      schemaVersion: taskTable.schemaVersion,
      sortOrder: taskTable.sortOrder,
      title: taskTable.title,
      updatedAt: taskTable.updatedAt,
    })
    .from(taskTable)
    .where(eq(taskTable.id, task.id))
    .orderBy(asc(taskTable.sortOrder))
    .then((rows) => rows[0] ?? null)
}
