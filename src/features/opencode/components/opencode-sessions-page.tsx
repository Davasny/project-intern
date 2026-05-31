"use client"

import { useMutation, useQuery } from "@tanstack/react-query"
import {
  CheckIcon,
  CopyIcon,
  PlusIcon,
  RefreshCwIcon,
  StopCircleIcon,
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header/page-header"
import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"
import { SectionCardHeader } from "@/components/ui/section-card/section-card-header"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { useTRPC } from "@/lib/trpc/client"

export const OpencodeSessionsPage = () => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const [copied, setCopied] = useState(false)
  const [copiedDumpPath, setCopiedDumpPath] = useState(false)
  const [dumpSessions, setDumpSessions] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>()
  const [selectedRecordId, setSelectedRecordId] = useState<string | undefined>()

  const tasksQuery = useQuery(
    trpc.tasks.list.queryOptions({ organizationSlug, projectSlug }),
  )
  const recordsQuery = useQuery(
    trpc.records.list.queryOptions({ organizationSlug, projectSlug }),
  )

  const spawnMutation = useMutation(
    trpc.opencode.spawnSession.mutationOptions(),
  )
  const spawnDumpMutation = useMutation(
    trpc.opencode.spawnDumpSession.mutationOptions(),
  )

  const stopMutation = useMutation(
    trpc.opencode.stopSession.mutationOptions({
      onSuccess: () => {
        spawnMutation.reset()
        spawnDumpMutation.reset()
      },
    }),
  )

  const handleSpawn = async () => {
    try {
      if (dumpSessions) {
        await spawnDumpMutation.mutateAsync({
          organizationSlug,
          projectSlug,
          recordId: selectedRecordId,
          taskId: selectedTaskId,
        })
        return
      }

      await spawnMutation.mutateAsync({
        organizationSlug,
        projectSlug,
        taskId: selectedTaskId,
        recordId: selectedRecordId,
      })
    } catch {
    }
  }

  const handleStop = async () => {
    const data = spawnMutation.data ?? spawnDumpMutation.data
    if (!data) return

    const payload: {
      internRunId?: string
      serverId?: string
      workRecordId?: string
    } = {}

    if (
      "internRunId" in data &&
      typeof data.internRunId === "string"
    ) {
      payload.internRunId = data.internRunId
    }

    if (
      "workRecordId" in data &&
      typeof data.workRecordId === "string"
    ) {
      payload.workRecordId = data.workRecordId
    }

    if (
      "serverId" in data &&
      typeof data.serverId === "string" &&
      data.serverId.length > 0
    ) {
      payload.serverId = data.serverId
    }

    if (Object.keys(payload).length === 0) return

    try {
      await stopMutation.mutateAsync(payload)
    } catch {
      // Error state captured by stopMutation.isError
    }
  }

  const handleCopyCommand = async () => {
    const data = spawnMutation.data ?? spawnDumpMutation.data
    if (!data) return
    await navigator.clipboard.writeText(data.cliCommand)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyDumpPath = async () => {
    if (!spawnDumpMutation.data) return
    await navigator.clipboard.writeText(spawnDumpMutation.data.directory)
    setCopiedDumpPath(true)
    setTimeout(() => setCopiedDumpPath(false), 2000)
  }

  const isLoading = tasksQuery.isLoading || recordsQuery.isLoading
  const shouldWarnDumpingEverything =
    dumpSessions && !selectedTaskId && !selectedRecordId
  const activeSession = spawnMutation.data ?? spawnDumpMutation.data

  return (
    <div className="flex flex-col gap-6">
      <PageHeader>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            OpenCode Sessions
          </h1>
          <p className="text-sm text-muted-foreground">
            Spawn interactive sessions and attach to them from your terminal.
          </p>
        </div>
      </PageHeader>

      <SectionCard>
        <SectionCardHeader>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">
              Spawn a new session
            </span>
            <span className="text-xs text-muted-foreground">
              Starts a dedicated OpenCode server and creates a session. Use the
              generated command to attach from your terminal. Stop the server
              when done to free resources.
            </span>
          </div>
          <div className="flex flex-row gap-2">
            {activeSession ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleStop}
                disabled={stopMutation.isPending}
                className="gap-2"
              >
                {stopMutation.isPending ? (
                  <RefreshCwIcon className="size-3.5 animate-spin" />
                ) : (
                  <StopCircleIcon className="size-3.5" />
                )}
                {stopMutation.isPending ? "Stopping..." : "Stop Server"}
              </Button>
            ) : null}
          </div>
        </SectionCardHeader>

        <SectionCardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-row items-start gap-3 rounded-md border border-border bg-muted/30 p-3">
              <Switch
                aria-label="Dump sessions"
                checked={dumpSessions}
                onCheckedChange={setDumpSessions}
              />
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-foreground">
                  Dump sessions
                </span>
                <span className="text-xs text-muted-foreground">
                  Write bounded markdown transcripts and task/record context to
                  a project debug-sessions directory, then spawn the OpenCode
                  session inside that dump directory.
                </span>
              </div>
            </div>

            <div className="flex flex-row gap-4">
              <div className="flex flex-col gap-1.5 min-w-48">
                <label
                  htmlFor="task-select"
                  className="text-xs text-muted-foreground"
                >
                  Task (optional)
                </label>

                <Select
                  value={selectedTaskId}
                  onValueChange={setSelectedTaskId}
                >
                  <SelectTrigger id="task-select" size="sm">
                    <SelectValue placeholder="Select task" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Tasks</SelectLabel>
                      {tasksQuery.data?.map((task) => (
                        <SelectItem key={task.id} value={task.id}>
                          {task.title}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5 min-w-48">
                <label
                  htmlFor="record-select"
                  className="text-xs text-muted-foreground"
                >
                  Record (optional)
                </label>

                <Select
                  value={selectedRecordId}
                  onValueChange={setSelectedRecordId}
                >
                  <SelectTrigger id="record-select" size="sm">
                    <SelectValue placeholder="Select record..." />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Record</SelectLabel>

                      {recordsQuery.data?.map((record) => (
                        <SelectItem key={record.id} value={record.id}>
                          {record.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {shouldWarnDumpingEverything ? (
              <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                No task or record selected. Dump Sessions will export all task
                and record run histories for this project, capped by dump
                limits.
              </p>
            ) : null}

            <div className="flex flex-row items-center gap-2">
              <Button
                className="gap-2"
                disabled={
                  spawnMutation.isPending ||
                  spawnDumpMutation.isPending ||
                  !!activeSession ||
                  isLoading
                }
                onClick={handleSpawn}
                type="button"
                variant="default"
              >
                {spawnMutation.isPending || spawnDumpMutation.isPending ? (
                  <RefreshCwIcon className="size-4 animate-spin" />
                ) : (
                  <PlusIcon className="size-4" />
                )}
                {dumpSessions
                  ? spawnMutation.isPending
                    ? "Spawning..."
                    : spawnDumpMutation.isPending
                      ? "Dumping..."
                      : "Spawn + Dump"
                  : spawnMutation.isPending
                    ? "Spawning..."
                    : "Spawn Session"}
              </Button>
            </div>

            {spawnDumpMutation.data ? (
              <div className="flex flex-col gap-3 rounded-md border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-2">
                  <code className="rounded bg-muted px-2 py-1 font-mono text-xs text-foreground">
                    {spawnDumpMutation.data.runCount.toString()} runs dumped
                  </code>
                  <Button
                    className="gap-2"
                    onClick={handleCopyDumpPath}
                    size="sm"
                    variant="outline"
                  >
                    {copiedDumpPath ? (
                      <CheckIcon className="size-3.5" />
                    ) : (
                      <CopyIcon className="size-3.5" />
                    )}
                    {copiedDumpPath ? "Copied" : "Copy path"}
                  </Button>
                </div>
                <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs text-muted-foreground">
                  {spawnDumpMutation.data.directory}
                </pre>
                {spawnDumpMutation.data.truncatedRunCount > 0 ||
                spawnDumpMutation.data.failedRunCount > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {spawnDumpMutation.data.truncatedRunCount > 0
                      ? `${spawnDumpMutation.data.truncatedRunCount.toString()} runs skipped by limit. `
                      : ""}
                    {spawnDumpMutation.data.failedRunCount > 0
                      ? `${spawnDumpMutation.data.failedRunCount.toString()} runs had transcript load errors.`
                      : ""}
                  </p>
                ) : null}
              </div>
            ) : null}

            {activeSession ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono text-foreground">
                    {activeSession.sessionId.slice(0, 12)}…
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyCommand}
                    className="gap-2"
                  >
                    {copied ? (
                      <CheckIcon className="size-3.5" />
                    ) : (
                      <CopyIcon className="size-3.5" />
                    )}
                    {copied ? "Copied" : "Copy command"}
                  </Button>
                </div>
                <pre className="text-xs text-muted-foreground bg-muted p-3 rounded-md overflow-x-auto font-mono">
                  {activeSession.cliCommand}
                </pre>
              </div>
            ) : null}
          </div>
        </SectionCardContent>
      </SectionCard>
    </div>
  )
}
