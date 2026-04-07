import net from "node:net"
import { createOpencode, createOpencodeClient } from "@opencode-ai/sdk"
import { eq } from "drizzle-orm"
import { createOrgMcpApiKey } from "@/features/auth/lib/create-org-mcp-api-key"
import { opencodeServerTable } from "@/features/opencode/db"
import { buildOpencodeConfig } from "@/features/opencode/lib/build-opencode-config"
import { backendConfig } from "@/lib/config/backend"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type OpencodeInstance = Awaited<ReturnType<typeof createOpencode>>
type OpencodeClient = ReturnType<typeof createOpencodeClient>

type RunningInteractiveServer = {
  client: OpencodeClient
  instance: OpencodeInstance
  port: number
}

const globalForOpencode = globalThis as {
  projectInternInteractiveServers?: Map<string, RunningInteractiveServer>
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

const findAvailablePort = async ({
  host,
  startPort,
}: {
  host: string
  startPort: number
}): Promise<number> => {
  const maxAttempts = 100

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const port = startPort + attempt
    const available = await isPortAvailable({ host, port })

    if (available) {
      return port
    }
  }

  throw new Error(
    `Could not find an available port after ${String(maxAttempts)} attempts starting from ${String(startPort)}.`,
  )
}

const startEmbeddedServer = async ({
  organizationId,
}: {
  organizationId: string
}) => {
  const { key } = await createOrgMcpApiKey({ organizationId })

  const port = await findAvailablePort({
    host: backendConfig.CRM_OPENCODE_HOST,
    startPort: backendConfig.CRM_OPENCODE_PORT,
  })

  logger.info(
    {
      host: backendConfig.CRM_OPENCODE_HOST,
      mode: "embedded",
      organizationId,
      port,
    },
    "Starting OpenCode server",
  )

  const instance = await createOpencode({
    config: buildOpencodeConfig({ mcpToken: key }),
    hostname: backendConfig.CRM_OPENCODE_HOST,
    port,
    timeout: backendConfig.CRM_OPENCODE_TIMEOUT_MS,
  })

  const serverUrl = instance.server.url
  logger.info(
    { serverUrl, hasClient: !!instance.client },
    "OpenCode instance created",
  )

  const healthUrl = new URL("/global/health", serverUrl)
  const healthResponse = await fetch(healthUrl)
  const healthBody = await healthResponse.json()
  logger.info(
    { status: healthResponse.status, body: healthBody },
    "OpenCode health check",
  )

  const client = instance.client

  logger.info({ organizationId, port }, "OpenCode server started")

  return {
    apiKey: key,
    client,
    instance,
    port,
  }
}

const shutdownEmbeddedServer = async ({
  instance,
  organizationId,
  port,
}: {
  instance: OpencodeInstance
  organizationId: string
  port: number
}) => {
  logger.info(
    { mode: "embedded", organizationId, port },
    "Shutting down OpenCode server",
  )

  instance.server.close()
}

export const withOpencodeForOrg = async <T>({
  fn,
  organizationId,
}: {
  fn: (params: { client: OpencodeClient; mcpToken: string }) => Promise<T>
  organizationId: string
}): Promise<T> => {
  if (backendConfig.CRM_OPENCODE_BASE_URL) {
    logger.info(
      {
        baseUrl: backendConfig.CRM_OPENCODE_BASE_URL,
        mode: "external-configured",
      },
      "Using configured OpenCode server",
    )

    const client = createOpencodeClient({
      baseUrl: backendConfig.CRM_OPENCODE_BASE_URL,
    })

    return fn({ client, mcpToken: "" })
  }

  const server = await startEmbeddedServer({ organizationId })

  const dbRow = await db
    .insert(opencodeServerTable)
    .values({
      apiKey: server.apiKey,
      organizationId,
      port: server.port,
      status: "running",
      type: "execution",
    })
    .returning()

  const insertedRow = dbRow[0]

  try {
    return await fn({ client: server.client, mcpToken: server.apiKey })
  } finally {
    await shutdownEmbeddedServer({
      instance: server.instance,
      organizationId,
      port: server.port,
    })

    await db
      .delete(opencodeServerTable)
      .where(eq(opencodeServerTable.id, insertedRow.id))
  }
}

// ---------------------------------------------------------------------------
// Interactive server lifecycle: explicit start / stop with DB persistence
// ---------------------------------------------------------------------------

const getInteractiveServersMap = (): Map<string, RunningInteractiveServer> => {
  if (!globalForOpencode.projectInternInteractiveServers) {
    globalForOpencode.projectInternInteractiveServers = new Map()
  }

  return globalForOpencode.projectInternInteractiveServers
}

export const startInteractiveServer = async ({
  organizationId,
}: {
  organizationId: string
}) => {
  if (backendConfig.CRM_OPENCODE_BASE_URL) {
    const client = createOpencodeClient({
      baseUrl: backendConfig.CRM_OPENCODE_BASE_URL,
    })

    return {
      apiKey: "",
      baseUrl: backendConfig.CRM_OPENCODE_BASE_URL,
      client,
      port: null,
    }
  }

  const server = await startEmbeddedServer({ organizationId })

  const dbRow = await db
    .insert(opencodeServerTable)
    .values({
      apiKey: server.apiKey,
      organizationId,
      port: server.port,
      status: "running",
      type: "interactive",
    })
    .returning()

  const insertedRow = dbRow[0]

  const runningServers = getInteractiveServersMap()
  runningServers.set(insertedRow.id, {
    client: server.client,
    instance: server.instance,
    port: server.port,
  })

  return {
    apiKey: server.apiKey,
    baseUrl: `http://${backendConfig.CRM_OPENCODE_HOST}:${String(server.port)}`,
    client: server.client,
    port: server.port,
    serverId: insertedRow.id,
  }
}

export const stopInteractiveServer = async ({
  serverId,
}: {
  serverId: string
}) => {
  const runningServers = getInteractiveServersMap()
  const running = runningServers.get(serverId)

  if (running) {
    await shutdownEmbeddedServer({
      instance: running.instance,
      organizationId: "",
      port: running.port,
    })
    runningServers.delete(serverId)
  }

  await db
    .update(opencodeServerTable)
    .set({ status: "stopped" })
    .where(eq(opencodeServerTable.id, serverId))
}

// ---------------------------------------------------------------------------
// Startup sweep: mark stale interactive servers
// ---------------------------------------------------------------------------

export const sweepStaleInteractiveServers = async () => {
  if (backendConfig.CRM_OPENCODE_BASE_URL) {
    return
  }

  const stale = await db
    .update(opencodeServerTable)
    .set({ status: "stale" })
    .where(eq(opencodeServerTable.status, "running"))
    .returning()

  if (stale.length > 0) {
    logger.info(
      { staleCount: stale.length },
      "Marked stale interactive OpenCode servers on startup",
    )
  }
}

// ---------------------------------------------------------------------------
// External client factory (for listSessions when using external server)
// ---------------------------------------------------------------------------

export const getExternalOpencodeClient = (): OpencodeClient | null => {
  if (!backendConfig.CRM_OPENCODE_BASE_URL) {
    return null
  }

  return createOpencodeClient({
    baseUrl: backendConfig.CRM_OPENCODE_BASE_URL,
  })
}
