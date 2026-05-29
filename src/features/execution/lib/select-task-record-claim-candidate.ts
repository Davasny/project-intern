import { claimTaskRecordCandidate } from "@/features/execution/lib/claim-task-record-candidate"
import { executionLogger } from "@/features/execution/lib/execution-logger"

export type ClaimRequestedBy = "scheduler" | "manual" | "retry" | "reconciler"

export type CandidateRejectionReason =
  | "task_record_not_claimable_state"
  | "earlier_task_not_terminal"
  | "active_task_record_exists"
  | "active_agent_run_exists"
  | "project_autopick_disabled"
  | "task_record_locked_or_missing"

type SelectTaskRecordClaimCandidateInput =
  | {
      requestedBy: Exclude<ClaimRequestedBy, "scheduler">
      projectId: string
      taskRecordId: string
    }
  | {
      requestedBy: "scheduler"
      projectId?: never
      taskRecordId?: never
    }

type TaskRecordClaimCandidate = NonNullable<
  Awaited<ReturnType<typeof claimTaskRecordCandidate>>
>

export type SelectTaskRecordClaimCandidateResult =
  | { status: "candidate"; candidate: TaskRecordClaimCandidate }
  | { status: "no_candidate"; reasons: CandidateRejectionReason[] }

const defaultNoCandidateReasons = (
  input: SelectTaskRecordClaimCandidateInput,
): CandidateRejectionReason[] =>
  input.requestedBy === "scheduler"
    ? ["project_autopick_disabled", "task_record_locked_or_missing"]
    : [
        "task_record_not_claimable_state",
        "earlier_task_not_terminal",
        "active_task_record_exists",
        "active_agent_run_exists",
        "task_record_locked_or_missing",
      ]

export const selectTaskRecordClaimCandidate = async (
  input: SelectTaskRecordClaimCandidateInput,
): Promise<SelectTaskRecordClaimCandidateResult> => {
  const candidate = await claimTaskRecordCandidate(
    input.requestedBy === "scheduler"
      ? { mode: "autopick" }
      : {
          mode: "manual",
          projectId: input.projectId,
          taskRecordId: input.taskRecordId,
        },
  )

  if (!candidate) {
    const reasons = defaultNoCandidateReasons(input)

    executionLogger.info(
      {
        requestedBy: input.requestedBy,
        taskRecordId: input.taskRecordId ?? null,
        projectId: input.projectId ?? null,
        reasons,
      },
      "Task record claim candidate rejected",
    )

    return { status: "no_candidate", reasons }
  }

  executionLogger.info(
    {
      requestedBy: input.requestedBy,
      taskRecordId: candidate.taskRecordId,
      recordId: candidate.recordId,
      taskId: candidate.taskId,
      projectId: candidate.projectId,
      organizationId: candidate.organizationId,
      attemptNumber: candidate.attemptNumber,
    },
    "Task record claim candidate selected",
  )

  return { status: "candidate", candidate }
}
