import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import { validateApprovedTaskModel } from "@/features/execution/lib/validate-approved-task-model"
import { getActiveProjectSchemaVersion } from "@/features/project-schema/lib/get-active-project-schema-version"
import { taskTable } from "@/features/tasks/db"
import { createProjectTask } from "@/features/tasks/lib/create-project-task"
import type { TaskInput } from "@/features/tasks/schemas/task-input"
import { db } from "@/lib/db"

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

  const task = await createProjectTask({
    createdByUserId: userId,
    database: db,
    descriptionMarkdown: input.descriptionMarkdown,
    model,
    organizationId: activeSchemaVersion.project.organizationId,
    pipelineVersion: input.pipelineVersion,
    projectId: activeSchemaVersion.project.id,
    schemaVersion: input.schemaVersion,
    sourceSchemaVersionId: null,
    targetSchemaVersionId: null,
    title: input.title,
  })

  return db
    .select({
      createdAt: taskTable.createdAt,
      descriptionMarkdown: taskTable.descriptionMarkdown,
      id: taskTable.id,
      model: taskTable.model,
      pipelineVersion: taskTable.pipelineVersion,
      schemaVersion: taskTable.schemaVersion,
      sortOrder: taskTable.sortOrder,
      sourceSchemaVersionId: taskTable.sourceSchemaVersionId,
      targetSchemaVersionId: taskTable.targetSchemaVersionId,
      title: taskTable.title,
      updatedAt: taskTable.updatedAt,
    })
    .from(taskTable)
    .where(eq(taskTable.id, task.id))
    .then((rows) => rows[0] ?? null)
}
