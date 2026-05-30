import { TRPCError } from "@trpc/server"
import { asc, eq } from "drizzle-orm"
import { getActiveProjectSchemaVersion } from "@/features/project-schema/lib/get-active-project-schema-version"
import { taskTable } from "@/features/tasks/db"
import { acceptTaskDraft } from "@/features/tasks/lib/accept-task-draft"
import { applyTaskOrder } from "@/features/tasks/lib/apply-task-order"
import { createTaskDraft } from "@/features/tasks/lib/create-task-draft"
import type {
  TaskCreateIntent,
  TaskInput,
} from "@/features/tasks/schemas/task-input"
import { db } from "@/lib/db"
import { validateApprovedTaskModel } from "@/lib/llm/validate-approved-task-model"
import { validateRuntimeTemperature } from "@/lib/llm/validate-runtime-temperature"

type CreateTaskParams = {
  insertAfterTaskId: string | null
  intent: TaskCreateIntent
  input: TaskInput
  organizationSlug: string
  projectSlug: string
  userId: string
}

export const createTask = async ({
  insertAfterTaskId,
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
  const temperature = validateRuntimeTemperature({
    temperature: input.temperature,
  })

  const draftTask = await createTaskDraft({
    database: db,
    input: {
      ...input,
      model,
      temperature,
    },
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
    if (insertAfterTaskId) {
      await repositionTaskAfter({
        newTaskId: draftTask.id,
        insertAfterTaskId,
        projectId: activeSchemaVersion.project.id,
      })
    }
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

  if (insertAfterTaskId) {
    await repositionTaskAfter({
      newTaskId: acceptedTask.id,
      insertAfterTaskId,
      projectId: activeSchemaVersion.project.id,
    })
  }

  return db
    .select({
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
    .from(taskTable)
    .where(eq(taskTable.id, acceptedTask.id))
    .then((rows) => rows[0] ?? null)
}

type RepositionTaskAfterParams = {
  insertAfterTaskId: string
  newTaskId: string
  projectId: string
}

const repositionTaskAfter = async ({
  insertAfterTaskId,
  newTaskId,
  projectId,
}: RepositionTaskAfterParams) => {
  const tasks = await db
    .select({ id: taskTable.id })
    .from(taskTable)
    .where(eq(taskTable.projectId, projectId))
    .orderBy(asc(taskTable.sortOrder))

  const insertIndex = tasks.findIndex((task) => task.id === insertAfterTaskId)

  if (insertIndex === -1) {
    return
  }

  const orderedIds = tasks.map((task) => task.id)
  const newIndex = insertIndex + 1
  const filteredIds = orderedIds.filter((id) => id !== newTaskId)
  filteredIds.splice(newIndex, 0, newTaskId)

  await applyTaskOrder({
    database: db,
    orderedTaskIds: filteredIds,
    projectId,
  })
}
