import { markAgentRunBooting } from "@/features/agent-runs/lib/mark-agent-run-booting"
import { markAgentRunRunning } from "@/features/agent-runs/lib/mark-agent-run-running"
import { ensureProjectPythonEnv } from "@/features/execution/lib/ensure-project-python-env"
import { ensureProjectSkillsOnDisk } from "@/features/execution/lib/ensure-project-skills-on-disk"
import { ensureRecordWorkspace } from "@/features/execution/lib/ensure-record-workspace"
import { getAgentRunExecutionScope } from "@/features/execution/lib/get-agent-run-execution-scope"
import { linkProjectSkillsToWorkspace } from "@/features/execution/lib/link-project-skills-to-workspace"
import { pollSessionForMetrics } from "@/features/opencode/lib/poll-session-for-metrics"
import { prepareRecordWorkspaceData } from "@/features/execution/lib/prepare-record-workspace-data"
import { listRecordFiles } from "@/features/files/lib/list-record-files"
import { withOpencodeForOrg } from "@/features/opencode/lib/get-opencode-client"
import { getActiveProjectSchemaVersionByProjectId } from "@/features/project-schema/lib/get-active-project-schema-version-by-project-id"
import { listRecordRelationsByProjectId } from "@/features/record-edges/lib/list-record-relations-by-project-id"
import { startTaskRecord } from "@/features/task-records/lib/start-task-record"
import { recordWorkerAgent } from "@/lib/llm/agents"
import { buildTaskRecordSystemPrompt } from "@/lib/llm/build-task-record-system-prompt"
import { resolveRuntimeModel } from "@/lib/llm/resolve-runtime-model"
import { logger } from "@/lib/logger"

type ExecutorServiceParams = {
  agentRunId: string
  taskRecordId: string
}

export const executorService = async ({
  agentRunId,
  taskRecordId,
}: ExecutorServiceParams) => {
  let executionLogger = logger.child({
    agentRunId,
    taskRecordId,
  })

  try {
    executionLogger.info("Loading agent run execution scope")

    const initialScope = await getAgentRunExecutionScope({
      agentRunId,
    })

    executionLogger = executionLogger.child({
      projectId: initialScope.project.id,
      recordId: initialScope.record.id,
      taskId: initialScope.task.id,
    })

    executionLogger.info(
      {
        recordName: initialScope.record.name,
        taskTitle: initialScope.task.title,
      },
      "Loaded agent run execution scope",
    )

    const runtimeModel = resolveRuntimeModel({
      projectDefaultModel: initialScope.project.defaultModel,
      taskModel: initialScope.task.model,
    })

    executionLogger.info({ runtimeModel }, "Resolved runtime model")

    executionLogger.info("Ensuring record workspace")

    const workspace = await ensureRecordWorkspace({
      projectId: initialScope.project.id,
      recordId: initialScope.record.id,
    })

    executionLogger.info(
      { workspaceDirectory: workspace.workspaceDirectory },
      "Ensured record workspace",
    )

    executionLogger.info("Ensuring project skills directory")

    const projectSkills = await ensureProjectSkillsOnDisk({
      organizationId: initialScope.project.organizationId,
      projectId: initialScope.project.id,
    })

    executionLogger.info(
      { skillsDirectory: projectSkills.skillsDirectory },
      "Ensured project skills directory",
    )

    executionLogger.info("Linking project skills to workspace")

    await linkProjectSkillsToWorkspace({
      opencodeSkillsDirectory: workspace.opencodeSkillsDirectory,
      projectSkillsDirectory: projectSkills.skillsDirectory,
    })

    executionLogger.info("Linked project skills to workspace")

    executionLogger.info("Ensuring project Python environment")

    const pythonEnv = await ensureProjectPythonEnv({
      projectId: initialScope.project.id,
    })

    executionLogger.info(
      {
        installCount: pythonEnv.installCount,
        isNew: pythonEnv.isNew,
        pythonPath: pythonEnv.pythonPath,
        venvPath: pythonEnv.venvPath,
      },
      "Project Python environment ready",
    )

    executionLogger.info("Preparing record workspace data")

    const preparedWorkspaceData = await prepareRecordWorkspaceData({
      organizationId: initialScope.project.organizationId,
      projectId: initialScope.project.id,
      recordId: initialScope.record.id,
    })

    executionLogger.info(
      {
        copiedEntryCount: preparedWorkspaceData.copiedEntryCount,
        dataDirectory: preparedWorkspaceData.dataDirectory,
        storageDirectory: preparedWorkspaceData.storageDirectory,
      },
      "Prepared record workspace data",
    )

    executionLogger.info("Loading active project schema version")

    const schema = await getActiveProjectSchemaVersionByProjectId({
      projectId: initialScope.project.id,
    })

    executionLogger.info(
      { schemaVersion: schema.version },
      "Loaded active project schema version",
    )

    executionLogger.info("Loading record relations and files")

    const [relations, files] = await Promise.all([
      listRecordRelationsByProjectId({
        projectId: initialScope.project.id,
        recordId: initialScope.record.id,
      }),
      listRecordFiles({
        organizationId: initialScope.project.organizationId,
        projectId: initialScope.project.id,
        recordId: initialScope.record.id,
      }),
    ])

    executionLogger.info(
      {
        fileCount: files.length,
        relationCount: relations.summary.activeCount,
      },
      "Loaded record relations and files",
    )

    return await withOpencodeForOrg({
      fn: async ({ client }) => {
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

        await markAgentRunBooting({
          agentRunId: initialScope.agentRun.id,
          directory: workspace.workspaceDirectory,
          model: modelID,
          provider: providerID,
          sessionReference: session.data.id,
          toolActivitySummary: {
            filesAvailable: files.length,
            preloadedDataEntries: preparedWorkspaceData.copiedEntryCount,
            relationCount: relations.summary.activeCount,
          },
        })

        executionLogger.info(
          { sessionId: session.data.id },
          "Marked agent run booting",
        )

        const promptPayload = {
          execution: {
            agentRunId: initialScope.agentRun.id,
            projectId: initialScope.project.id,
            pythonPath: pythonEnv.pythonPath,
            recordId: initialScope.record.id,
            taskId: initialScope.task.id,
            taskRecordId: initialScope.taskRecord.id,
            workspaceDataDirectory: workspace.dataDirectory,
          },
          files,
          record: initialScope.record,
          relations,
          schema,
          task: initialScope.task,
        }

        const promptText = JSON.stringify(promptPayload, null, 2)
        const systemPrompt = buildTaskRecordSystemPrompt({
          executionScope: {
            agentRunId: initialScope.agentRun.id,
            projectId: initialScope.project.id,
            recordId: initialScope.record.id,
            taskId: initialScope.task.id,
            taskRecordId: initialScope.taskRecord.id,
          },
          projectDisplayName: initialScope.project.displayName,
          recordName: initialScope.record.name,
          taskDescriptionMarkdown: initialScope.task.descriptionMarkdown,
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

        await markAgentRunRunning({
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
          },
          "Submitted OpenCode prompt asynchronously",
        )

        await pollSessionForMetrics({
          sessionId: session.data.id,
          agentRunId: initialScope.agentRun.id,
          client,
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
          workspace,
        }
      },
      organizationId: initialScope.project.organizationId,
    })
  } catch (error) {
    executionLogger.error(
      {
        error,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      },
      "Executor service failed",
    )

    throw error
  }
}
