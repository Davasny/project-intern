import { and, eq, inArray } from "drizzle-orm"
import { agentRunTable } from "@/features/agent-runs/db"
import { createAgentRunCommand } from "@/features/agent-runs/lib/agent-run-commands"
import { activeAgentRunStates } from "@/features/agent-runs/schemas/agent-run-state"
import { executionLogger } from "@/features/execution/lib/execution-logger"
import {
  type CandidateRejectionReason,
  type ClaimRequestedBy,
  selectTaskRecordClaimCandidate,
} from "@/features/execution/lib/select-task-record-claim-candidate"
import { projectTable } from "@/features/projects/db"
import { taskRecordTable } from "@/features/task-records/db"
import { getTaskRecordActor } from "@/features/task-records/lib/get-task-record-actor"
import { taskTable } from "@/features/tasks/db"
import { db } from "@/lib/db"

type ClaimAndCreateRunInput =
  | {
      requestedBy: "scheduler"
    }
  | {
      requestedBy: Exclude<ClaimRequestedBy, "scheduler">
      projectId: string
      taskRecordId: string
    }

export type ClaimedTaskRecordExecution = {
  agentRunId: string
  organizationId: string
  projectId: string
  recordId: string
  taskId: string
  taskRecordId: string
}

export type ClaimAndCreateRunResult =
  | ({ status: "claimed" } & ClaimedTaskRecordExecution)
  | ({ status: "already_claimed" } & ClaimedTaskRecordExecution)
  | { status: "no_candidate"; reasons: CandidateRejectionReason[] }
  | { status: "claim_failed"; taskRecordId: string; error: unknown }

const getTaskRecordScope = async (taskRecordId: string) =>
  db
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

const getExistingActiveAgentRun = async (taskRecordId: string) =>
  db
    .select({ id: agentRunTable.id })
    .from(agentRunTable)
    .where(
      and(
        eq(agentRunTable.taskRecordId, taskRecordId),
        inArray(agentRunTable.state, activeAgentRunStates),
      ),
    )
    .orderBy(agentRunTable.createdAt)
    .then((rows) => rows[0] ?? null)

const sendClaimEvent = async ({
  agentRunId,
  taskRecordId,
}: {
  agentRunId: string
  taskRecordId: string
}) => {
  let actor = await getTaskRecordActor(taskRecordId)

  if (
    !actor.nextEvents.includes("claim") &&
    actor.nextEvents.includes("retry")
  ) {
    await actor.send("retry", { lastTransitionAt: new Date() })
    actor = await getTaskRecordActor(taskRecordId)
  }

  if (!actor.nextEvents.includes("claim")) {
    throw new Error(
      `Task record ${taskRecordId} cannot be claimed from state ${actor.state}`,
    )
  }

  await actor.send("claim", { agentRunId, lastTransitionAt: new Date() })
}

const buildClaimedExecution = async ({
  agentRunId,
  taskRecordId,
}: {
  agentRunId: string
  taskRecordId: string
}): Promise<ClaimedTaskRecordExecution | null> => {
  const scope = await getTaskRecordScope(taskRecordId)

  if (!scope) {
    return null
  }

  return { agentRunId, taskRecordId, ...scope }
}

const markAgentRunFailedWithoutTaskTransition = async ({
  agentRunId,
  reason,
}: {
  agentRunId: string
  reason: string
}) => {
  await db
    .update(agentRunTable)
    .set({
      failurePayload: { code: reason, message: reason, retryable: true },
      finishedAt: new Date(),
      state: "failed",
    })
    .where(eq(agentRunTable.id, agentRunId))
}

