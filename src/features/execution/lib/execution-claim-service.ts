import { and, eq, inArray } from "drizzle-orm"
import { executionLogger } from "@/features/execution/lib/execution-logger"
import {
  type CandidateRejectionReason,
  type ClaimRequestedBy,
  selectWorkRecordClaimCandidate,
} from "@/features/execution/lib/select-work-record-claim-candidate"
import { internRunTable } from "@/features/intern-runs/db"
import { createInternRunCommand } from "@/features/intern-runs/lib/intern-run-commands"
import { activeInternRunStates } from "@/features/intern-runs/schemas/intern-run-state"
import { projectTable } from "@/features/projects/db"
import { taskTable } from "@/features/tasks/db"
import { workRecordTable } from "@/features/work-records/db"
import { getWorkRecordActor } from "@/features/work-records/lib/get-work-record-actor"
import { db } from "@/lib/db"

type ClaimAndCreateRunInput =
  | {
      requestedBy: "scheduler"
    }
  | {
      requestedBy: Exclude<ClaimRequestedBy, "scheduler">
      projectId: string
      workRecordId: string
    }

export type ClaimedWorkRecordExecution = {
  internRunId: string
  organizationId: string
  projectId: string
  recordId: string
  taskId: string
  workRecordId: string
}

export type ClaimAndCreateRunResult =
  | ({ status: "claimed" } & ClaimedWorkRecordExecution)
  | ({ status: "already_claimed" } & ClaimedWorkRecordExecution)
  | { status: "no_candidate"; reasons: CandidateRejectionReason[] }
  | { status: "claim_failed"; workRecordId: string; error: unknown }

const getWorkRecordScope = async (workRecordId: string) =>
  db
    .select({
      organizationId: projectTable.organizationId,
      projectId: taskTable.projectId,
      recordId: workRecordTable.recordId,
      taskId: workRecordTable.taskId,
    })
    .from(workRecordTable)
    .innerJoin(taskTable, eq(workRecordTable.taskId, taskTable.id))
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .where(eq(workRecordTable.id, workRecordId))
    .then((rows) => rows[0] ?? null)

const getExistingActiveInternRun = async (workRecordId: string) =>
  db
    .select({ id: internRunTable.id })
    .from(internRunTable)
    .where(
      and(
        eq(internRunTable.workRecordId, workRecordId),
        inArray(internRunTable.state, activeInternRunStates),
      ),
    )
    .orderBy(internRunTable.createdAt)
    .then((rows) => rows[0] ?? null)

const sendClaimEvent = async ({
  internRunId,
  workRecordId,
}: {
  internRunId: string
  workRecordId: string
}) => {
  let actor = await getWorkRecordActor(workRecordId)

  if (
    !actor.nextEvents.includes("claim") &&
    actor.nextEvents.includes("retry")
  ) {
    await actor.send("retry", { lastTransitionAt: new Date() })
    actor = await getWorkRecordActor(workRecordId)
  }

  if (!actor.nextEvents.includes("claim")) {
    throw new Error(
      `Work record ${workRecordId} cannot be claimed from state ${actor.state}`,
    )
  }

  await actor.send("claim", { internRunId, lastTransitionAt: new Date() })
}

const buildClaimedExecution = async ({
  internRunId,
  workRecordId,
}: {
  internRunId: string
  workRecordId: string
}): Promise<ClaimedWorkRecordExecution | null> => {
  const scope = await getWorkRecordScope(workRecordId)

  if (!scope) {
    return null
  }

  return { internRunId, workRecordId, ...scope }
}

const markInternRunFailedWithoutTaskTransition = async ({
  internRunId,
  reason,
}: {
  internRunId: string
  reason: string
}) => {
  await db
    .update(internRunTable)
    .set({
      failurePayload: { code: reason, reason, retryable: true },
      finishedAt: new Date(),
      state: "failed",
    })
    .where(eq(internRunTable.id, internRunId))
}

