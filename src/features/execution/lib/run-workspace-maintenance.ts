import { mkdir } from "node:fs/promises"
import { backendConfig } from "@/lib/config/backend"

export const runWorkspaceMaintenance = async () => {
  await mkdir(backendConfig.CRM_WORKSPACE_ROOT, { recursive: true })
  await mkdir(backendConfig.CRM_STORAGE_ROOT, { recursive: true })

  return {
    storageRoot: backendConfig.CRM_STORAGE_ROOT,
    workspaceRoot: backendConfig.CRM_WORKSPACE_ROOT,
  }
}
