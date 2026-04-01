type CreateArtifactResourceUriParams = {
  artifactId: string
  projectId: string
  recordId: string
}

export const createArtifactResourceUri = ({
  artifactId,
  projectId,
  recordId,
}: CreateArtifactResourceUriParams) =>
  `crm://projects/${projectId}/records/${recordId}/artifacts/${artifactId}`
