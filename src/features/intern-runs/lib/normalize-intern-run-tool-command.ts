import { normalizeInternRunToolPath } from "@/features/intern-runs/lib/normalize-intern-run-tool-path"

const stripAbsoluteBinaryPath = (command: string) => {
  if (!command.startsWith("/")) {
    return command
  }

  const [binaryPath, ...commandParts] = command.split(" ")
  const binaryName = binaryPath.split("/").at(-1)

  if (!binaryName) {
    return command
  }

  return [binaryName, ...commandParts].join(" ")
}

export const normalizeInternRunToolCommand = ({
  command,
  workspaceDirectory,
}: {
  command: string
  workspaceDirectory: string
}) => {
  const normalizedCommand = command.replaceAll(
    `${workspaceDirectory.replace(/\/+$/, "")}/`,
    "./",
  )

  return stripAbsoluteBinaryPath(
    normalizeInternRunToolPath({
      path: normalizedCommand,
      workspaceDirectory,
    }),
  )
}
