import path from "node:path"

type CreateArtifactStoragePathParams = {
  artifactId: string
  extension: string
  organizationId: string
  projectId: string
  stage: string
}

export const createArtifactStoragePath = ({
  artifactId,
  extension,
  organizationId,
  projectId,
  stage,
}: CreateArtifactStoragePathParams) =>
  path.join(
    "organizations",
    organizationId,
    "projects",
    projectId,
    "artifacts",
    artifactId,
    `${stage}${extension}`,
  )
