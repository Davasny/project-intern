import fs from "node:fs/promises"
import {
  backendConfig,
  getProjectWorkspaceDirectory,
} from "@/lib/config/backend"
import { logger } from "@/lib/logger"
import { getOpencodeClient } from "@/lib/opencode/get-opencode-client"

type SpawnSessionParams = {
  projectId: string
  title: string
}

type SpawnSessionResult = {
  sessionId: string
  cliCommand: string
  directory: string
}

export const getServerUrl = () => {
  if (backendConfig.CRM_OPENCODE_BASE_URL) {
    return backendConfig.CRM_OPENCODE_BASE_URL
  }

  return `http://${backendConfig.CRM_OPENCODE_HOST}:${String(backendConfig.CRM_OPENCODE_PORT)}`
}

const buildAttachCommand = (
  serverUrl: string,
  sessionId: string,
  directory: string,
) => `opencode attach ${serverUrl} --session ${sessionId} --dir ${directory}`

export const spawnSession = async ({
  projectId,
  title,
}: SpawnSessionParams): Promise<SpawnSessionResult> => {
  const directory = getProjectWorkspaceDirectory(projectId)

  await fs.mkdir(directory, { recursive: true })

  const client = await getOpencodeClient()

  const session = await client.session.create({
    body: { title },
    query: { directory },
  })

  if (!session.data) {
    throw new Error("OpenCode session could not be created.")
  }

  const serverUrl = getServerUrl()
  const cliCommand = buildAttachCommand(serverUrl, session.data.id, directory)

  logger.info(
    {
      sessionId: session.data.id,
      projectId,
    },
    "Spawned OpenCode session",
  )

  return {
    sessionId: session.data.id,
    cliCommand,
    directory,
  }
}
