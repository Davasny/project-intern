import { ensureProjectPythonEnv } from "@/features/execution/lib/ensure-project-python-env"
import { ensureProjectSkillsOnDisk } from "@/features/execution/lib/ensure-project-skills-on-disk"
import { ensureRecordWorkspace } from "@/features/execution/lib/ensure-record-workspace"
import { getAgentRunExecutionScope } from "@/features/execution/lib/get-agent-run-execution-scope"
import { linkProjectSkillsToWorkspace } from "@/features/execution/lib/link-project-skills-to-workspace"
import { prepareRecordWorkspaceData } from "@/features/execution/lib/prepare-record-workspace-data"
import { runOpencodeExecution } from "@/features/execution/lib/run-opencode-execution"
import { listRecordFiles } from "@/features/files/lib/list-record-files"
import { withOpencodeForOrg } from "@/features/opencode/lib/get-opencode-client"
import { getActiveProjectSchemaVersionByProjectId } from "@/features/project-schema/lib/get-active-project-schema-version-by-project-id"
import { listRecordRelationsByProjectId } from "@/features/record-edges/lib/list-record-relations-by-project-id"
import { resolveRuntimeModel } from "@/lib/llm/resolve-runtime-model"
import { resolveRuntimeTemperature } from "@/lib/llm/resolve-runtime-temperature"
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
    const runtimeTemperature = resolveRuntimeTemperature({
      projectDefaultTemperature: initialScope.project.defaultTemperature,
      taskTemperature: initialScope.task.temperature,
    })

    executionLogger.info(
      { runtimeModel, runtimeTemperature },
      "Resolved runtime settings",
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
        requirementsPath: pythonEnv.requirementsPath,
        skippedInstall: pythonEnv.skippedInstall,
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
      fn: async ({ client }) =>
        runOpencodeExecution({
          client,
          executionLogger,
          files,
          initialScope,
          preparedWorkspaceData,
          projectSkills,
          pythonEnv,
          relations,
          runtimeModel,
          runtimeTemperature,
          schema,
          workspace,
        }),
      organizationId: initialScope.project.organizationId,
      runtimeTemperature,
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
