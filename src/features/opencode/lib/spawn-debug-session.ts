import fs from "node:fs/promises"
import path from "node:path"
import { and, eq, sql } from "drizzle-orm"
import { agentRunTable } from "@/features/agent-runs/db"
import { abortAgentRun } from "@/features/agent-runs/lib/abort-agent-run"
import { agentRunMachine } from "@/features/agent-runs/lib/agent-run-machine"
import { markAgentRunBooting } from "@/features/agent-runs/lib/mark-agent-run-booting"
import { markAgentRunRunning } from "@/features/agent-runs/lib/mark-agent-run-running"
import { ensureProjectPythonEnv } from "@/features/execution/lib/ensure-project-python-env"
import { ensureProjectSkillsOnDisk } from "@/features/execution/lib/ensure-project-skills-on-disk"
import { ensureRecordWorkspace } from "@/features/execution/lib/ensure-record-workspace"
import { linkProjectSkillsToWorkspace } from "@/features/execution/lib/link-project-skills-to-workspace"
import { prepareRecordWorkspaceData } from "@/features/execution/lib/prepare-record-workspace-data"
import { listRecordFiles } from "@/features/files/lib/list-record-files"
import { withOpencodeForOrg } from "@/features/opencode/lib/get-opencode-client"
import { getActiveProjectSchemaVersionByProjectId } from "@/features/project-schema/lib/get-active-project-schema-version-by-project-id"
import { projectTable } from "@/features/projects/db"
import { listRecordRelationsByProjectId } from "@/features/record-edges/lib/list-record-relations-by-project-id"
import { recordTable } from "@/features/records/db"
import { taskRecordTable } from "@/features/task-records/db"
import { createTaskRecordMachineContext } from "@/features/task-records/lib/create-task-record-machine-context"
import { getTaskRecordActor } from "@/features/task-records/lib/get-task-record-actor"
import { taskRecordMachine } from "@/features/task-records/lib/task-record-machine"
import { taskTable } from "@/features/tasks/db"
import { backendConfig } from "@/lib/config/backend"
import { db } from "@/lib/db"
import { resolveEffectiveModel } from "@/lib/llm/resolve-effective-model"
import { logger } from "@/lib/logger"

type SpawnDebugSessionParams = {
  organizationId: string
  projectId: string
  taskId: string
  recordId: string
  title: string
}

type SpawnDebugSessionResult = {
  agentRunId: string
  baseUrl: string
  cliCommand: string
  directory: string
  port: number | null
  serverId: string | null
  sessionId: string
  taskRecordId: string
}

const buildAttachCommand = (
  serverUrl: string,
  sessionId: string,
  directory: string,
) => `opencode attach ${serverUrl} --session ${sessionId} --dir ${directory}`

const getOrCreateTaskRecord = async ({
  taskId,
  recordId,
}: {
  taskId: string
  recordId: string
}) => {
  const existing = await db
    .select({ id: taskRecordTable.id, state: taskRecordTable.state })
    .from(taskRecordTable)
    .where(
      and(
        eq(taskRecordTable.taskId, taskId),
        eq(taskRecordTable.recordId, recordId),
      ),
    )
    .then((rows) => rows[0] ?? null)

  if (existing) {
    return existing
  }

  const idResult = await db.execute<{ id: string }>(sql`select uuidv7() as id`)
  const id = idResult.rows[0]?.id

  if (!id) {
    throw new Error("Could not generate UUID for task record")
  }

  await taskRecordMachine.createActor(
    id,
    createTaskRecordMachineContext({ recordId, taskId }),
  )

  return { id, state: "waiting" as const }
}

const createAgentRun = async ({
  taskRecordId,
  model,
}: {
  taskRecordId: string
  model: string | null
}) => {
  const idResult = await db.execute<{ id: string }>(sql`select uuidv7() as id`)
  const id = idResult.rows[0]?.id

  if (!id) {
    throw new Error("Could not generate UUID for agent run")
  }

  const existingAttempts = await db
    .select({ maxAttempt: sql<number>`max(${agentRunTable.attemptNumber})` })
    .from(agentRunTable)
    .where(eq(agentRunTable.taskRecordId, taskRecordId))
    .then((rows) => rows[0]?.maxAttempt ?? 0)

  const attemptNumber = existingAttempts + 1

  await agentRunMachine.createActor(id, {
    attemptNumber,
    costUsd: null,
    directory: null,
    estimatedCostUsd: null,
    failurePayload: null,
    finishedAt: null,
    inputTokens: null,
    latencyMs: null,
    model: null,
    outputTokens: null,
    provider: null,
    resultPayload: null,
    selectedAgent: "record-worker",
    selectedModel: model,
    sessionReference: null,
    startedAt: null,
    taskRecordId,
    tokenInput: null,
    tokenOutput: null,
    toolActivitySummary: {},
    toolCallCount: 0,
    toolSummary: {},
  })

  return id
}

