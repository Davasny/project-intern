import { createAgentRun } from "@/features/agent-runs/lib/create-agent-run"
import { markAgentRunBooting } from "@/features/agent-runs/lib/mark-agent-run-booting"
import { markAgentRunRunning } from "@/features/agent-runs/lib/mark-agent-run-running"
import { listArtifacts } from "@/features/artifacts/lib/list-artifacts"
import { buildTaskRecordSystemPrompt } from "@/features/execution/lib/build-task-record-system-prompt"
import { ensurePipelineAssetsInWorkspace } from "@/features/execution/lib/ensure-pipeline-assets-in-workspace"
import { ensureRecordWorkspace } from "@/features/execution/lib/ensure-record-workspace"
import { getAgentRunExecutionScope } from "@/features/execution/lib/get-agent-run-execution-scope"
import { hydrateRecordWorkspace } from "@/features/execution/lib/hydrate-record-workspace"
import { resolveRuntimeModel } from "@/features/execution/lib/resolve-runtime-model"
import { writeWorkspaceManifest } from "@/features/execution/lib/write-workspace-manifest"
import { listRecordFiles } from "@/features/files/lib/list-record-files"
import { getPipelineDefinition } from "@/features/pipelines/lib/get-pipeline-definition"
import { getActiveProjectSchemaVersionByProjectId } from "@/features/project-schema/lib/get-active-project-schema-version-by-project-id"
import { listRecordRelationsByProjectId } from "@/features/record-edges/lib/list-record-relations-by-project-id"
import { getOpencodeClient } from "@/lib/opencode/get-opencode-client"

type ExecutorServiceParams = {
  taskRecordId: string
}

export const executorService = async ({
  taskRecordId,
}: ExecutorServiceParams) => {
  const initialAgentRun = await createAgentRun({
    selectedAgent: "record-worker",
    selectedModel: null,
    taskRecordId,
  })

  const initialScope = await getAgentRunExecutionScope({
    agentRunId: initialAgentRun.id,
  })

  const runtimeModel = resolveRuntimeModel({
    taskModel: initialScope.task.model,
  })
  const pipelineDefinition = await getPipelineDefinition({
    projectId: initialScope.project.id,
    version: initialScope.task.pipelineVersion,
  })
  const workspace = await ensureRecordWorkspace({
    projectId: initialScope.project.id,
    recordId: initialScope.record.id,
  })
  const hydratedWorkspace = await hydrateRecordWorkspace({
    projectId: initialScope.project.id,
    recordId: initialScope.record.id,
  })
  const schema = await getActiveProjectSchemaVersionByProjectId({
    projectId: initialScope.project.id,
  })
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

  const parserAssetBundle =
    pipelineDefinition === null
      ? null
      : await ensurePipelineAssetsInWorkspace({
          parserAssetVersion: pipelineDefinition.parserAssetVersion,
          projectId: initialScope.project.id,
          recordId: initialScope.record.id,
        })

  await writeWorkspaceManifest({
    artifactIds: artifacts.map((artifact) => artifact.id),
    fileIds: files.map((file) => file.id),
    parserAssetVersion: pipelineDefinition?.parserAssetVersion ?? null,
    pipelineVersion: pipelineDefinition?.version ?? null,
    projectId: initialScope.project.id,
    recordId: initialScope.record.id,
    taskId: initialScope.task.id,
  })

  const client = await getOpencodeClient()
  const session = await client.session.create({
    body: {
      title: `${initialScope.task.title} · ${initialScope.record.name}`,
    },
    query: {
      directory: workspace.workspaceDirectory,
    },
  })

  if (!session.data) {
    throw new Error("OpenCode session could not be created.")
  }

  const [providerID, modelID] = runtimeModel.split("/")

  await markAgentRunBooting({
    agentRunId: initialAgentRun.id,
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

  await client.session.prompt({
    body: {
      agent: "record-worker",
      model: {
        modelID,
        providerID,
      },
      noReply: true,
      parts: [
        {
          text: JSON.stringify(
            {
              artifacts,
              files,
              pipelineDefinition,
              record: initialScope.record,
              relations,
              schema,
              task: initialScope.task,
            },
            null,
            2,
          ),
          type: "text",
        },
      ],
      system: buildTaskRecordSystemPrompt({
        projectDisplayName: initialScope.project.displayName,
        recordName: initialScope.record.name,
        taskDescriptionMarkdown: initialScope.task.descriptionMarkdown,
        taskTitle: initialScope.task.title,
      }),
    },
    path: {
      id: session.data.id,
    },
    query: {
      directory: workspace.workspaceDirectory,
    },
  })

  await markAgentRunRunning({
    agentRunId: initialAgentRun.id,
    latencyMs: null,
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

  return {
    agentRunId: initialAgentRun.id,
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
}
