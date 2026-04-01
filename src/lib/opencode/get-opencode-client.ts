import { createOpencode, createOpencodeClient } from "@opencode-ai/sdk"
import { backendConfig } from "@/lib/config/backend"
import { buildOpencodeConfig } from "@/lib/opencode/build-opencode-config"

type OpencodeInstance = Awaited<ReturnType<typeof createOpencode>>

const globalForOpencode = globalThis as {
  projectInternOpencodePromise?: Promise<OpencodeInstance>
}

export const getOpencodeClient = async () => {
  if (backendConfig.CRM_OPENCODE_BASE_URL) {
    return createOpencodeClient({
      baseUrl: backendConfig.CRM_OPENCODE_BASE_URL,
    })
  }

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
