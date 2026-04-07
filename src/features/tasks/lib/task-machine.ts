import { eq } from "drizzle-orm"
import { type InferStates, machine } from "machin"
import { withDrizzlePg } from "machin/drizzle/pg"
import { createActivityLogEvent } from "@/features/observability/lib/create-activity-log-event"
import { projectTable } from "@/features/projects/db"
import { publishTask } from "@/features/tasks/lib/publish-task"
import { taskTable } from "@/features/tasks/db"
import { db } from "@/lib/db"

type TaskMachineContext = {
  acceptedBy: string | null
  descriptionMarkdown: string
  idempotencyKey: string
  model: string | null
  projectId: string
  proposedBy: string | null
  rejectedBy: string | null
  schemaVersion: number
  sortOrder: number
  sourceSchemaVersionId: string | null
  targetSchemaVersionId: string | null
  title: string
}

type AcceptEvent = {
  acceptedByUserId: string
  taskId: string
}

type RejectEvent = {
  rejectedByUserId: string
  taskId: string
}

type RetryEvent = {
  acceptedByUserId: string
  rejectedByUserId: string
  taskId: string
}

const taskMachineDefinition = machine<TaskMachineContext>().define({
  initial: "created",
  states: {
    created: {
      on: {
        accept: { target: "accepting" },
        reject: { target: "rejecting" },
      },
    },
    accepting: {
      entry: async (context, event: AcceptEvent | RetryEvent) => {
        const acceptedByUserId =
          "acceptedByUserId" in event
            ? event.acceptedByUserId
            : context.acceptedBy

        if (!acceptedByUserId) {
          throw new Error("Accepted by user id is required.")
        }

        const project = await db
          .select({ organizationId: projectTable.organizationId })
          .from(projectTable)
          .where(eq(projectTable.id, context.projectId))
          .then((rows) => rows[0] ?? null)

        if (!project) {
          throw new Error("Task project was not found.")
        }

        await db
          .update(taskTable)
          .set({ acceptedBy: acceptedByUserId, rejectedBy: null })
          .where(eq(taskTable.id, event.taskId))

        await publishTask({
          createdByUserId: acceptedByUserId,
          database: db,
          organizationId: project.organizationId,
          task: {
            descriptionMarkdown: context.descriptionMarkdown,
            id: event.taskId,
            projectId: context.projectId,
            schemaVersion: context.schemaVersion,
            sortOrder: context.sortOrder,
            sourceSchemaVersionId: context.sourceSchemaVersionId,
            targetSchemaVersionId: context.targetSchemaVersionId,
            title: context.title,
          },
        })

        await createActivityLogEvent({
          actorId: acceptedByUserId,
          actorType: "user",
          agentRunId: null,
          database: db,
          entityId: event.taskId,
          entityType: "task",
          eventType: "task.draft_accepted",
          organizationId: project.organizationId,
          payload: {
            schemaVersion: context.schemaVersion,
            title: context.title,
          },
          projectId: context.projectId,
          recordId: null,
          relatedProjectId: null,
          relatedRecordId: null,
          taskId: event.taskId,
          taskRecordId: null,
        })

        return {
          ...context,
          acceptedBy: acceptedByUserId,
          rejectedBy: null,
        }
      },
      onError: { target: "accepting_failed" },
      onSuccess: { target: "accepted" },
    },
    accepting_failed: {
      on: {
        retry: { target: "accepting" },
      },
    },
    accepted: {},
    rejecting: {
      entry: async (context, event: RejectEvent | RetryEvent) => {
        const rejectedByUserId =
          "rejectedByUserId" in event
            ? event.rejectedByUserId
            : context.rejectedBy

        if (!rejectedByUserId) {
          throw new Error("Rejected by user id is required.")
        }

        const project = await db
          .select({ organizationId: projectTable.organizationId })
          .from(projectTable)
          .where(eq(projectTable.id, context.projectId))
          .then((rows) => rows[0] ?? null)

        if (!project) {
          throw new Error("Task project was not found.")
        }

        await createActivityLogEvent({
          actorId: rejectedByUserId,
          actorType: "user",
          agentRunId: null,
          database: db,
          entityId: event.taskId,
          entityType: "task",
          eventType: "task.draft_rejected",
          organizationId: project.organizationId,
          payload: {
            schemaVersion: context.schemaVersion,
            title: context.title,
          },
          projectId: context.projectId,
          recordId: null,
          relatedProjectId: null,
          relatedRecordId: null,
          taskId: event.taskId,
          taskRecordId: null,
        })

        return {
          ...context,
          acceptedBy: null,
          rejectedBy: rejectedByUserId,
        }
      },
      onError: { target: "rejecting_failed" },
      onSuccess: { target: "rejected" },
    },
    rejecting_failed: {
      on: {
        retry: { target: "rejecting" },
      },
    },
    rejected: {},
  },
})

export type TaskState = InferStates<typeof taskMachineDefinition>

const taskMachine = withDrizzlePg(taskMachineDefinition, {
  db,
  table: taskTable,
})

export const createTaskActor = async (
  id: string,
  context: TaskMachineContext,
) => taskMachine.createActor(id, context)

export const getTaskActor = async (taskId: string) => {
  const actor = await taskMachine.getActor(taskId)

  if (!actor) {
    throw new Error(`Task ${taskId} not found.`)
  }

  return actor
}
