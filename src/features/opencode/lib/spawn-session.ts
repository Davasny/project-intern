import fs from "node:fs/promises"
import path from "node:path"
import { linkProjectSkillsToWorkspace } from "@/features/execution/lib/link-project-skills-to-workspace"
import {
  getExternalOpencodeClient,
  startInteractiveServer,
} from "@/features/opencode/lib/get-opencode-client"
import {
  backendConfig,
  getProjectSkillsDirectory,
  getProjectWorkspaceDirectory,
} from "@/lib/config/backend"
import { logger } from "@/lib/logger"

type SpawnSessionParams = {
  organizationId: string
  projectId: string
  title: string
}

type SpawnSessionResult = {
  baseUrl: string
  cliCommand: string
  directory: string
  port: number | null
  serverId: string | null
  sessionId: string
}

const getServerUrl = (port?: number) => {
  if (backendConfig.CRM_OPENCODE_BASE_URL) {
    return backendConfig.CRM_OPENCODE_BASE_URL
  }

  return `http://${backendConfig.CRM_OPENCODE_HOST}:${String(port ?? backendConfig.CRM_OPENCODE_PORT)}`
}

const buildAttachCommand = (
  serverUrl: string,
  sessionId: string,
  directory: string,
) => `opencode attach ${serverUrl} --session ${sessionId} --dir ${directory}`

export const spawnSession = async ({
  organizationId,
  projectId,
  title,
}: SpawnSessionParams): Promise<SpawnSessionResult> => {
  const directory = getProjectWorkspaceDirectory(projectId)
  const skillsDirectory = getProjectSkillsDirectory(organizationId, projectId)
  const opencodeSkillsDirectory = path.join(directory, ".opencode", "skills")

  await Promise.all([
    fs.mkdir(directory, { recursive: true }),
    fs.mkdir(opencodeSkillsDirectory, { recursive: true }),
  ])

  await linkProjectSkillsToWorkspace({
    opencodeSkillsDirectory,
    projectSkillsDirectory: skillsDirectory,
  })

  const started = await startInteractiveServer({ organizationId })

  const envAgentPath = path.join(directory, ".env.agent")
  await fs.writeFile(envAgentPath, `CRM_BEARER_TOKEN=${started.apiKey}\n`)
  logger.info({ envAgentPath }, "Wrote .env.agent")

  const session = await started.client.session.create({
    body: { title },
    query: { directory },
  })

  if (!session.data) {
    throw new Error("OpenCode session could not be created.")
  }

  const serverUrl = getServerUrl(started.port ?? undefined)
  const cliCommand = buildAttachCommand(serverUrl, session.data.id, directory)

  logger.info(
    {
      sessionId: session.data.id,
      projectId,
      serverId: started.serverId ?? null,
    },
    "Spawned OpenCode session",
  )

  return {
    baseUrl: started.baseUrl,
    cliCommand,
    directory,
    port: started.port,
    serverId: started.serverId ?? null,
    sessionId: session.data.id,
  }
}

export const listSessionsOnExternalServer = async () => {
  const client = getExternalOpencodeClient()

  if (!client) {
    return []
  }

  const sessionsResponse = await client.session.list()

  return (
    sessionsResponse.data?.map((session) => ({
      id: session.id,
      title: session.title ?? "Untitled session",
      createdAt: session.time.created,
      directory: session.directory,
      cliCommand: `opencode attach ${backendConfig.CRM_OPENCODE_BASE_URL} --session ${session.id} --dir ${session.directory}`,
    })) ?? []
  )
}
