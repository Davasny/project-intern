import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { internRunTable } from "@/features/intern-runs/db"
import { getInternRunById } from "@/features/intern-runs/lib/get-intern-run-by-id"
import { db } from "@/lib/db"

type GetInternRunAttemptByAnchorRunIdParams = {
  internRunId: string
  attemptNumber: number
  organizationSlug: string
  projectSlug: string
  userId: string
}

export const getInternRunAttemptByAnchorRunId = async ({
  internRunId,
  attemptNumber,
  organizationSlug,
  projectSlug,
  userId,
}: GetInternRunAttemptByAnchorRunIdParams) => {
  const anchorRun = await getInternRunById({
    internRunId,
    organizationSlug,
    projectSlug,
    userId,
  })

  const selectedRuns = await db
    .select({ id: internRunTable.id })
    .from(internRunTable)
    .where(
      and(
        eq(internRunTable.workRecordId, anchorRun.workRecordId),
        eq(internRunTable.attemptNumber, attemptNumber),
      ),
    )
    .limit(1)

  const selectedRun = selectedRuns[0]

  if (!selectedRun) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Intern run attempt not found.",
    })
  }

  return getInternRunById({
    internRunId: selectedRun.id,
    organizationSlug,
    projectSlug,
    userId,
  })
}
