import { backendConfig } from "@/lib/config/backend"
import { resolvePathFromRoot } from "@/utils/resolve-path-from-root"

type ResolveArtifactStoragePathParams = {
  storagePath: string
}

export const resolveArtifactStoragePath = ({
  storagePath,
}: ResolveArtifactStoragePathParams) =>
  resolvePathFromRoot({
    relativePath: storagePath,
    rootPath: backendConfig.CRM_STORAGE_ROOT,
  })
