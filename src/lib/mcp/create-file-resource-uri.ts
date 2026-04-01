type CreateFileResourceUriParams = {
  fileId: string
  projectId: string
  recordId: string
}

export const createFileResourceUri = ({
  fileId,
  projectId,
  recordId,
}: CreateFileResourceUriParams) =>
  `crm://projects/${projectId}/records/${recordId}/files/${fileId}`
