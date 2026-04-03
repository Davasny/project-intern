"use client"

import { useMutation } from "@tanstack/react-query"
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
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { useTRPC } from "@/lib/trpc/client"

export const OpencodeSessionsPage = () => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const [copied, setCopied] = useState(false)

  const spawnMutation = useMutation(
    trpc.opencode.spawnSession.mutationOptions(),
  )

  const stopMutation = useMutation(trpc.opencode.stopSession.mutationOptions())

  const handleSpawn = () => {
    spawnMutation.mutate({
      organizationSlug,
      projectSlug,
    })
  }

  const handleStop = () => {
    if (!spawnMutation.data?.serverId) return
    stopMutation.mutate(
      { serverId: spawnMutation.data.serverId },
      {
        onSuccess: () => {
          spawnMutation.reset()
        },
      },
    )
  }

  const handleCopyCommand = async () => {
    if (!spawnMutation.data) return
    await navigator.clipboard.writeText(spawnMutation.data.cliCommand)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
            <Button
              variant="default"
              size="sm"
              onClick={handleSpawn}
              disabled={spawnMutation.isPending || !!spawnMutation.data}
              className="gap-2"
            >
              {spawnMutation.isPending ? (
                <RefreshCwIcon className="size-3.5 animate-spin" />
              ) : (
                <PlusIcon className="size-3.5" />
              )}
              {spawnMutation.isPending ? "Spawning..." : "Spawn Session"}
            </Button>
            {spawnMutation.data ? (
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
          {spawnMutation.data ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1 rounded font-mono text-foreground">
                  {spawnMutation.data.sessionId.slice(0, 12)}…
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
                {spawnMutation.data.cliCommand}
              </pre>
            </div>
          ) : null}
        </SectionCardContent>
      </SectionCard>
    </div>
  )
}
