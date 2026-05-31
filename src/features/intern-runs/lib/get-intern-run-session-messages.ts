import type { OpencodeClient } from "@opencode-ai/sdk"
import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { internRunTable } from "@/features/intern-runs/db"
import type { InternRunSessionMessagesResult } from "@/features/intern-runs/lib/intern-run-session-message-types"
import { toSessionMessage } from "@/features/intern-runs/lib/map-session-message"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { taskTable } from "@/features/tasks/db"
import { workRecordTable } from "@/features/work-records/db"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type GetInternRunSessionMessagesParams = {
  internRunId: string
  client: OpencodeClient
  organizationSlug: string
  projectSlug: string
  userId: string
}

export const getInternRunSessionMessages = async ({
  internRunId,
  client,
  organizationSlug,
  projectSlug,
  userId,
}: GetInternRunSessionMessagesParams): Promise<InternRunSessionMessagesResult> => {
  const project = await ensureProjectAccess({
    organizationSlug,
    projectSlug,
    userId,
  })

  if (!project) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this project.",
    })
  }

  const run = await db
    .select({
      directory: internRunTable.directory,
      sessionReference: internRunTable.sessionReference,
    })
    .from(internRunTable)
    .innerJoin(
      workRecordTable,
      eq(internRunTable.workRecordId, workRecordTable.id),
    )
    .innerJoin(taskTable, eq(workRecordTable.taskId, taskTable.id))
    .where(
      and(
        eq(internRunTable.id, internRunId),
        eq(taskTable.projectId, project.id),
      ),
    )
    .limit(1)

  if (run.length === 0) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Intern run not found.",
    })
  }

  const currentRun = run[0]

  if (!currentRun.sessionReference || !currentRun.directory) {
    return {
      directory: currentRun.directory,
      messages: [],
      sessionReference: currentRun.sessionReference,
    }
  }

  try {
    const response = await client.session.messages({
      path: {
        id: currentRun.sessionReference,
      },
      query: {
        directory: currentRun.directory,
      },
    })

    return {
      directory: currentRun.directory,
      messages: (response.data ?? []).map(toSessionMessage),
      sessionReference: currentRun.sessionReference,
    }
  } catch (error) {
    logger.error(
      {
        internRunId,
        directory: currentRun.directory,
        message: error instanceof Error ? error.message : "Unknown error",
        sessionReference: currentRun.sessionReference,
      },
      "Failed to load OpenCode session messages",
    )

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "OpenCode session history could not be loaded.",
    })
  }
}
