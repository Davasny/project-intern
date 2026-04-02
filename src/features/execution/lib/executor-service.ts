import { markAgentRunBooting } from "@/features/agent-runs/lib/mark-agent-run-booting"
import { markAgentRunRunning } from "@/features/agent-runs/lib/mark-agent-run-running"
import { listArtifacts } from "@/features/artifacts/lib/list-artifacts"
import { buildTaskRecordSystemPrompt } from "@/features/execution/lib/build-task-record-system-prompt"
import { ensurePipelineAssetsInWorkspace } from "@/features/execution/lib/ensure-pipeline-assets-in-workspace"
import { ensureRecordWorkspace } from "@/features/execution/lib/ensure-record-workspace"
import { getAgentRunExecutionScope } from "@/features/execution/lib/get-agent-run-execution-scope"
import { hydrateRecordWorkspace } from "@/features/execution/lib/hydrate-record-workspace"
import { pollSessionForMetrics } from "@/features/execution/lib/poll-session-for-metrics"
import { resolveRuntimeModel } from "@/features/execution/lib/resolve-runtime-model"
import { writeWorkspaceManifest } from "@/features/execution/lib/write-workspace-manifest"
import { listRecordFiles } from "@/features/files/lib/list-record-files"
import { getPipelineDefinition } from "@/features/pipelines/lib/get-pipeline-definition"
import { getActiveProjectSchemaVersionByProjectId } from "@/features/project-schema/lib/get-active-project-schema-version-by-project-id"
import { listRecordRelationsByProjectId } from "@/features/record-edges/lib/list-record-relations-by-project-id"
import { startTaskRecord } from "@/features/task-records/lib/start-task-record"
import { logger } from "@/lib/logger"
import { getOpencodeClient } from "@/lib/opencode/get-opencode-client"

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
        pipelineVersion: initialScope.task.pipelineVersion,
        recordName: initialScope.record.name,
        taskTitle: initialScope.task.title,
      },
      "Loaded agent run execution scope",
    )

    const runtimeModel = resolveRuntimeModel({
      taskModel: initialScope.task.model,
    })

    executionLogger.info({ runtimeModel }, "Resolved runtime model")

    executionLogger.info(
      { pipelineVersion: initialScope.task.pipelineVersion },
      "Loading pipeline definition",
    )

    const pipelineDefinition = await getPipelineDefinition({
      projectId: initialScope.project.id,
      version: initialScope.task.pipelineVersion,
    })

    executionLogger.info(
      {
        hasPipelineDefinition: pipelineDefinition !== null,
        parserAssetVersion: pipelineDefinition?.parserAssetVersion ?? null,
        pipelineVersion: pipelineDefinition?.version ?? null,
      },
      "Loaded pipeline definition",
    )

    executionLogger.info("Ensuring record workspace")

    const workspace = await ensureRecordWorkspace({
      projectId: initialScope.project.id,
      recordId: initialScope.record.id,
    })

    executionLogger.info(
      { workspaceDirectory: workspace.workspaceDirectory },
      "Ensured record workspace",
    )

    executionLogger.info("Hydrating record workspace")

    const hydratedWorkspace = await hydrateRecordWorkspace({
      projectId: initialScope.project.id,
      recordId: initialScope.record.id,
    })

    executionLogger.info(
      {
        hydratedArtifactCount: hydratedWorkspace.artifactCount,
        hydratedFileCount: hydratedWorkspace.fileCount,
      },
      "Hydrated record workspace",
    )

    executionLogger.info("Loading active project schema version")

    const schema = await getActiveProjectSchemaVersionByProjectId({
      projectId: initialScope.project.id,
    })

    executionLogger.info(
      { schemaVersion: schema.version },
      "Loaded active project schema version",
    )

    executionLogger.info("Loading record relations, files, and artifacts")

    const [relations, files, artifacts] = await Promise.all([
      listRecordRelationsByProjectId({
        projectId: initialScope.project.id,
        recordId: initialScope.record.id,
      }),
      listRecordFiles({
        projectId: initialScope.project.id,
        recordId: initialScope.record.id,
      }),
      listArtifacts({
        projectId: initialScope.project.id,
        recordId: initialScope.record.id,
      }),
    ])

    executionLogger.info(
      {
        artifactCount: artifacts.length,
        fileCount: files.length,
        relationCount: relations.summary.activeCount,
      },
      "Loaded record relations, files, and artifacts",
    )

    executionLogger.info(
      {
        hasPipelineDefinition: pipelineDefinition !== null,
      },
      "Ensuring pipeline assets in workspace when required",
    )

    const parserAssetBundle =
      pipelineDefinition === null
        ? null
        : await ensurePipelineAssetsInWorkspace({
            parserAssetVersion: pipelineDefinition.parserAssetVersion,
            projectId: initialScope.project.id,
            recordId: initialScope.record.id,
          })

    executionLogger.info(
      {
        parserAssetBundleDirectory: parserAssetBundle?.bundleDirectory ?? null,
      },
      "Prepared pipeline assets in workspace",
    )

    executionLogger.info("Writing workspace manifest")

    await writeWorkspaceManifest({
      artifactIds: artifacts.map((artifact) => artifact.id),
      fileIds: files.map((file) => file.id),
      parserAssetVersion: pipelineDefinition?.parserAssetVersion ?? null,
      pipelineVersion: pipelineDefinition?.version ?? null,
      projectId: initialScope.project.id,
      recordId: initialScope.record.id,
      taskId: initialScope.task.id,
    })

    executionLogger.info("Wrote workspace manifest")

    executionLogger.info("Creating OpenCode client")

    const client = await getOpencodeClient()

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
      model: modelID,
      provider: providerID,
      sessionReference: session.data.id,
      toolActivitySummary: {
        filesAvailable: files.length,
        artifactsAvailable: artifacts.length,
        hydratedArtifactCount: hydratedWorkspace.artifactCount,
        hydratedFileCount: hydratedWorkspace.fileCount,
        parserAssetVersion: pipelineDefinition?.parserAssetVersion ?? null,
        relationCount: relations.summary.activeCount,
      },
    })

    executionLogger.info(
      { sessionId: session.data.id },
      "Marked agent run booting",
    )

    const promptPayload = {
      artifacts,
      execution: {
        agentRunId: initialScope.agentRun.id,
        projectId: initialScope.project.id,
        recordId: initialScope.record.id,
        taskId: initialScope.task.id,
        taskRecordId: initialScope.taskRecord.id,
      },
      files,
      pipelineDefinition,
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
        parserAssetBundleDirectory: parserAssetBundle?.bundleDirectory ?? null,
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
        agent: "record-worker",
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

    void pollSessionForMetrics({
      sessionId: session.data.id,
      agentRunId: initialScope.agentRun.id,
    })

    return {
      agentRunId: initialScope.agentRun.id,
      artifacts,
      files,
      model: runtimeModel,
      pipelineDefinition,
      projectId: initialScope.project.id,
      recordId: initialScope.record.id,
      relations,
      schema,
      sessionId: session.data.id,
      taskId: initialScope.task.id,
      taskRecordId: initialScope.taskRecord.id,
      workspace,
    }
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
