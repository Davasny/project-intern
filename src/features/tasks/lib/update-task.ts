import { TRPCError } from "@trpc/server"
import { and, desc, eq } from "drizzle-orm"
import { createActivityLogEvent } from "@/features/observability/lib/create-activity-log-event"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { taskDescriptionRevisionTable, taskTable } from "@/features/tasks/db"
import type { TaskUpdateInput } from "@/features/tasks/schemas/task-input"
import { db } from "@/lib/db"
import { validateApprovedTaskModel } from "@/lib/llm/validate-approved-task-model"
import { validateRuntimeTemperature } from "@/lib/llm/validate-runtime-temperature"
import { logger } from "@/lib/logger"

type UpdateTaskParams = {
  input: TaskUpdateInput
  organizationSlug: string
  projectSlug: string
  userId: string
}

export const updateTask = async ({
  input,
  organizationSlug,
  projectSlug,
  userId,
}: UpdateTaskParams) => {
  const project = await ensureProjectAccess({
    organizationSlug,
    projectSlug,
    userId,
  })

  if (!project) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this project.",
    })
  }

  const existingTask = await db
    .select({
      descriptionMarkdown: taskTable.descriptionMarkdown,
      id: taskTable.id,
      state: taskTable.state,
    })
    .from(taskTable)
    .where(
      and(eq(taskTable.id, input.taskId), eq(taskTable.projectId, project.id)),
    )
    .then((rows) => rows[0] ?? null)

  if (!existingTask) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Task was not found.",
    })
  }

  if (existingTask.state === "rejected") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Rejected task drafts cannot be edited.",
    })
  }

  const model = validateApprovedTaskModel({ model: input.model })
  const temperature = validateRuntimeTemperature({
    temperature: input.temperature,
  })

  const [task] = await db
    .update(taskTable)
    .set({
      descriptionMarkdown: input.descriptionMarkdown,
      model,
      temperature,
      schemaVersion: input.schemaVersion,
      title: input.title,
    })
    .where(eq(taskTable.id, input.taskId))
    .returning({
      createdAt: taskTable.createdAt,
      descriptionMarkdown: taskTable.descriptionMarkdown,
      id: taskTable.id,
      model: taskTable.model,
      temperature: taskTable.temperature,
      schemaVersion: taskTable.schemaVersion,
      sortOrder: taskTable.sortOrder,
      sourceSchemaVersionId: taskTable.sourceSchemaVersionId,
      state: taskTable.state,
      targetSchemaVersionId: taskTable.targetSchemaVersionId,
      title: taskTable.title,
      updatedAt: taskTable.updatedAt,
    })

  if (
    existingTask.state === "accepted" &&
    existingTask.descriptionMarkdown !== input.descriptionMarkdown
  ) {
    const latestRevision = await db
      .select({ revisionNumber: taskDescriptionRevisionTable.revisionNumber })
      .from(taskDescriptionRevisionTable)
      .where(eq(taskDescriptionRevisionTable.taskId, input.taskId))
      .orderBy(desc(taskDescriptionRevisionTable.revisionNumber))
      .then((rows) => rows[0] ?? null)

    await db.insert(taskDescriptionRevisionTable).values({
      createdByUserId: userId,
      descriptionMarkdown: input.descriptionMarkdown,
      revisionNumber: latestRevision ? latestRevision.revisionNumber + 1 : 1,
      taskId: input.taskId,
    })

    await createActivityLogEvent({
      actorId: userId,
      actorType: "user",
      agentRunId: null,
      database: db,
      entityId: input.taskId,
      entityType: "task",
      eventType: "task.description_revised",
      organizationId: project.organizationId,
      payload: {
        nextDescriptionLength: input.descriptionMarkdown.length,
        title: task.title,
      },
      projectId: project.id,
      recordId: null,
      relatedProjectId: null,
      relatedRecordId: null,
      taskId: input.taskId,
      taskRecordId: null,
    })
  }

  logger.info(
    { projectId: project.id, taskId: input.taskId, userId },
    "Updated task",
  )

  return task
}
