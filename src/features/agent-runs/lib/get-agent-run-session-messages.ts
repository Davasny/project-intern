import type { Message, OpencodeClient, Part } from "@opencode-ai/sdk"
import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { agentRunTable } from "@/features/agent-runs/db"
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

type AgentRunSessionTokens = {
  input: number
  output: number
  reasoning: number
  cacheRead: number
  cacheWrite: number
}

type AgentRunSessionMessageError = {
  name: string
  message: string
}

type AgentRunSessionMessagePartBase = {
  id: string
}

export type AgentRunSessionMessagePart =
  | (AgentRunSessionMessagePartBase & {
      ignored: boolean
      synthetic: boolean
      text: string
      type: "text"
    })
  | (AgentRunSessionMessagePartBase & {
      text: string
      type: "reasoning"
    })
  | (AgentRunSessionMessagePartBase & {
      attachments: Array<{
        filename: string | null
        mime: string
        url: string
      }>
      callId: string
      error: string | null
      input: Record<string, unknown>
      metadata: Record<string, unknown> | null
      output: string | null
      status: "completed" | "error" | "pending" | "running"
      title: string | null
      tool: string
      type: "tool"
    })
  | (AgentRunSessionMessagePartBase & {
      filename: string | null
      mime: string
      url: string
      type: "file"
    })
  | (AgentRunSessionMessagePartBase & {
      snapshot: string | null
      type: "step-start"
    })
  | (AgentRunSessionMessagePartBase & {
      cost: number
      reason: string
      snapshot: string | null
      tokens: AgentRunSessionTokens
      type: "step-finish"
    })
  | (AgentRunSessionMessagePartBase & {
      snapshot: string
      type: "snapshot"
    })
  | (AgentRunSessionMessagePartBase & {
      files: Array<string>
      hash: string
      type: "patch"
    })
  | (AgentRunSessionMessagePartBase & {
      name: string
      type: "agent"
    })
  | (AgentRunSessionMessagePartBase & {
      attempt: number
      createdAt: number
      error: AgentRunSessionMessageError
      type: "retry"
    })
  | (AgentRunSessionMessagePartBase & {
      auto: boolean
      type: "compaction"
    })
  | (AgentRunSessionMessagePartBase & {
      agent: string
      description: string
      prompt: string
      type: "subtask"
    })

export type AgentRunSessionMessage = {
  agent: string | null
  completedAt: number | null
  cost: number | null
  createdAt: number
  error: AgentRunSessionMessageError | null
  id: string
  modelId: string | null
  parts: Array<AgentRunSessionMessagePart>
  path: {
    cwd: string | null
    root: string | null
  } | null
  providerId: string | null
  role: "assistant" | "user"
  tokens: AgentRunSessionTokens | null
}

export type AgentRunSessionMessagesResult = {
  directory: string | null
  messages: Array<AgentRunSessionMessage>
  sessionReference: string | null
}

const toTokens = ({
  cache,
  input,
  output,
  reasoning,
}: {
  cache: { read: number; write: number }
  input: number
  output: number
  reasoning: number
}): AgentRunSessionTokens => ({
  cacheRead: cache.read,
  cacheWrite: cache.write,
  input,
  output,
  reasoning,
})

const toMessageError = (message: Extract<Message, { role: "assistant" }>) => {
  if (!message.error) {
    return null
  }

  if (message.error.name === "ProviderAuthError") {
    return {
      message: message.error.data.message,
      name: message.error.name,
    }
  }

  if (message.error.name === "UnknownError") {
    return {
      message: message.error.data.message,
      name: message.error.name,
    }
  }

  if (message.error.name === "MessageAbortedError") {
    return {
      message: message.error.data.message,
      name: message.error.name,
    }
  }

  if (message.error.name === "APIError") {
    return {
      message: message.error.data.message,
      name: message.error.name,
    }
  }

  return {
    message: "Message output exceeded the provider limit.",
    name: message.error.name,
  }
}