export const claimAndCreateRun = async (
  input: ClaimAndCreateRunInput,
): Promise<ClaimAndCreateRunResult> => {
  const selected = await selectWorkRecordClaimCandidate(input)

  if (selected.status === "no_candidate") {
    return selected
  }

  const { candidate } = selected
  const existingInternRun = await getExistingActiveInternRun(
    candidate.workRecordId,
  )

  if (existingInternRun) {
    const execution = await buildClaimedExecution({
      internRunId: existingInternRun.id,
      workRecordId: candidate.workRecordId,
    })

    if (execution) {
      executionLogger.info(
        {
          requestedBy: input.requestedBy,
          workRecordId: execution.workRecordId,
          recordId: execution.recordId,
          taskId: execution.taskId,
          projectId: execution.projectId,
          organizationId: execution.organizationId,
          internRunId: execution.internRunId,
        },
        "Work record already has an intern run",
      )

      return { status: "already_claimed", ...execution }
    }
  }

  const internRunResult = await createInternRunCommand({
    attemptNumber: candidate.attemptNumber,
    model: candidate.model,
    projectDefaultModel: candidate.projectDefaultModel,
    projectDefaultTemperature: candidate.projectDefaultTemperature,
    workRecordId: candidate.workRecordId,
    temperature: candidate.temperature,
  }).catch((error: unknown) => {
    executionLogger.error(
      {
        requestedBy: input.requestedBy,
        workRecordId: candidate.workRecordId,
        error,
      },
      "Work record claim failed while creating intern run",
    )

    return { error }
  })

  if (internRunResult && "error" in internRunResult) {
    return {
      status: "claim_failed",
      workRecordId: candidate.workRecordId,
      error: internRunResult.error,
    }
  }

  if (!internRunResult) {
    const error = new Error("Failed to create intern run")
    executionLogger.error(
      { requestedBy: input.requestedBy, workRecordId: candidate.workRecordId },
      "Work record claim failed while creating intern run",
    )
    return {
      status: "claim_failed",
      workRecordId: candidate.workRecordId,
      error,
    }
  }

  try {
    await sendClaimEvent({
      internRunId: internRunResult.internRunId,
      workRecordId: candidate.workRecordId,
    })
  } catch (error) {
    executionLogger.error(
      {
        requestedBy: input.requestedBy,
        workRecordId: candidate.workRecordId,
        internRunId: internRunResult.internRunId,
        error,
      },
      "Work record claim transition failed after intern run creation",
    )

    try {
      await markInternRunFailedWithoutTaskTransition({
        internRunId: internRunResult.internRunId,
        reason: "CLAIM_TRANSITION_FAILED",
      })
    } catch (compensationError) {
      executionLogger.error(
        {
          requestedBy: input.requestedBy,
          workRecordId: candidate.workRecordId,
          internRunId: internRunResult.internRunId,
          error: compensationError,
        },
        "Failed to compensate intern run after claim transition failure",
      )
    }

    return {
      status: "claim_failed",
      workRecordId: candidate.workRecordId,
      error,
    }
  }

  const execution = await buildClaimedExecution({
    internRunId: internRunResult.internRunId,
    workRecordId: candidate.workRecordId,
  })

  if (!execution) {
    return {
      status: "claim_failed",
      workRecordId: candidate.workRecordId,
      error: new Error("Work record scope not found after claim"),
    }
  }

  executionLogger.info(
    {
      requestedBy: input.requestedBy,
      workRecordId: execution.workRecordId,
      recordId: execution.recordId,
      taskId: execution.taskId,
      projectId: execution.projectId,
      organizationId: execution.organizationId,
      internRunId: execution.internRunId,
      attemptNumber: candidate.attemptNumber,
    },
    "Work record claimed",
  )

  return { status: "claimed", ...execution }
}

export const releaseClaimedWorkRecord = async ({
  internRunId,
  reason,
  workRecordId,
}: {
  internRunId: string
  reason: string
  workRecordId: string
}) => {
  const actor = await getWorkRecordActor(workRecordId)

  executionLogger.warn(
    { workRecordId, internRunId, reason, beforeState: actor.state },
    "Releasing claimed work record",
  )

  if (actor.nextEvents.includes("release")) {
    await actor.send("release", { lastTransitionAt: new Date() })
  }

  await markInternRunFailedWithoutTaskTransition({
    internRunId,
    reason,
  })
}
