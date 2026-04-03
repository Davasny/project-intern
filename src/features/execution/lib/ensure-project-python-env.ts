import { exec } from "node:child_process"
import { access, mkdir } from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"
import {
  getProjectRequirementsPath,
  getProjectVenvPath,
} from "@/lib/config/backend"

const execAsync = promisify(exec)

type EnsureProjectPythonEnvParams = {
  projectId: string
}

type EnsureProjectPythonEnvResult = {
  venvPath: string
  pythonPath: string
  pipPath: string
  requirementsPath: string
  isNew: boolean
  installCount: number
}

const VENV_BIN = process.platform === "win32" ? "Scripts" : "bin"

const fileExists = async (filePath: string) => {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

const execCommand = async (command: string, cwd?: string) => {
  const { stdout, stderr } = await execAsync(command, {
    cwd,
    timeout: 120_000,
  })
  return { stdout: stdout.trim(), stderr: stderr.trim() }
}

const runPipInstall = async ({
  venvPath,
  requirementsPath,
}: {
  venvPath: string
  requirementsPath: string
}) => {
  const pipPath = path.join(venvPath, VENV_BIN, "pip")
  const { stdout } = await execCommand(
    `${pipPath} install -r "${requirementsPath}"`,
    path.dirname(venvPath),
  )
  return stdout
}

const createVenv = async (projectDir: string) => {
  const { stdout, stderr } = await execCommand(
    `python -m venv "${path.join(projectDir, ".venv")}"`,
    projectDir,
  )
  return { stdout, stderr }
}

const getPipList = async (pipPath: string) => {
  const { stdout } = await execCommand(`"${pipPath}" list --format=json`)
  return JSON.parse(stdout || "[]") as Array<{ name: string; version: string }>
}

export const ensureProjectPythonEnv = async ({
  projectId,
}: EnsureProjectPythonEnvParams): Promise<EnsureProjectPythonEnvResult> => {
  const venvPath = getProjectVenvPath(projectId)
  const requirementsPath = getProjectRequirementsPath(projectId)
  const projectDir = path.dirname(venvPath)
  const pythonPath = path.join(venvPath, VENV_BIN, "python")
  const pipPath = path.join(venvPath, VENV_BIN, "pip")

  const projectDirExists = await fileExists(projectDir)
  if (!projectDirExists) {
    await mkdir(projectDir, { recursive: true })
  }

  const venvExists = await fileExists(pythonPath)
  let isNew = false

  if (!venvExists) {
    await createVenv(projectDir)
    isNew = true
  }

  const requirementsExist = await fileExists(requirementsPath)
  let installCount = 0

  if (requirementsExist) {
    await runPipInstall({ venvPath, requirementsPath })
    const packages = await getPipList(pipPath)
    installCount = packages.length
  }

  return {
    venvPath,
    pythonPath,
    pipPath,
    requirementsPath,
    isNew,
    installCount,
  }
}
