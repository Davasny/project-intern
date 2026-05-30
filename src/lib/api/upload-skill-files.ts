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

type SkillUploadResponse = {
  uploaded: UploadResult[]
  errors: UploadError[]
  skillName: string
  skillDescription: string
}

type UploadSkillFilesParams = {
  organizationSlug: string
  projectSlug: string
  files: FileList | File[]
}

export const uploadSkillFiles = async ({
  organizationSlug,
  projectSlug,
  files,
}: UploadSkillFilesParams): Promise<SkillUploadResponse> => {
  const formData = new FormData()

  const fileArray = files instanceof FileList ? Array.from(files) : files

  for (const file of fileArray) {
    formData.append("files", file)
  }

  const url = `${frontendConfig.NEXT_PUBLIC_APP_URL}/api/upload/skill/${organizationSlug}/${projectSlug}`

  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Upload failed: ${response.status} ${errorText}`)
  }

  const result: SkillUploadResponse = await response.json()

  return result
}
