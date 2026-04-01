import { TRPCError } from "@trpc/server"
import { listArtifacts } from "@/features/artifacts/lib/list-artifacts"

type GetArtifactByIdParams = {
  artifactId: string
  projectId: string
  recordId: string
}

export const getArtifactById = async ({
  artifactId,
  projectId,
  recordId,
}: GetArtifactByIdParams) => {
  const artifacts = await listArtifacts({ projectId, recordId })
  const artifact =
    artifacts.find((currentArtifact) => currentArtifact.id === artifactId) ??
    null

  if (!artifact) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Artifact was not found.",
    })
  }

  return artifact
}
