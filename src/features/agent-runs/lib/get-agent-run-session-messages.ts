import type { OpencodeClient } from "@opencode-ai/sdk"
import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { agentRunTable } from "@/features/agent-runs/db"
import type { AgentRunSessionMessagesResult } from "@/features/agent-runs/lib/agent-run-session-message-types"
import { toSessionMessage } from "@/features/agent-runs/lib/map-session-message"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { taskRecordTable } from "@/features/task-records/db"
import { taskTable } from "@/features/tasks/db"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type GetAgentRunSessionMessagesParams = {
  agentRunId: string
  client: OpencodeClient
  organizationSlug: string
  projectSlug: string
  userId: string
}

export const getAgentRunSessionMessages = async ({
  agentRunId,
  client,
  organizationSlug,
  projectSlug,
  userId,
}: GetAgentRunSessionMessagesParams): Promise<AgentRunSessionMessagesResult> => {
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
      directory: agentRunTable.directory,
      sessionReference: agentRunTable.sessionReference,
    })
    .from(agentRunTable)
    .innerJoin(
      taskRecordTable,
      eq(agentRunTable.taskRecordId, taskRecordTable.id),
    )
    .innerJoin(taskTable, eq(taskRecordTable.taskId, taskTable.id))
    .where(
      and(
        eq(agentRunTable.id, agentRunId),
        eq(taskTable.projectId, project.id),
      ),
    )
    .limit(1)

  if (run.length === 0) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Agent run not found.",
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
        agentRunId,
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
