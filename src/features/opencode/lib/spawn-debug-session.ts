import fs from "node:fs/promises"
import path from "node:path"
import { and, eq, sql } from "drizzle-orm"
import { ensureProjectPythonEnv } from "@/features/execution/lib/ensure-project-python-env"
import { ensureProjectSkillsOnDisk } from "@/features/execution/lib/ensure-project-skills-on-disk"
import { ensureRecordWorkspace } from "@/features/execution/lib/ensure-record-workspace"
import { linkProjectSkillsToWorkspace } from "@/features/execution/lib/link-project-skills-to-workspace"
import { prepareRecordWorkspaceData } from "@/features/execution/lib/prepare-record-workspace-data"
import { listRecordFiles } from "@/features/files/lib/list-record-files"
import { internRunTable } from "@/features/intern-runs/db"
import { getPreviousTaskExecutionsForRecord } from "@/features/intern-runs/lib/get-previous-task-executions-for-record"
import {
  abortInternRunCommand,
  bootInternRunCommand,
  createInternRunCommand,
  runInternRunCommand,
} from "@/features/intern-runs/lib/intern-run-commands"
import { startInteractiveServer } from "@/features/opencode/lib/get-opencode-client"
import { getActiveProjectSchemaVersionByProjectId } from "@/features/project-schema/lib/get-active-project-schema-version-by-project-id"
import { projectTable } from "@/features/projects/db"
import { listRecordRelationsByProjectId } from "@/features/record-edges/lib/list-record-relations-by-project-id"
import { recordTable } from "@/features/records/db"
import { taskTable } from "@/features/tasks/db"
import { workRecordTable } from "@/features/work-records/db"
import { createWorkRecordMachineContext } from "@/features/work-records/lib/create-work-record-machine-context"
import { getWorkRecordActor } from "@/features/work-records/lib/get-work-record-actor"
import { workRecordMachine } from "@/features/work-records/lib/work-record-machine"
import { backendConfig } from "@/lib/config/backend"
import { db } from "@/lib/db"
import { resolveEffectiveModel } from "@/lib/llm/resolve-effective-model"
import { resolveEffectiveTemperature } from "@/lib/llm/resolve-effective-temperature"
import { logger } from "@/lib/logger"

type SpawnDebugSessionParams = {
  organizationId: string
  projectId: string
  taskId: string
  recordId: string
  title: string
}

type SpawnDebugSessionResult = {
  internRunId: string
  baseUrl: string
  cliCommand: string
  directory: string
  port: number | null
  serverId: string | null
  sessionId: string
  workRecordId: string
}

const buildAttachCommand = (
  serverUrl: string,
  sessionId: string,
  directory: string,
) => `opencode attach ${serverUrl} --session ${sessionId} --dir ${directory}`

const getOrCreateWorkRecord = async ({
  taskId,
  recordId,
}: {
  taskId: string
  recordId: string
}) => {
  const existing = await db
    .select({ id: workRecordTable.id, state: workRecordTable.state })
    .from(workRecordTable)
    .where(
      and(
        eq(workRecordTable.taskId, taskId),
        eq(workRecordTable.recordId, recordId),
      ),
    )
    .then((rows) => rows[0] ?? null)

  if (existing) {
    return existing
  }

  const idResult = await db.execute<{ id: string }>(sql`select uuidv7() as id`)
  const id = idResult.rows[0]?.id

  if (!id) {
    throw new Error("Could not generate UUID for work record")
  }

  await workRecordMachine.createActor(
    id,
    createWorkRecordMachineContext({ recordId, taskId }),
  )

  return { id, state: "waiting" as const }
}

