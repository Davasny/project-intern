import fs from "node:fs/promises"
import path from "node:path"
import type { createOpencodeClient } from "@opencode-ai/sdk"
import { toSessionMessage } from "@/features/intern-runs/lib/map-session-message"
import { getDebugSessionDumpDirectory } from "@/features/opencode/lib/get-debug-session-dump-directory"
import {
  listSessionDumpRuns,
  type SessionDumpRun,
} from "@/features/opencode/lib/list-session-dump-runs"
import {
  renderIndexMarkdown,
  renderRunMarkdown,
  renderWorkRecordContextMarkdown,
} from "@/features/opencode/lib/render-session-dump-markdown"
import type { SessionDumpScope } from "@/features/opencode/schemas/session-dump-scope"
import { logger } from "@/lib/logger"
import { ensureDirectory } from "@/utils/ensure-directory"

type OpencodeClient = ReturnType<typeof createOpencodeClient>

const maxRunsPerDump = 40

const sanitizePathSegment = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)

const buildTaskDirectoryName = (run: SessionDumpRun) =>
  `${String(run.taskSortOrder).padStart(3, "0")}-${sanitizePathSegment(run.taskTitle) || "task"}-${run.taskId}`

const buildRecordDirectoryName = (run: SessionDumpRun) =>
  `${sanitizePathSegment(run.recordName) || "record"}-${run.recordId}`

const formatRunFileName = ({
  attemptNumber,
  internRunId,
}: {
  attemptNumber: number
  internRunId: string
}) => `attempt-${String(attemptNumber).padStart(3, "0")}-${internRunId}.md`

export const dumpDebugSessions = async ({
  client,
  projectId,
  scope,
}: {
  client: OpencodeClient
  projectId: string
  scope: SessionDumpScope
}) => {
  const createdAt = new Date()
  const directory = getDebugSessionDumpDirectory({
    createdAt,
    projectId,
    scope,
  })
  await ensureDirectory(directory)

  const runs = await listSessionDumpRuns({ projectId, scope })
  const selectedRuns = runs.slice(0, maxRunsPerDump)
  const failedRunFiles: Array<string> = []
  const workRecordEntries = new Map<
    string,
    {
      contextPath: string
      directory: string
      recordName: string
      runPaths: Array<string>
      taskTitle: string
    }
  >()

  for (const run of selectedRuns) {
    const fileName = formatRunFileName({
      internRunId: run.internRunId,
      attemptNumber: run.attemptNumber,
    })
    const taskDirectoryName = buildTaskDirectoryName(run)
    const recordDirectoryName = buildRecordDirectoryName(run)
    const workRecordDirectory = path.join(
      directory,
      "tasks",
      taskDirectoryName,
      "records",
      recordDirectoryName,
    )
    const runsDirectory = path.join(workRecordDirectory, "runs")
    const relativeContextPath = path.join(
      "tasks",
      taskDirectoryName,
      "records",
      recordDirectoryName,
      "context.md",
    )
    const relativeRunPath = path.join(
      "tasks",
      taskDirectoryName,
      "records",
      recordDirectoryName,
      "runs",
      fileName,
    )

    await ensureDirectory(runsDirectory)

    if (!workRecordEntries.has(run.workRecordId)) {
      await fs.writeFile(
        path.join(workRecordDirectory, "context.md"),
        renderWorkRecordContextMarkdown({ run, scope }),
      )

      workRecordEntries.set(run.workRecordId, {
        contextPath: relativeContextPath,
        directory: workRecordDirectory,
        recordName: run.recordName,
        runPaths: [],
        taskTitle: run.taskTitle,
      })
    }

    let messages: Array<ReturnType<typeof toSessionMessage>> = []
    let errorMessage: string | null = null

    if (!run.sessionReference || !run.directory) {
      errorMessage = "Run does not have OpenCode session metadata."
    } else {
      try {
        const response = await client.session.messages({
          path: { id: run.sessionReference },
          query: { directory: run.directory },
        })

        messages = (response.data ?? []).map(toSessionMessage)
      } catch (error) {
        errorMessage =
          error instanceof Error
            ? error.message
            : "OpenCode session history could not be loaded."
        failedRunFiles.push(fileName)
        logger.warn(
          {
            internRunId: run.internRunId,
            error,
            sessionReference: run.sessionReference,
          },
          "Failed to dump OpenCode session history",
        )
      }
    }

    await fs.writeFile(
      path.join(runsDirectory, fileName),
      renderRunMarkdown({ errorMessage, messages, run }),
    )
    workRecordEntries.get(run.workRecordId)?.runPaths.push(relativeRunPath)
  }

  await fs.writeFile(
    path.join(directory, "index.md"),
    renderIndexMarkdown({
      createdAt,
      directory,
      failedRunCount: failedRunFiles.length,
      scope,
      workRecordEntries: Array.from(workRecordEntries.values()),
    }),
  )

  return {
    directory,
    failedRunCount: failedRunFiles.length,
    indexPath: path.join(directory, "index.md"),
    runCount: Array.from(workRecordEntries.values()).reduce(
      (total, entry) => total + entry.runPaths.length,
      0,
    ),
    truncatedRunCount: Math.max(runs.length - selectedRuns.length, 0),
  }
}
