import { frontendConfig } from "@/lib/config/frontend"

type UploadResult = {
  name: string
  path: string
  size: number
}

type UploadError = {
  name: string
  message: string
}

type UploadResponse = {
  uploaded: UploadResult[]
  errors: UploadError[]
}

type UploadRecordFilesParams = {
  recordId: string
  files: FileList | File[]
  onProgress?: (progress: number) => void
}

export const uploadRecordFiles = async ({
  recordId,
  files,
}: UploadRecordFilesParams): Promise<UploadResponse> => {
  const formData = new FormData()

  const fileArray = files instanceof FileList ? Array.from(files) : files

  for (const file of fileArray) {
    formData.append("files", file)
  }

  const url = `${frontendConfig.NEXT_PUBLIC_APP_URL}/api/upload/record/${recordId}`

  // Browser automatically sends httpOnly session cookie for same-origin requests
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Upload failed: ${response.status} ${errorText}`)
  }

  const result: UploadResponse = await response.json()

  return result
}