const transitionToRunning = async ({
  internRunId,
  workRecordId,
  directory,
  model,
}: {
  internRunId: string
  workRecordId: string
  directory: string
  model: string | null
}) => {
  const [providerID, modelID] = (
    model ?? "anthropic/claude-sonnet-4-5-20250514"
  ).split("/")

  await bootInternRunCommand({
    internRunId,
    directory,
    model: modelID,
    provider: providerID,
    sessionReference: workRecordId,
    toolActivitySummary: {},
  })

  const workRecordActor = await getWorkRecordActor(workRecordId)
  await workRecordActor.send("claim", {
    internRunId,
    lastTransitionAt: new Date(),
  })

  await workRecordActor.send("start", {
    internRunId,
    lastTransitionAt: new Date(),
  })

  await runInternRunCommand({
    internRunId,
    latencyMs: null,
    model: modelID,
    provider: providerID,
    sessionReference: workRecordId,
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
        temperature: taskTable.temperature,
        projectDefaultModel: projectTable.defaultModel,
        projectDefaultTemperature: projectTable.defaultTemperature,
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

  const { id: workRecordId } = await getOrCreateWorkRecord({
    taskId,
    recordId,
  })
  debugLogger = debugLogger.child({ workRecordId })

  const resolvedModel = resolveEffectiveModel({
    projectDefaultModel: task.projectDefaultModel,
    taskModel: task.model,
  })
  const resolvedTemperature = resolveEffectiveTemperature({
    projectDefaultTemperature: task.projectDefaultTemperature,
    taskTemperature: task.temperature,
  })

  const existingAttempts = await db
    .select({ maxAttempt: sql<number>`max(${internRunTable.attemptNumber})` })
    .from(internRunTable)
    .where(eq(internRunTable.workRecordId, workRecordId))
    .then((rows) => rows[0]?.maxAttempt ?? 0)

  debugLogger.info("Creating intern run for debug session")
  const internRunResult = await createInternRunCommand({
    attemptNumber: existingAttempts + 1,
    model: resolvedModel,
    projectDefaultModel: task.projectDefaultModel,
    projectDefaultTemperature: task.projectDefaultTemperature,
    workRecordId,
    temperature: resolvedTemperature,
  })

  if (!internRunResult) {
    throw new Error("Could not create intern run")
  }

  const internRunId = internRunResult.internRunId
  debugLogger = debugLogger.child({ internRunId })

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
    {
      installCount: pythonEnv.installCount,
      isNew: pythonEnv.isNew,
      pythonPath: pythonEnv.pythonPath,
      requirementsPath: pythonEnv.requirementsPath,
      skippedInstall: pythonEnv.skippedInstall,
      venvPath: pythonEnv.venvPath,
    },
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

  debugLogger.info("Starting OpenCode server via startInteractiveServer")

  const started = await startInteractiveServer({
    organizationId,
    projectId,
    runtimeTemperature: resolvedTemperature,
  })

  const envInternPath = path.join(workspace.workspaceDirectory, ".env.intern")
  await fs.writeFile(envInternPath, `CRM_BEARER_TOKEN=${started.apiKey}\n`)
  debugLogger.info({ envInternPath }, "Wrote .env.intern")

  const sessionTitle = title || `${task.title} · ${record.name}`

  debugLogger.info(
    { workspaceDirectory: workspace.workspaceDirectory },
    "Creating OpenCode session",
  )

  const session = await started.client.session.create({
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
    internRunId,
    workRecordId,
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

  let previousExecutions: Awaited<
    ReturnType<typeof getPreviousTaskExecutionsForRecord>
  > = []

  try {
    previousExecutions = await getPreviousTaskExecutionsForRecord({
      recordId,
      excludeInternRunId: internRunId,
    })

    debugLogger.info(
      { previousExecutionCount: previousExecutions.length },
      "Fetched previous task executions for record",
    )
  } catch (error) {
    debugLogger.warn(
      {
        error,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      },
      "Failed to fetch previous task executions, proceeding without history",
    )
  }

  const previousExecutionsSection =
    previousExecutions.length === 0
      ? "No previous task executions found for this record."
      : previousExecutions
          .map(
            (exec) =>
              `- **${exec.taskTitle}** (${exec.state}, attempt #${exec.attemptNumber}): ${exec.resultSummary ?? "(no summary)"}`,
          )
          .join("\n")

  const agentsMdPath = path.join(workspace.workspaceDirectory, "AGENTS.md")
  const agentsMd = `# Agent Debug Session

## Task
**${task.title}**

## Valid IDs for MCP Tool Calls
When calling MCP tools, use these IDs:
- internRunId: \`${internRunId}\`
- workRecordId: \`${workRecordId}\`
- projectId: \`${projectId}\`
- recordId: \`${recordId}\`
- taskId: \`${taskId}\`

## CRM REST API
For better efficiency (avoiding MCP tool call overhead), you can call the REST API directly from scripts. The bearer token is available in \`.env.intern\` as \`CRM_BEARER_TOKEN\`. CRM API base URL: \`${backendConfig.BETTER_AUTH_URL}/api/crm\`. Fetch the OpenAPI spec at \`GET {CRM API base URL}/schema.json\` to discover all endpoints. All REST endpoints mirror MCP tools with the same request/response shape.

## Previous Task Executions
${previousExecutionsSection}

## Execution Context
\`\`\`json
${JSON.stringify(
  {
    execution: {
      internRunId,
      projectId,
      pythonPath: pythonEnv.pythonPath,
      recordId,
      taskId,
      workRecordId,
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

  const serverUrl = started.baseUrl
  const cliCommand = buildAttachCommand(
    serverUrl,
    session.data.id,
    workspace.workspaceDirectory,
  )

  debugLogger.info(
    { sessionId: session.data.id, internRunId, workRecordId },
    "Debug session spawned successfully",
  )

  return {
    internRunId,
    baseUrl: serverUrl,
    cliCommand,
    directory: workspace.workspaceDirectory,
    port: started.port,
    serverId: started.serverId ?? null,
    sessionId: session.data.id,
    workRecordId,
  }
}

type StopDebugSessionParams = {
  internRunId: string
  workRecordId: string
}

export const stopDebugSession = async ({
  internRunId,
  workRecordId,
}: StopDebugSessionParams) => {
  const debugLogger = logger.child({ internRunId, workRecordId })

  try {
    debugLogger.info("Stopping debug session, transitioning to aborted")

    await abortInternRunCommand({
      internRunId,
      failurePayload: { stoppedByUser: true },
      workRecordId,
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