const toPart = (part: Part): AgentRunSessionMessagePart => {
  switch (part.type) {
    case "text":
      return {
        id: part.id,
        ignored: part.ignored ?? false,
        synthetic: part.synthetic ?? false,
        text: part.text,
        type: "text",
      }
    case "reasoning":
      return {
        id: part.id,
        text: part.text,
        type: "reasoning",
      }
    case "tool": {
      if (part.state.status === "pending") {
        return {
          attachments: [],
          callId: part.callID,
          error: null,
          id: part.id,
          input: part.state.input,
          metadata: null,
          output: null,
          status: part.state.status,
          title: null,
          tool: part.tool,
          type: "tool",
        }
      }

      if (part.state.status === "running") {
        return {
          attachments: [],
          callId: part.callID,
          error: null,
          id: part.id,
          input: part.state.input,
          metadata: part.state.metadata ?? null,
          output: null,
          status: part.state.status,
          title: part.state.title ?? null,
          tool: part.tool,
          type: "tool",
        }
      }

      if (part.state.status === "completed") {
        return {
          attachments:
            part.state.attachments?.map((attachment) => ({
              filename: attachment.filename ?? null,
              mime: attachment.mime,
              url: attachment.url,
            })) ?? [],
          callId: part.callID,
          error: null,
          id: part.id,
          input: part.state.input,
          metadata: part.state.metadata,
          output: part.state.output,
          status: part.state.status,
          title: part.state.title,
          tool: part.tool,
          type: "tool",
        }
      }

      return {
        attachments: [],
        callId: part.callID,
        error: part.state.error,
        id: part.id,
        input: part.state.input,
        metadata: part.state.metadata ?? null,
        output: null,
        status: part.state.status,
        title: null,
        tool: part.tool,
        type: "tool",
      }
    }
    case "file":
      return {
        filename: part.filename ?? null,
        id: part.id,
        mime: part.mime,
        type: "file",
        url: part.url,
      }
    case "step-start":
      return {
        id: part.id,
        snapshot: part.snapshot ?? null,
        type: "step-start",
      }
    case "step-finish":
      return {
        cost: part.cost,
        id: part.id,
        reason: part.reason,
        snapshot: part.snapshot ?? null,
        tokens: toTokens(part.tokens),
        type: "step-finish",
      }
    case "snapshot":
      return {
        id: part.id,
        snapshot: part.snapshot,
        type: "snapshot",
      }
    case "patch":
      return {
        files: part.files,
        hash: part.hash,
        id: part.id,
        type: "patch",
      }
    case "agent":
      return {
        id: part.id,
        name: part.name,
        type: "agent",
      }
    case "retry":
      return {
        attempt: part.attempt,
        createdAt: part.time.created,
        error: {
          message: part.error.data.message,
          name: part.error.name,
        },
        id: part.id,
        type: "retry",
      }
    case "compaction":
      return {
        auto: part.auto,
        id: part.id,
        type: "compaction",
      }
    case "subtask":
      return {
        agent: part.agent,
        description: part.description,
        id: part.id,
        prompt: part.prompt,
        type: "subtask",
      }
  }
}

const toSessionMessage = ({
  info,
  parts,
}: {
  info: Message
  parts: Array<Part>
}) => {
  if (info.role === "user") {
    return {
      agent: info.agent,
      completedAt: null,
      cost: null,
      createdAt: info.time.created,
      error: null,
      id: info.id,
      modelId: info.model.modelID,
      parts: parts.map(toPart),
      path: null,
      providerId: info.model.providerID,
      role: info.role,
      tokens: null,
    } satisfies AgentRunSessionMessage
  }

  return {
    agent: null,
    completedAt: info.time.completed ?? null,
    cost: info.cost,
    createdAt: info.time.created,
    error: toMessageError(info),
    id: info.id,
    modelId: info.modelID,
    parts: parts.map(toPart),
    path: {
      cwd: info.path.cwd,
      root: info.path.root,
    },
    providerId: info.providerID,
    role: info.role,
    tokens: toTokens(info.tokens),
  } satisfies AgentRunSessionMessage
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
