import { claimWorkRecordCandidate } from "@/features/execution/lib/claim-work-record-candidate"
import { executionLogger } from "@/features/execution/lib/execution-logger"

export type ClaimRequestedBy = "scheduler" | "manual" | "retry" | "reconciler"

export type CandidateRejectionReason =
  | "work_record_not_claimable_state"
  | "earlier_task_not_terminal"
  | "active_work_record_exists"
  | "active_intern_run_exists"
  | "project_autopick_disabled"
  | "work_record_locked_or_missing"

type SelectWorkRecordClaimCandidateInput =
  | {
      requestedBy: Exclude<ClaimRequestedBy, "scheduler">
      projectId: string
      workRecordId: string
    }
  | {
      requestedBy: "scheduler"
      projectId?: never
      workRecordId?: never
    }

type WorkRecordClaimCandidate = NonNullable<
  Awaited<ReturnType<typeof claimWorkRecordCandidate>>
>

export type SelectWorkRecordClaimCandidateResult =
  | { status: "candidate"; candidate: WorkRecordClaimCandidate }
  | { status: "no_candidate"; reasons: CandidateRejectionReason[] }

const defaultNoCandidateReasons = (
  input: SelectWorkRecordClaimCandidateInput,
): CandidateRejectionReason[] =>
  input.requestedBy === "scheduler"
    ? ["project_autopick_disabled", "work_record_locked_or_missing"]
    : [
        "work_record_not_claimable_state",
        "earlier_task_not_terminal",
        "active_work_record_exists",
        "active_intern_run_exists",
        "work_record_locked_or_missing",
      ]

export const selectWorkRecordClaimCandidate = async (
  input: SelectWorkRecordClaimCandidateInput,
): Promise<SelectWorkRecordClaimCandidateResult> => {
  const candidate = await claimWorkRecordCandidate(
    input.requestedBy === "scheduler"
      ? { mode: "autopick" }
      : {
          mode: "manual",
          projectId: input.projectId,
          workRecordId: input.workRecordId,
        },
  )

  if (!candidate) {
    const reasons = defaultNoCandidateReasons(input)

    executionLogger.info(
      {
        requestedBy: input.requestedBy,
        workRecordId: input.workRecordId ?? null,
        projectId: input.projectId ?? null,
        reasons,
      },
      "Work record claim candidate rejected",
    )

    return { status: "no_candidate", reasons }
  }

  executionLogger.info(
    {
      requestedBy: input.requestedBy,
      workRecordId: candidate.workRecordId,
      recordId: candidate.recordId,
      taskId: candidate.taskId,
      projectId: candidate.projectId,
      organizationId: candidate.organizationId,
      attemptNumber: candidate.attemptNumber,
    },
    "Work record claim candidate selected",
  )

  return { status: "candidate", candidate }
}
