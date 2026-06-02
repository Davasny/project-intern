import type { OpencodeClient } from "@opencode-ai/sdk"
import type { Logger } from "pino"
import { getPreviousTaskExecutionsForRecord } from "@/features/intern-runs/lib/get-previous-task-executions-for-record"
import {
  bootInternRunCommand,
  runInternRunCommand,
} from "@/features/intern-runs/lib/intern-run-commands"
import { pollSessionForMetrics } from "@/features/opencode/lib/poll-session-for-metrics"
import { startWorkRecord } from "@/features/work-records/lib/start-work-record"
import { internAgent } from "@/lib/llm/agents"
import { buildWorkRecordAgentPrompt } from "@/lib/llm/build-work-record-agent-prompt"
import { buildWorkRecordSystemPrompt } from "@/lib/llm/build-work-record-system-prompt"

type RunOpencodeExecutionParams = {
  client: OpencodeClient
  executionLogger: Logger
  files: Array<{ name: string; path: string }>
  initialScope: {
    internRun: { id: string }
    project: {
      id: string
      descriptionMarkdown: string
      displayName: string
      organizationId: string
    }
    record: { id: string; name: string; context: object }
    task: { id: string; title: string; descriptionMarkdown: string }
    workRecord: { id: string }
  }
  projectSkills: { skillsDirectory: string }
  preparedWorkspaceData: { copiedEntryCount: number }
  pythonEnv: { pythonPath: string }
  relations: { summary: { activeCount: number } }
  runtimeModel: string
  runtimeTemperature: number | null
  schema: { version: number }
  workspace: { workspaceDirectory: string; opencodeSkillsDirectory: string }
}

export const runOpencodeExecution = async ({
  client,
  executionLogger,
  files,
  initialScope,
  projectSkills,
  preparedWorkspaceData,
  pythonEnv,
  relations,
  runtimeModel,
  runtimeTemperature,
  schema,
  workspace,
}: RunOpencodeExecutionParams) => {
  executionLogger.info("Created OpenCode client")

  executionLogger.info(
    { workspaceDirectory: workspace.workspaceDirectory },
    "Creating OpenCode session",
  )

  const session = await client.session.create({
    body: {
      title: `${initialScope.task.title} · ${initialScope.record.name}`,
    },
    query: {
      directory: workspace.workspaceDirectory,
    },
  })

  executionLogger.info(
    {
      hasSessionData: session.data !== undefined,
      sessionId: session.data?.id,
    },
    "Received OpenCode session create response",
  )

  if (!session.data) {
    throw new Error("OpenCode session could not be created.")
  }

  executionLogger.info(
    {
      opencodeSkillsDirectory: workspace.opencodeSkillsDirectory,
      projectSkillsDirectory: projectSkills.skillsDirectory,
    },
    "OpenCode skills directories ready — place skill folders at opencodeSkillsDirectory for auto-discovery",
  )

  const [providerID, modelID] = runtimeModel.split("/")

  executionLogger.info(
    {
      modelID,
      providerID,
      sessionId: session.data.id,
    },
    "Marking intern run booting",
  )

  await bootInternRunCommand({
    internRunId: initialScope.internRun.id,
    directory: workspace.workspaceDirectory,
    model: modelID,
    provider: providerID,
    sessionReference: session.data.id,
    toolActivitySummary: {
      filesAvailable: files.length,
      preloadedDataEntries: preparedWorkspaceData.copiedEntryCount,
      relationCount: relations.summary.activeCount,
      temperature: runtimeTemperature,
    },
  })

  executionLogger.info(
    { sessionId: session.data.id },
    "Marked intern run booting",
  )

  let previousExecutions: Awaited<
    ReturnType<typeof getPreviousTaskExecutionsForRecord>
  > = []

  try {
    previousExecutions = await getPreviousTaskExecutionsForRecord({
      recordId: initialScope.record.id,
      excludeInternRunId: initialScope.internRun.id,
    })

    executionLogger.info(
      { previousExecutionCount: previousExecutions.length },
      "Fetched previous task executions for record",
    )
  } catch (error) {
    executionLogger.warn(
      {
        error,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      },
      "Failed to fetch previous task executions, proceeding without history",
    )
  }

  const promptText = buildWorkRecordAgentPrompt({
    taskTitle: initialScope.task.title,
    taskDescription: initialScope.task.descriptionMarkdown,
    recordContext: initialScope.record,
  })

  const systemPrompt = buildWorkRecordSystemPrompt({
    executionScope: {
      internRunId: initialScope.internRun.id,
      projectId: initialScope.project.id,
      recordId: initialScope.record.id,
      taskId: initialScope.task.id,
      workRecordId: initialScope.workRecord.id,
      pythonPath: pythonEnv.pythonPath,
      workspaceDataDirectory: workspace.workspaceDirectory,
    },
    projectDisplayName: initialScope.project.displayName,
    projectDescriptionMarkdown: initialScope.project.descriptionMarkdown,
    recordName: initialScope.record.name,
    taskTitle: initialScope.task.title,
    previousExecutions,
  })

  executionLogger.info(
    {
      promptBytes: Buffer.byteLength(promptText, "utf8"),
      sessionId: session.data.id,
      systemPromptBytes: Buffer.byteLength(systemPrompt, "utf8"),
    },
    "Preparing OpenCode prompt execution",
  )

  executionLogger.info(
    { sessionId: session.data.id },
    "Starting work record execution",
  )

  await startWorkRecord({
    internRunId: initialScope.internRun.id,
    workRecordId: initialScope.workRecord.id,
  })

  executionLogger.info(
    { sessionId: session.data.id },
    "Started work record execution",
  )

  executionLogger.info(
    { sessionId: session.data.id },
    "Marking intern run running",
  )

  await runInternRunCommand({
    internRunId: initialScope.internRun.id,
    model: modelID,
    latencyMs: null,
    provider: providerID,
    sessionReference: session.data.id,
    tokenInput: null,
    toolActivitySummary: {
      filesAvailable: files.length,
      model: runtimeModel,
      relationCount: relations.summary.activeCount,
      sessionId: session.data.id,
      temperature: runtimeTemperature,
    },
  })

  executionLogger.info(
    { sessionId: session.data.id },
    "Marked intern run running",
  )

  executionLogger.info(
    { sessionId: session.data.id },
    "Submitting OpenCode prompt asynchronously",
  )

  await client.session.promptAsync({
    body: {
      agent: internAgent.name,
      model: {
        modelID,
        providerID,
      },
      parts: [
        {
          text: promptText,
          type: "text",
        },
      ],
      system: systemPrompt,
    },
    path: {
      id: session.data.id,
    },
    query: {
      directory: workspace.workspaceDirectory,
    },
  })

  executionLogger.info(
    {
      model: runtimeModel,
      sessionId: session.data.id,
      temperature: runtimeTemperature,
    },
    "Submitted OpenCode prompt asynchronously",
  )

  await pollSessionForMetrics({
    sessionId: session.data.id,
    internRunId: initialScope.internRun.id,
    client,
    directory: workspace.workspaceDirectory,
    workRecordId: initialScope.workRecord.id,
  })

  return {
    internRunId: initialScope.internRun.id,
    files,
    model: runtimeModel,
    projectId: initialScope.project.id,
    recordId: initialScope.record.id,
    relations,
    schema,
    sessionId: session.data.id,
    taskId: initialScope.task.id,
    workRecordId: initialScope.workRecord.id,
    temperature: runtimeTemperature,
    workspace,
  }
}
