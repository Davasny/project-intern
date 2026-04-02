import net from "node:net"
import { createOpencode, createOpencodeClient } from "@opencode-ai/sdk"
import { backendConfig } from "@/lib/config/backend"
import { logger } from "@/lib/logger"
import { buildOpencodeConfig } from "@/lib/opencode/build-opencode-config"

type OpencodeInstance = Awaited<ReturnType<typeof createOpencode>>
type OpencodeClient = ReturnType<typeof createOpencodeClient>

const globalForOpencode = globalThis as {
  projectInternOpencodeClientPromise?: Promise<OpencodeClient>
  projectInternOpencodePromise?: Promise<OpencodeInstance>
}

const isPortAvailable = async ({
  host,
  port,
}: {
  host: string
  port: number
}) =>
  new Promise<boolean>((resolve) => {
    const server = net.createServer()

    server.once("error", () => {
      resolve(false)
    })

    server.once("listening", () => {
      server.close(() => {
        resolve(true)
      })
    })

    server.listen(port, host)
  })

const getManagedOpencodeBaseUrl = () =>
  new URL(
    `http://${backendConfig.CRM_OPENCODE_HOST}:${String(backendConfig.CRM_OPENCODE_PORT)}`,
  ).toString()

const assertOpencodeServerReachable = async ({
  baseUrl,
}: {
  baseUrl: string
}) => {
  const healthUrl = new URL("/global/health", baseUrl)
  const response = await fetch(healthUrl)

  if (!response.ok) {
    throw new Error(
      `OpenCode server health check failed with status ${String(response.status)}.`,
    )
  }
}

export const getOpencodeClient = async () => {
  if (backendConfig.CRM_OPENCODE_BASE_URL) {
    logger.info(
      {
        baseUrl: backendConfig.CRM_OPENCODE_BASE_URL,
        mode: "external-configured",
      },
      "Using configured OpenCode server",
    )

    return createOpencodeClient({
      baseUrl: backendConfig.CRM_OPENCODE_BASE_URL,
    })
  }

  const clientPromise =
    globalForOpencode.projectInternOpencodeClientPromise ??
    (async () => {
      const managedBaseUrl = getManagedOpencodeBaseUrl()
      const portIsAvailable = await isPortAvailable({
        host: backendConfig.CRM_OPENCODE_HOST,
        port: backendConfig.CRM_OPENCODE_PORT,
      })

      if (portIsAvailable) {
        logger.info(
          {
            host: backendConfig.CRM_OPENCODE_HOST,
            mode: "embedded",
            port: backendConfig.CRM_OPENCODE_PORT,
          },
          "Starting managed OpenCode server",
        )

        const opencodePromise =
          globalForOpencode.projectInternOpencodePromise ??
          createOpencode({
            config: buildOpencodeConfig(),
            hostname: backendConfig.CRM_OPENCODE_HOST,
            port: backendConfig.CRM_OPENCODE_PORT,
            timeout: backendConfig.CRM_OPENCODE_TIMEOUT_MS,
          })

        globalForOpencode.projectInternOpencodePromise = opencodePromise

        const opencode = await globalForOpencode.projectInternOpencodePromise
        return opencode.client
      }

      logger.info(
        {
          baseUrl: managedBaseUrl,
          host: backendConfig.CRM_OPENCODE_HOST,
          mode: "external-discovered",
          port: backendConfig.CRM_OPENCODE_PORT,
        },
        "OpenCode port already in use, connecting to existing server",
      )

      await assertOpencodeServerReachable({
        baseUrl: managedBaseUrl,
      })

      return createOpencodeClient({
        baseUrl: managedBaseUrl,
      })
    })()

  globalForOpencode.projectInternOpencodeClientPromise = clientPromise

  try {
    return await globalForOpencode.projectInternOpencodeClientPromise
  } catch (error) {
    globalForOpencode.projectInternOpencodeClientPromise = undefined
    globalForOpencode.projectInternOpencodePromise = undefined
    throw error
  }
}
