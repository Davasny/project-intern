import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import { getActiveProjectSchemaVersion } from "@/features/project-schema/lib/get-active-project-schema-version"
import { acceptTaskDraft } from "@/features/tasks/lib/accept-task-draft"
import { createTaskDraft } from "@/features/tasks/lib/create-task-draft"
import { taskTable } from "@/features/tasks/db"
import type {
  TaskCreateIntent,
  TaskInput,
} from "@/features/tasks/schemas/task-input"
import { db } from "@/lib/db"
import { validateApprovedTaskModel } from "@/lib/llm/validate-approved-task-model"

type CreateTaskParams = {
  intent: TaskCreateIntent
  input: TaskInput
  organizationSlug: string
  projectSlug: string
  userId: string
}

export const createTask = async ({
  intent,
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

  const draftTask = await createTaskDraft({
    database: db,
    input: {
      ...input,
      model,
    },
    organizationId: activeSchemaVersion.project.organizationId,
    projectId: activeSchemaVersion.project.id,
    proposedByUserId: userId,
  })

  if (!draftTask) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Task draft could not be created.",
    })
  }

  if (intent === "create_draft") {
    return draftTask
  }

  const acceptedTask = await acceptTaskDraft({
    acceptedByUserId: userId,
    database: db,
    projectId: activeSchemaVersion.project.id,
    taskId: draftTask.id,
  })

  if (!acceptedTask) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Task draft could not be accepted.",
    })
  }

  return db
    .select({
      createdAt: taskTable.createdAt,
      descriptionMarkdown: taskTable.descriptionMarkdown,
      id: taskTable.id,
      model: taskTable.model,
      schemaVersion: taskTable.schemaVersion,
      sortOrder: taskTable.sortOrder,
      sourceSchemaVersionId: taskTable.sourceSchemaVersionId,
      state: taskTable.state,
      targetSchemaVersionId: taskTable.targetSchemaVersionId,
      title: taskTable.title,
      updatedAt: taskTable.updatedAt,
    })
    .from(taskTable)
    .where(eq(taskTable.id, acceptedTask.id))
    .then((rows) => rows[0] ?? null)
}
