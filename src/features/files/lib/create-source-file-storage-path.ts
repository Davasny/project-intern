import path from "node:path"

type CreateSourceFileStoragePathParams = {
  fileId: string
  organizationId: string
  originalFileName: string
  projectId: string
}

export const createSourceFileStoragePath = ({
  fileId,
  organizationId,
  originalFileName,
  projectId,
}: CreateSourceFileStoragePathParams) =>
  path.join(
    "organizations",
    organizationId,
    "projects",
    projectId,
    "source-files",
    fileId,
    path.basename(originalFileName),
  )
