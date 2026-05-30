import { createWriteStream } from "node:fs"
import { mkdir } from "node:fs/promises"
import path from "node:path"
import type { Context, MiddlewareHandler } from "hono"
import { HTTPException } from "hono/http-exception"
import { ensureProjectAccess } from "@/features/projects/lib/ensure-project-access"
import { getProjectSkillsDirectory } from "@/lib/config/backend"
import { requireSession } from "@/lib/hono/middleware/session-guard"
import { resolvePathInsideDirectory } from "@/lib/storage/resolve-path-inside-directory"

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

const parseSkillFrontmatter = (
  content: string,
): { name?: string; description?: string } => {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) {
    return {}
  }

  const frontmatter = match[1]
  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m)
  const descriptionMatch = frontmatter.match(/^description:\s*(.+)$/m)

  return {
    name: nameMatch ? nameMatch[1].trim() : undefined,
    description: descriptionMatch ? descriptionMatch[1].trim() : undefined,
  }
}

const streamFileToDisk = async (
  file: File,
  destinationPath: string,
): Promise<{ size: number }> => {
  const directory = path.dirname(destinationPath)
  await mkdir(directory, { recursive: true })

  const writeStream = createWriteStream(destinationPath)
  const reader = file.stream().getReader()

  let totalBytes = 0

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) break

      const chunk = value as Uint8Array
      totalBytes += chunk.length

      await new Promise<void>((resolve, reject) => {
        writeStream.write(chunk, (err) => {
          if (err) reject(err)
          else resolve()
        })
      })
    }

    await new Promise<void>((resolve, reject) => {
      writeStream.end((err: Error | null) => {
        if (err) reject(err)
        else resolve()
      })
    })
  } finally {
    reader.releaseLock()
  }

  return { size: totalBytes }
}

export const uploadSkillFilesHandler: MiddlewareHandler = async (
  context: Context,
) => {
  const session = requireSession(context)

  const organizationSlug = context.req.param("organizationSlug")
  const projectSlug = context.req.param("projectSlug")

  if (!organizationSlug || !projectSlug) {
    throw new HTTPException(400, {
      message: "Organization and project slugs are required",
    })
  }

  const project = await ensureProjectAccess({
    organizationSlug,
    projectSlug,
    userId: session.user.id,
  })

  if (!project) {
    throw new HTTPException(403, {
      message: "You do not have access to this project",
    })
  }

  const formData = await context.req.formData()
  const files = formData.getAll("files")

  if (files.length === 0) {
    throw new HTTPException(400, { message: "No files provided" })
  }

  const uploaded: UploadResult[] = []
  const errors: UploadError[] = []

  const fileList: File[] = []
  for (const entry of files) {
    if (entry instanceof File) {
      fileList.push(entry)
    } else {
      errors.push({ name: String(entry), message: "Not a valid file" })
    }
  }

  if (fileList.length === 0) {
    throw new HTTPException(400, { message: "No valid files in upload" })
  }

  const firstFileRelativePath = (
    fileList[0] as File & { webkitRelativePath?: string }
  ).webkitRelativePath

  if (!firstFileRelativePath) {
    throw new HTTPException(400, {
      message:
        "No folder structure detected. Upload a folder, not individual files.",
    })
  }

  const folderName = firstFileRelativePath.split("/")[0]

  if (!folderName) {
    throw new HTTPException(400, {
      message: "Could not determine skill folder name from upload",
    })
  }

  const skillMdFile = fileList.find(
    (file) =>
      (file as File & { webkitRelativePath?: string }).webkitRelativePath ===
      `${folderName}/SKILL.md`,
  )

  if (!skillMdFile) {
    throw new HTTPException(400, {
      message: `No SKILL.md found in folder "${folderName}". Every skill folder must contain a SKILL.md file.`,
    })
  }

  const skillMdContent = await skillMdFile.text()
  const { name: skillName, description: skillDescription } =
    parseSkillFrontmatter(skillMdContent)

  if (!skillName || !skillDescription) {
    throw new HTTPException(400, {
      message:
        "SKILL.md is missing required frontmatter. It must contain both `name` and `description` fields in YAML frontmatter.",
    })
  }

  const skillsDirectory = getProjectSkillsDirectory(
    project.organizationId,
    project.id,
  )

  for (const file of fileList) {
    const relativePath = (file as File & { webkitRelativePath?: string })
      .webkitRelativePath

    if (!relativePath) {
      errors.push({
        name: file.name,
        message: "Missing folder structure for this file",
      })
      continue
    }

    const sanitizedPath = relativePath
      .replace(/^\/+/, "")
      .replace(/\.\.\//g, "")
      .replace(/\.\.$/g, "")

    if (!sanitizedPath) {
      errors.push({ name: file.name, message: "Invalid file path" })
      continue
    }

    const destinationPath = resolvePathInsideDirectory({
      baseDirectory: skillsDirectory,
      relativePath: sanitizedPath,
    })

    const { size } = await streamFileToDisk(file, destinationPath)

    uploaded.push({
      name: file.name,
      path: sanitizedPath,
      size,
    })
  }

  const response: SkillUploadResponse = {
    uploaded,
    errors,
    skillName,
    skillDescription,
  }

  return context.json(response)
}
