import { eq } from "drizzle-orm"
import { projectTable } from "@/features/projects/db"
import { taskRecordTable } from "@/features/task-records/db"
import { getTaskRecordActor } from "@/features/task-records/lib/get-task-record-actor"
import { taskRecordMachine } from "@/features/task-records/lib/task-record-machine"
import { taskTable } from "@/features/tasks/db"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type LaunchTaskRecordExecutionParams = {
  projectId: string
  taskRecordId: string
}

type LaunchedExecution = {
  agentRunId: string
  organizationId: string
  projectId: string
  recordId: string
  taskId: string
  taskRecordId: string
}

type TaskRecordActor = NonNullable<
  Awaited<ReturnType<typeof taskRecordMachine.getActor>>
>

export const launchTaskRecordExecution = async ({
  projectId,
  taskRecordId,
}: LaunchTaskRecordExecutionParams): Promise<LaunchedExecution | null> => {
  const childLogger = logger.child({
    name: "launchTaskRecordExecution",
    projectId,
    taskRecordId,
  })

  const actor = await taskRecordMachine.getActor(taskRecordId)

  if (!actor) {
    childLogger.warn({ msg: "Could not find taskRecordMachine" })

    return null
  }

  const claimActor = actor.nextEvents.includes("claim")
    ? actor
    : await prepareForClaim(actor)

  if (!claimActor) {
    childLogger.warn({ msg: "Could not find claim" })

    return null
  }

  await claimActor.send("claim", {
    lastTransitionAt: new Date(),
  })

  const refreshedActor = await getTaskRecordActor(taskRecordId)

  if (!refreshedActor.context.agentRunId) {
    childLogger.warn({ msg: "No agentRunId after claim" })

    return null
  }

  const scope = await db
    .select({
      organizationId: projectTable.organizationId,
      projectId: taskTable.projectId,
      recordId: taskRecordTable.recordId,
      taskId: taskRecordTable.taskId,
    })
    .from(taskRecordTable)
    .innerJoin(taskTable, eq(taskRecordTable.taskId, taskTable.id))
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .where(eq(taskRecordTable.id, taskRecordId))
    .then((rows) => rows[0] ?? null)

  if (!scope) {
    childLogger.warn({ msg: "Could not find task record scope" })

    return null
  }

  return {
    agentRunId: refreshedActor.context.agentRunId,
    organizationId: scope.organizationId,
    projectId: scope.projectId,
    recordId: scope.recordId,
    taskId: scope.taskId,
    taskRecordId: taskRecordId,
  }
}

const prepareForClaim = async (actor: TaskRecordActor) => {
  if (!actor.nextEvents.includes("retry")) {
    return null
  }

  await actor.send("retry", {
    lastTransitionAt: new Date(),
  })

  const refreshedActor = await taskRecordMachine.getActor(actor.id)

  if (!refreshedActor) {
    return null
  }

  if (!refreshedActor.nextEvents.includes("claim")) {
    return null
  }

  return refreshedActor
}
