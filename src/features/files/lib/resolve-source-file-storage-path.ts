import { backendConfig } from "@/lib/config/backend"
import { resolvePathFromRoot } from "@/utils/resolve-path-from-root"

type ResolveSourceFileStoragePathParams = {
  storagePath: string
}

export const resolveSourceFileStoragePath = ({
  storagePath,
}: ResolveSourceFileStoragePathParams) =>
  resolvePathFromRoot({
    relativePath: storagePath,
    rootPath: backendConfig.CRM_STORAGE_ROOT,
  })
