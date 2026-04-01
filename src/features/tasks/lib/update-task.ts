import { TRPCError } from "@trpc/server"
import { and, desc, eq } from "drizzle-orm"
import { validateApprovedTaskModel } from "@/features/execution/lib/validate-approved-task-model"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { taskDescriptionRevisionTable, taskTable } from "@/features/tasks/db"
import type { TaskUpdateInput } from "@/features/tasks/schemas/task-input"
import { db } from "@/lib/db"

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

  const model = validateApprovedTaskModel({ model: input.model })

  const [task] = await db
    .update(taskTable)
    .set({
      descriptionMarkdown: input.descriptionMarkdown,
      model,
      pipelineVersion: input.pipelineVersion,
      schemaVersion: input.schemaVersion,
      title: input.title,
    })
    .where(eq(taskTable.id, input.taskId))
    .returning({
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

  if (existingTask.descriptionMarkdown !== input.descriptionMarkdown) {
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
  }

  return task
}
