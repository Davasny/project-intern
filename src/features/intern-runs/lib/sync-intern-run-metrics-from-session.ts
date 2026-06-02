import { eq } from "drizzle-orm"
import { internRunTable } from "@/features/intern-runs/db"
import { syncSessionMetricsToInternRun } from "@/features/intern-runs/lib/sync-session-metrics-to-intern-run"
import { withOpencodeForOrg } from "@/features/opencode/lib/get-opencode-client"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type SyncInternRunMetricsFromSessionParams = {
  internRunId: string
  organizationId: string
  projectId: string
}

export const syncInternRunMetricsFromSession = async ({
  internRunId,
  organizationId,
  projectId,
}: SyncInternRunMetricsFromSessionParams) => {
  const log = logger.child({ internRunId, organizationId, projectId })

  const rows = await db
    .select({
      directory: internRunTable.directory,
      sessionReference: internRunTable.sessionReference,
    })
    .from(internRunTable)
    .where(eq(internRunTable.id, internRunId))
    .limit(1)

  const run = rows[0]

  const sessionReference = run?.sessionReference ?? null

  if (!sessionReference) {
    log.debug("No session reference, skipping metrics sync")
    return
  }

  log.info("Syncing intern run metrics from session")

  await withOpencodeForOrg({
    fn: async ({ client }) => {
      await syncSessionMetricsToInternRun({
        client,
        directory: run.directory,
        fallbackLatencyMs: null,
        internRunId,
        log,
        sessionId: sessionReference,
        trigger: "post_transition",
      })
    },
    organizationId,
    projectId,
    runtimeTemperature: null,
  })
}
