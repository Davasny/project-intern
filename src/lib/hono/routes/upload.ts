import { createWriteStream } from "node:fs"
import { mkdir } from "node:fs/promises"
import path from "node:path"
import type { Context, MiddlewareHandler } from "hono"
import { HTTPException } from "hono/http-exception"
import { backendConfig } from "@/lib/config/backend"
import { requireSession } from "@/lib/hono/middleware/session-guard"
import { validateUploadAccess } from "@/lib/hono/utils/validate-upload-access"
import { resolvePathInsideDirectory } from "@/lib/storage/resolve-path-inside-directory"

const CHUNK_SIZE = 64 * 1024 // 64KB chunks

const getRecordDataDirectory = ({
  organizationId,
  projectId,
  recordId,
}: {
  organizationId: string
  projectId: string
  recordId: string
}) =>
  path.join(
    backendConfig.CRM_STORAGE_ROOT,
    "organizations",
    organizationId,
    "projects",
    projectId,
    "records",
    recordId,
    "data",
  )

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

      // Write chunk to stream
      await new Promise<void>((resolve, reject) => {
        writeStream.write(chunk, (err) => {
          if (err) reject(err)
          else resolve()
        })
      })
    }

    // Close the stream and wait for finish
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

export const uploadRecordFilesHandler: MiddlewareHandler = async (
  context: Context,
) => {
  const session = requireSession(context)
  const recordId = context.req.param("recordId")

  if (!recordId) {
    throw new HTTPException(400, { message: "Record ID is required" })
  }

  const { organizationId, projectId } = await validateUploadAccess({
    context: session,
    recordId,
  })

  const recordDataDirectory = getRecordDataDirectory({
    organizationId,
    projectId,
    recordId,
  })

  const formData = await context.req.formData()
  const files = formData.getAll("files")

  if (files.length === 0) {
    throw new HTTPException(400, { message: "No files provided" })
  }

  const uploaded: UploadResult[] = []
  const errors: UploadError[] = []

  for (const fileEntry of files) {
    if (!(fileEntry instanceof File)) {
      errors.push({ name: String(fileEntry), message: "Not a valid file" })
      continue
    }

    const file = fileEntry

    // Determine the relative path within the record data directory
    // webkitRelativePath contains the path from the selected directory
    // e.g., "src/components/Button.tsx" when user selects a directory
    const relativePath = (file as File & { webkitRelativePath?: string })
      .webkitRelativePath

    let destinationRelativePath: string

    if (relativePath) {
      // Directory upload - use the webkitRelativePath as-is
      destinationRelativePath = relativePath
    } else {
      // Single file upload - just use the file name
      destinationRelativePath = file.name
    }

    // Sanitize the path to prevent path traversal
    // Remove any leading slashes or parent directory references
    const sanitizedPath = destinationRelativePath
      .replace(/^\/+/, "") // Remove leading slashes
      .replace(/\.\.\//g, "") // Remove parent directory references
      .replace(/\.\.$/g, "") // Remove trailing parent directory refs

    if (!sanitizedPath || sanitizedPath === "") {
      errors.push({ name: file.name, message: "Invalid file path" })
      continue
    }

    try {
      const destinationPath = resolvePathInsideDirectory({
        baseDirectory: recordDataDirectory,
        relativePath: sanitizedPath,
      })

      const { size } = await streamFileToDisk(file, destinationPath)

      uploaded.push({
        name: file.name,
        path: sanitizedPath,
        size,
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error occurred"
      errors.push({ name: file.name, message })
    }
  }

  const response: UploadResponse = { uploaded, errors }

  return context.json(response)
}