const transitionToRunning = async ({
  agentRunId,
  taskRecordId,
  directory,
  model,
}: {
  agentRunId: string
  taskRecordId: string
  directory: string
  model: string | null
}) => {
  const [providerID, modelID] = (
    model ?? "anthropic/claude-sonnet-4-5-20250514"
  ).split("/")

  await markAgentRunBooting({
    agentRunId,
    directory,
    model: modelID,
    provider: providerID,
    sessionReference: taskRecordId,
    toolActivitySummary: {},
  })

  const taskRecordActor = await getTaskRecordActor(taskRecordId)
  await taskRecordActor.send("claim", {
    lastTransitionAt: new Date(),
  })

  await taskRecordActor.send("start", {
    agentRunId,
    lastTransitionAt: new Date(),
  })

  await markAgentRunRunning({
    agentRunId,
    latencyMs: null,
    model: modelID,
    provider: providerID,
    sessionReference: taskRecordId,
    tokenInput: null,
    toolActivitySummary: {},
  })
}

export const spawnDebugSession = async ({
  organizationId,
  projectId,
  taskId,
  recordId,
  title,
}: SpawnDebugSessionParams): Promise<SpawnDebugSessionResult> => {
  let debugLogger = logger.child({
    organizationId,
    projectId,
    taskId,
    recordId,
  })

  debugLogger.info("Starting debug session spawn")

  const [task, record] = await Promise.all([
    db
      .select({
        id: taskTable.id,
        title: taskTable.title,
        model: taskTable.model,
        projectDefaultModel: projectTable.defaultModel,
      })
      .from(taskTable)
      .innerJoin(projectTable, eq(projectTable.id, taskTable.projectId))
      .where(eq(taskTable.id, taskId))
      .then((rows) => rows[0]),
    db
      .select({ id: recordTable.id, name: recordTable.name })
      .from(recordTable)
      .where(eq(recordTable.id, recordId))
      .then((rows) => rows[0]),
  ])

  if (!task) {
    throw new Error(`Task ${taskId} not found`)
  }

  if (!record) {
    throw new Error(`Record ${recordId} not found`)
  }

  const { id: taskRecordId } = await getOrCreateTaskRecord({
    taskId,
    recordId,
  })
  debugLogger = debugLogger.child({ taskRecordId })

  const resolvedModel = resolveEffectiveModel({
    projectDefaultModel: task.projectDefaultModel,
    taskModel: task.model,
  })

  debugLogger.info("Creating agent run for debug session")
  const agentRunId = await createAgentRun({
    taskRecordId,
    model: resolvedModel,
  })
  debugLogger = debugLogger.child({ agentRunId })

  debugLogger.info("Ensuring record workspace")
  const workspace = await ensureRecordWorkspace({ projectId, recordId })

  debugLogger.info("Ensuring project skills directory")
  const projectSkills = await ensureProjectSkillsOnDisk({
    organizationId,
    projectId,
  })

  debugLogger.info("Linking project skills to workspace")
  await linkProjectSkillsToWorkspace({
    opencodeSkillsDirectory: workspace.opencodeSkillsDirectory,
    projectSkillsDirectory: projectSkills.skillsDirectory,
  })

  debugLogger.info("Ensuring project Python environment")
  const pythonEnv = await ensureProjectPythonEnv({ projectId })
  debugLogger.info(
    { pythonPath: pythonEnv.pythonPath },
    "Python environment ready",
  )

  debugLogger.info("Preparing record workspace data")
  const preparedWorkspaceData = await prepareRecordWorkspaceData({
    organizationId,
    projectId,
    recordId,
  })
  debugLogger.info(
    { copiedEntryCount: preparedWorkspaceData.copiedEntryCount },
    "Record workspace data prepared",
  )

  debugLogger.info("Creating OpenCode session via withOpencodeForOrg")

  return await withOpencodeForOrg({
    fn: async ({ client, mcpToken }) => {
      const envAgentPath = path.join(workspace.workspaceDirectory, ".env.agent")
      await fs.writeFile(envAgentPath, `CRM_BEARER_TOKEN=${mcpToken}\n`)
      debugLogger.info({ envAgentPath }, "Wrote .env.agent")
      const sessionTitle = title || `${task.title} · ${record.name}`

      debugLogger.info(
        { workspaceDirectory: workspace.workspaceDirectory },
        "Creating OpenCode session",
      )

      const session = await client.session.create({
        body: { title: sessionTitle },
        query: { directory: workspace.workspaceDirectory },
      })

      if (!session.data) {
        throw new Error("OpenCode session could not be created.")
      }

      debugLogger.info(
        { sessionId: session.data.id },
        "OpenCode session created, transitioning to running",
      )

      await transitionToRunning({
        agentRunId,
        taskRecordId,
        directory: workspace.workspaceDirectory,
        model: resolvedModel,
      })

      debugLogger.info("Loading schema and relations for debug context")

      const [schema, relations, files] = await Promise.all([
        getActiveProjectSchemaVersionByProjectId({ projectId }),
        listRecordRelationsByProjectId({ projectId, recordId }),
        listRecordFiles({
          organizationId,
          projectId,
          recordId,
        }),
      ])

      const agentsMdPath = path.join(workspace.workspaceDirectory, "AGENTS.md")
      const agentsMd = `# Agent Debug Session

## Task
**${task.title}**

## Valid IDs for MCP Tool Calls
When calling MCP tools, use these IDs:
- agentRunId: \`${agentRunId}\`
- taskRecordId: \`${taskRecordId}\`
- projectId: \`${projectId}\`
- recordId: \`${recordId}\`
- taskId: \`${taskId}\`

## CRM REST API
For better efficiency (avoiding MCP tool call overhead), you can call the REST API directly from scripts. The bearer token is available in \`.env.agent\` as \`CRM_BEARER_TOKEN\`. CRM API base URL: \`${backendConfig.BETTER_AUTH_URL}/api/crm\`. Fetch the OpenAPI spec at \`GET {CRM API base URL}/schema.json\` to discover all endpoints. All REST endpoints mirror MCP tools with the same request/response shape.

## Execution Context
\`\`\`json
${JSON.stringify(
  {
    execution: {
      agentRunId,
      projectId,
      pythonPath: pythonEnv.pythonPath,
      recordId,
      taskId,
      taskRecordId,
      workspaceDataDirectory: preparedWorkspaceData.dataDirectory,
    },
    files,
    record,
    relations,
    schema,
    task,
  },
  null,
  2,
)}
\`\`\`

## Notes
- This is an interactive debug session
- When done, use "Stop Server" in the UI to clean up
`
      await fs.writeFile(agentsMdPath, agentsMd)
      debugLogger.info({ agentsMdPath }, "Wrote AGENTS.md")

      const serverUrl =
        backendConfig.CRM_OPENCODE_BASE_URL ??
        `http://${backendConfig.CRM_OPENCODE_HOST}:${String(backendConfig.CRM_OPENCODE_PORT)}`
      const cliCommand = buildAttachCommand(
        serverUrl,
        session.data.id,
        workspace.workspaceDirectory,
      )

      debugLogger.info(
        { sessionId: session.data.id, agentRunId, taskRecordId },
        "Debug session spawned successfully",
      )

      return {
        agentRunId,
        baseUrl: serverUrl,
        cliCommand,
        directory: workspace.workspaceDirectory,
        port: null,
        serverId: null,
        sessionId: session.data.id,
        taskRecordId,
      }
    },
    organizationId,
  })
}

type StopDebugSessionParams = {
  agentRunId: string
  taskRecordId: string
}

export const stopDebugSession = async ({
  agentRunId,
  taskRecordId,
}: StopDebugSessionParams) => {
  const debugLogger = logger.child({ agentRunId, taskRecordId })

  try {
    debugLogger.info("Stopping debug session, transitioning to aborted")

    await abortAgentRun({
      agentRunId,
      failurePayload: { stoppedByUser: true },
      taskRecordId,
      toolActivitySummary: {},
    })

    debugLogger.info("Debug session stopped and aborted")
  } catch (error) {
    debugLogger.error(
      {
        error,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      },
      "Failed to stop debug session",
    )
    throw error
  }
}
