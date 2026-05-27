import type { OpencodeClient } from "@opencode-ai/sdk"
import type { Logger } from "pino"
import {
  bootAgentRunCommand,
  runAgentRunCommand,
} from "@/features/agent-runs/lib/agent-run-commands"
import { pollSessionForMetrics } from "@/features/opencode/lib/poll-session-for-metrics"
import { startTaskRecord } from "@/features/task-records/lib/start-task-record"
import { recordWorkerAgent } from "@/lib/llm/agents"
import { buildTaskRecordAgentPrompt } from "@/lib/llm/build-task-record-agent-prompt"
import { buildTaskRecordSystemPrompt } from "@/lib/llm/build-task-record-system-prompt"

type RunOpencodeExecutionParams = {
  client: OpencodeClient
  executionLogger: Logger
  files: Array<{ name: string; path: string }>
  initialScope: {
    agentRun: { id: string }
    project: { id: string; displayName: string; organizationId: string }
    record: { id: string; name: string; context: object }
    task: { id: string; title: string; descriptionMarkdown: string }
    taskRecord: { id: string }
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
    "Marking agent run booting",
  )

  await bootAgentRunCommand({
    agentRunId: initialScope.agentRun.id,
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
    "Marked agent run booting",
  )

  const promptText = buildTaskRecordAgentPrompt({
    taskTitle: initialScope.task.title,
    taskDescription: initialScope.task.descriptionMarkdown,
    recordContext: initialScope.record,
  })

  const systemPrompt = buildTaskRecordSystemPrompt({
    executionScope: {
      agentRunId: initialScope.agentRun.id,
      projectId: initialScope.project.id,
      recordId: initialScope.record.id,
      taskId: initialScope.task.id,
      taskRecordId: initialScope.taskRecord.id,
      pythonPath: pythonEnv.pythonPath,
      workspaceDataDirectory: workspace.workspaceDirectory,
    },
    projectDisplayName: initialScope.project.displayName,
    recordName: initialScope.record.name,
    taskTitle: initialScope.task.title,
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
    "Starting task record execution",
  )

  await startTaskRecord({
    agentRunId: initialScope.agentRun.id,
    taskRecordId: initialScope.taskRecord.id,
  })

  executionLogger.info(
    { sessionId: session.data.id },
    "Started task record execution",
  )

  executionLogger.info(
    { sessionId: session.data.id },
    "Marking agent run running",
  )

  await runAgentRunCommand({
    agentRunId: initialScope.agentRun.id,
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
    "Marked agent run running",
  )

  executionLogger.info(
    { sessionId: session.data.id },
    "Submitting OpenCode prompt asynchronously",
  )

  await client.session.promptAsync({
    body: {
      agent: recordWorkerAgent.name,
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
    agentRunId: initialScope.agentRun.id,
    client,
    taskRecordId: initialScope.taskRecord.id,
  })

  return {
    agentRunId: initialScope.agentRun.id,
    files,
    model: runtimeModel,
    projectId: initialScope.project.id,
    recordId: initialScope.record.id,
    relations,
    schema,
    sessionId: session.data.id,
    taskId: initialScope.task.id,
    taskRecordId: initialScope.taskRecord.id,
    temperature: runtimeTemperature,
    workspace,
  }
}