export const claimAndCreateRun = async (
  input: ClaimAndCreateRunInput,
): Promise<ClaimAndCreateRunResult> => {
  const selected = await selectTaskRecordClaimCandidate(input)

  if (selected.status === "no_candidate") {
    return selected
  }

  const { candidate } = selected
  const existingAgentRun = await getExistingActiveAgentRun(
    candidate.taskRecordId,
  )

  if (existingAgentRun) {
    const execution = await buildClaimedExecution({
      agentRunId: existingAgentRun.id,
      taskRecordId: candidate.taskRecordId,
    })

    if (execution) {
      executionLogger.info(
        {
          requestedBy: input.requestedBy,
          taskRecordId: execution.taskRecordId,
          recordId: execution.recordId,
          taskId: execution.taskId,
          projectId: execution.projectId,
          organizationId: execution.organizationId,
          agentRunId: execution.agentRunId,
        },
        "Task record already has an agent run",
      )

      return { status: "already_claimed", ...execution }
    }
  }

  const agentRunResult = await createAgentRunCommand({
    attemptNumber: candidate.attemptNumber,
    model: candidate.model,
    projectDefaultModel: candidate.projectDefaultModel,
    projectDefaultTemperature: candidate.projectDefaultTemperature,
    taskRecordId: candidate.taskRecordId,
    temperature: candidate.temperature,
  }).catch((error: unknown) => {
    executionLogger.error(
      {
        requestedBy: input.requestedBy,
        taskRecordId: candidate.taskRecordId,
        error,
      },
      "Task record claim failed while creating agent run",
    )

    return { error }
  })

  if (agentRunResult && "error" in agentRunResult) {
    return {
      status: "claim_failed",
      taskRecordId: candidate.taskRecordId,
      error: agentRunResult.error,
    }
  }

  if (!agentRunResult) {
    const error = new Error("Failed to create agent run")
    executionLogger.error(
      { requestedBy: input.requestedBy, taskRecordId: candidate.taskRecordId },
      "Task record claim failed while creating agent run",
    )
    return {
      status: "claim_failed",
      taskRecordId: candidate.taskRecordId,
      error,
    }
  }

  try {
    await sendClaimEvent({
      agentRunId: agentRunResult.agentRunId,
      taskRecordId: candidate.taskRecordId,
    })
  } catch (error) {
    executionLogger.error(
      {
        requestedBy: input.requestedBy,
        taskRecordId: candidate.taskRecordId,
        agentRunId: agentRunResult.agentRunId,
        error,
      },
      "Task record claim transition failed after agent run creation",
    )

    try {
      await markAgentRunFailedWithoutTaskTransition({
        agentRunId: agentRunResult.agentRunId,
        reason: "CLAIM_TRANSITION_FAILED",
      })
    } catch (compensationError) {
      executionLogger.error(
        {
          requestedBy: input.requestedBy,
          taskRecordId: candidate.taskRecordId,
          agentRunId: agentRunResult.agentRunId,
          error: compensationError,
        },
        "Failed to compensate agent run after claim transition failure",
      )
    }

    return {
      status: "claim_failed",
      taskRecordId: candidate.taskRecordId,
      error,
    }
  }

  const execution = await buildClaimedExecution({
    agentRunId: agentRunResult.agentRunId,
    taskRecordId: candidate.taskRecordId,
  })

  if (!execution) {
    return {
      status: "claim_failed",
      taskRecordId: candidate.taskRecordId,
      error: new Error("Task record scope not found after claim"),
    }
  }

  executionLogger.info(
    {
      requestedBy: input.requestedBy,
      taskRecordId: execution.taskRecordId,
      recordId: execution.recordId,
      taskId: execution.taskId,
      projectId: execution.projectId,
      organizationId: execution.organizationId,
      agentRunId: execution.agentRunId,
      attemptNumber: candidate.attemptNumber,
    },
    "Task record claimed",
  )

  return { status: "claimed", ...execution }
}

export const releaseClaimedTaskRecord = async ({
  agentRunId,
  reason,
  taskRecordId,
}: {
  agentRunId: string
  reason: string
  taskRecordId: string
}) => {
  const actor = await getTaskRecordActor(taskRecordId)

  executionLogger.warn(
    { taskRecordId, agentRunId, reason, beforeState: actor.state },
    "Releasing claimed task record",
  )

  if (actor.nextEvents.includes("release")) {
    await actor.send("release", { lastTransitionAt: new Date() })
  }

  await markAgentRunFailedWithoutTaskTransition({
    agentRunId,
    reason,
  })
}
