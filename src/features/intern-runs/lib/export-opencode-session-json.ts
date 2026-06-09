import { spawn } from "node:child_process"
import { mkdtemp, open, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

type ExportOpencodeSessionJsonParams = {
  directory: string | null
  sessionReference: string
}

type ExportOpencodeSessionJsonResult = {
  cleanup: () => Promise<void>
  path: string
}

const maxErrorOutputBytes = 64 * 1024

const waitForChildProcess = ({
  child,
  getErrorOutput,
}: {
  child: ReturnType<typeof spawn>
  getErrorOutput: () => string
}) =>
  new Promise<void>((resolve, reject) => {
    child.on("error", reject)
    child.on("close", (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(
        new Error(
          getErrorOutput().trim() ||
            `OpenCode export exited with code ${String(code)}.`,
        ),
      )
    })
  })

export const exportOpencodeSessionJson = async ({
  directory,
  sessionReference,
}: ExportOpencodeSessionJsonParams): Promise<ExportOpencodeSessionJsonResult> => {
  const outputDirectory = await mkdtemp(
    path.join(os.tmpdir(), "project-intern-opencode-export-"),
  )
  const outputPath = path.join(outputDirectory, `${sessionReference}.json`)
  const output = await open(outputPath, "w")
  const child = spawn("opencode", ["export", sessionReference], {
    cwd: directory ?? process.cwd(),
    stdio: ["ignore", output.fd, "pipe"],
  })

  let errorOutput = ""

  const stderr = child.stderr

  if (stderr) {
    stderr.on("data", (chunk: Buffer) => {
      if (errorOutput.length < maxErrorOutputBytes) {
        errorOutput += chunk.toString("utf8")
      }
    })
  }

  try {
    await waitForChildProcess({
      child,
      getErrorOutput: () => errorOutput,
    })
  } catch (error) {
    await output.close()
    await rm(outputDirectory, { force: true, recursive: true })
    throw error
  }

  await output.close()

  return {
    cleanup: () => rm(outputDirectory, { force: true, recursive: true }),
    path: outputPath,
  }
}
