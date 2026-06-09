import net from "node:net"
import { createOpencodeClient, createOpencodeServer } from "@opencode-ai/sdk"
import { eq, sql } from "drizzle-orm"
import { createOrgMcpApiKey } from "@/features/auth/lib/create-org-mcp-api-key"
import { opencodeServerTable } from "@/features/opencode/db"
import { buildOpencodeConfig } from "@/features/opencode/lib/build-opencode-config"
import { createOpencodeAuthHeader } from "@/features/opencode/lib/create-opencode-auth-header"
import { getEnabledProjectSkillNames } from "@/features/opencode/lib/get-enabled-project-skill-names"
import type { OpencodeSessionPurpose } from "@/features/opencode/lib/opencode-session-purpose"
import { backendConfig } from "@/lib/config/backend"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

type OpencodeServer = Awaited<ReturnType<typeof createOpencodeServer>>
type OpencodeClient = ReturnType<typeof createOpencodeClient>

type RunningInteractiveServer = {
  client: OpencodeClient
  server: OpencodeServer
  port: number
}

const opencodeAuthHeader = createOpencodeAuthHeader({
  password: backendConfig.CRM_OPENCODE_SERVER_PASSWORD,
  username: backendConfig.CRM_OPENCODE_SERVER_USERNAME,
})

const createAuthenticatedOpencodeClient = ({ baseUrl }: { baseUrl: string }) =>
  createOpencodeClient({
    baseUrl,
    headers: {
      Authorization: opencodeAuthHeader,
    },
  })

const configureOpencodeServerAuthEnv = () => {
  process.env.OPENCODE_SERVER_PASSWORD =
    backendConfig.CRM_OPENCODE_SERVER_PASSWORD
  process.env.OPENCODE_SERVER_USERNAME =
    backendConfig.CRM_OPENCODE_SERVER_USERNAME
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
  projectId,
  runtimeTemperature,
  sessionPurpose,
}: {
  organizationId: string
  projectId: string
  runtimeTemperature: number | null
  sessionPurpose: OpencodeSessionPurpose
}) => {
  const { key } = await createOrgMcpApiKey({ organizationId })
  const enabledSkillNames = await getEnabledProjectSkillNames({
    organizationId,
    projectId,
  })

  const { port, server } = await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext('project-intern-opencode-server-start'))`,
    )

    const nextPort = await findAvailablePort({
      host: backendConfig.CRM_OPENCODE_HOST,
      startPort: backendConfig.CRM_OPENCODE_PORT,
    })

    logger.info(
      {
        host: backendConfig.CRM_OPENCODE_HOST,
        enabledSkillCount: enabledSkillNames.length,
        mode: "embedded",
        organizationId,
        port: nextPort,
        projectId,
      },
      "Starting OpenCode server",
    )

    configureOpencodeServerAuthEnv()

    const nextServer = await createOpencodeServer({
      config: buildOpencodeConfig({
        enabledSkillNames,
        mcpToken: key,
        runtimeTemperature,
        sessionPurpose,
      }),
      hostname: backendConfig.CRM_OPENCODE_HOST,
      port: nextPort,
      timeout: backendConfig.CRM_OPENCODE_TIMEOUT_MS,
    })

    return {
      port: nextPort,
      server: nextServer,
    }
  })

  const serverUrl = server.url
  const client = createAuthenticatedOpencodeClient({ baseUrl: serverUrl })

  logger.info({ serverUrl, hasClient: !!client }, "OpenCode instance created")

  const healthUrl = new URL("/global/health", serverUrl)
  const healthResponse = await fetch(healthUrl, {
    headers: {
      Authorization: opencodeAuthHeader,
    },
  })
  const healthBody = await healthResponse.json()
  logger.info(
    { status: healthResponse.status, body: healthBody },
    "OpenCode health check",
  )

  logger.info({ organizationId, port }, "OpenCode server started")

  return {
    apiKey: key,
    client,
    port,
    server,
  }
}

const shutdownEmbeddedServer = async ({
  organizationId,
  port,
  server,
}: {
  organizationId: string
  port: number
  server: OpencodeServer
}) => {
  logger.info(
    { mode: "embedded", organizationId, port },
    "Shutting down OpenCode server",
  )

  server.close()
}

export const withOpencodeForOrg = async <T>({
  fn,
  organizationId,
  projectId,
  runtimeTemperature,
}: {
  fn: (params: { client: OpencodeClient; mcpToken: string }) => Promise<T>
  organizationId: string
  projectId: string
  runtimeTemperature: number | null
}): Promise<T> => {
  if (backendConfig.CRM_OPENCODE_BASE_URL) {
    if (runtimeTemperature !== null) {
      logger.warn(
        {
          baseUrl: backendConfig.CRM_OPENCODE_BASE_URL,
          mode: "external-configured",
          projectId,
          runtimeTemperature,
        },
        "Runtime temperature override is not enforced for external OpenCode servers",
      )
    }

    logger.info(
      {
        baseUrl: backendConfig.CRM_OPENCODE_BASE_URL,
        mode: "external-configured",
        projectId,
      },
      "Using configured OpenCode server; project skill permissions are not enforced by embedded config",
    )

    const client = createAuthenticatedOpencodeClient({
      baseUrl: backendConfig.CRM_OPENCODE_BASE_URL,
    })

    return fn({ client, mcpToken: "" })
  }

  const server = await startEmbeddedServer({
    organizationId,
    projectId,
    runtimeTemperature,
    sessionPurpose: "execution",
  })

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
      organizationId,
      port: server.port,
      server: server.server,
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
  projectId,
  runtimeTemperature,
  sessionPurpose,
}: {
  organizationId: string
  projectId: string
  runtimeTemperature: number | null
  sessionPurpose: OpencodeSessionPurpose
}) => {
  if (backendConfig.CRM_OPENCODE_BASE_URL) {
    const client = createAuthenticatedOpencodeClient({
      baseUrl: backendConfig.CRM_OPENCODE_BASE_URL,
    })

    return {
      apiKey: "",
      baseUrl: backendConfig.CRM_OPENCODE_BASE_URL,
      client,
      port: null,
    }
  }

  const server = await startEmbeddedServer({
    organizationId,
    projectId,
    runtimeTemperature,
    sessionPurpose,
  })

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
    port: server.port,
    server: server.server,
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
      organizationId: "",
      port: running.port,
      server: running.server,
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

  return createAuthenticatedOpencodeClient({
    baseUrl: backendConfig.CRM_OPENCODE_BASE_URL,
  })
}
